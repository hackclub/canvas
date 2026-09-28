<template>
  <div class="relative h-full w-full overflow-hidden bg-neutral-200">
    <div
      ref="viewportEl"
      class="absolute inset-0 touch-none select-none"
      :class="cursorClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="hover = null"
      @wheel.prevent="onWheel"
      @contextmenu.prevent
    >
      <canvas ref="screenEl" class="absolute inset-0 block size-full" />
    </div>

    <div
      v-if="!loaded"
      class="absolute inset-0 flex items-center justify-center font-bold text-lg"
    >
      loading the canvas…
    </div>

    <div
      v-if="hover"
      class="pointer-events-none absolute top-3 left-3 bg-black px-2 py-1 text-sm font-bold text-white tabular-nums"
    >
      ({{ hover.x }}, {{ hover.y }})
    </div>

    <div
      class="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      <p
        v-if="outOfPixels"
        class="bg-black px-3 py-1 text-sm font-bold text-white"
      >
        you're out of pixels!
        <NuxtLink to="/app/projects" class="text-white">
          build projects to get more
        </NuxtLink>
      </p>
      <p
        v-else-if="error"
        class="bg-black px-3 py-1 text-sm font-bold text-white"
      >
        {{ error }}
      </p>
      <div class="flex gap-2 border-4 border-black bg-white p-2">
        <button
          v-for="(color, i) in CANVAS_COLORS"
          :key="color"
          type="button"
          :title="`${color} (${i + 1})`"
          :aria-label="`color ${color}`"
          :aria-pressed="selected === i"
          class="size-9 cursor-pointer border-3 border-black transition-transform"
          :class="selected === i ? '-translate-y-1.5 shadow-[0_4px_0_black]' : ''"
          :style="{ backgroundColor: color }"
          @click="selected = selected === i ? null : i"
        />
      </div>
      <p class="bg-white/80 px-2 text-xs opacity-70">
        {{
          selected === null
            ? "pick a color to draw · drag to move · scroll to zoom"
            : "click or drag to draw · right-click drag or hold space to move · esc to stop"
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";

const MAX_SCALE = 64;
// How long drawn pixels wait before being sent, so a drag goes out as one request
const SEND_DELAY = 150;

const { pixels, pending, setPixels } = usePixels();

const viewportEl = ref<HTMLDivElement>();
const screenEl = ref<HTMLCanvasElement>();
const loaded = ref(false);
const error = ref("");
const selected = ref<number | null>(null);
const hover = ref<{ x: number; y: number } | null>(null);
const outOfPixels = ref(false);
const panning = ref(false);
const spaceHeld = ref(false);

// The board is drawn at 1 pixel per pixel onto an offscreen canvas, which gets scaled
// onto the visible one along with the hover preview. Drawing both with the same
// transform is what keeps the preview lined up with the board's pixels.
const board = import.meta.client ? document.createElement("canvas") : undefined;
let ctx: CanvasRenderingContext2D;
let screenCtx: CanvasRenderingContext2D;

// --- board state ---
// What the server has (RGB bytes, 3 per pixel), and this user's drawn pixels on top of it
// that are waiting to be sent or waiting on a response. Keys are y * width + x.
let confirmed = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 3).fill(0xff);
const queued = new Map<number, number>();
const inflight = new Map<number, number>();

function confirmedColor(i: number) {
  return (
    (confirmed[i * 3]! << 16) | (confirmed[i * 3 + 1]! << 8) | confirmed[i * 3 + 2]!
  );
}

function setConfirmed(i: number, color: number) {
  confirmed[i * 3] = color >> 16;
  confirmed[i * 3 + 1] = (color >> 8) & 0xff;
  confirmed[i * 3 + 2] = color & 0xff;
}

// The color this user sees, ignoring anything still in `queued`
function colorUnderQueue(i: number) {
  return inflight.get(i) ?? confirmedColor(i);
}

function shownColor(i: number) {
  return queued.get(i) ?? colorUnderQueue(i);
}

function drawPixel(i: number, color: number) {
  ctx.fillStyle = rgbToHex(color);
  ctx.fillRect(i % CANVAS_WIDTH, Math.floor(i / CANVAS_WIDTH), 1, 1);
  scheduleRender();
}

function redrawAll() {
  const image = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
  for (let i = 0, j = 0; i < confirmed.length; i += 3, j += 4) {
    image.data[j] = confirmed[i]!;
    image.data[j + 1] = confirmed[i + 1]!;
    image.data[j + 2] = confirmed[i + 2]!;
    image.data[j + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  for (const [i, color] of inflight) drawPixel(i, color);
  for (const [i, color] of queued) drawPixel(i, color);
  scheduleRender();
}

// Updates from other people (and our own, echoed back) as [x, y, color, ...]
function applyUpdates(updates: number[]) {
  for (let k = 0; k < updates.length; k += 3) {
    const i = updates[k + 1]! * CANVAS_WIDTH + updates[k]!;
    setConfirmed(i, updates[k + 2]!);
    if (!queued.has(i) && !inflight.has(i)) drawPixel(i, updates[k + 2]!);
  }
}

// --- syncing with the server ---
let events: EventSource | undefined;
// Updates that arrive while the full board is downloading, applied once it's in
let buffered: number[][] | null = null;

async function resync() {
  buffered = [];
  try {
    const res = await fetch("/api/canvas");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    confirmed = new Uint8Array(await res.arrayBuffer());
    for (const updates of buffered) applyUpdates(updates);
    redrawAll();
    loaded.value = true;
    error.value = "";
  } catch {
    error.value = "couldn't load the canvas, retrying…";
    setTimeout(resync, 3000);
  } finally {
    buffered = null;
  }
}

function connect() {
  events = new EventSource("/api/canvas/stream");
  // Listen first, then download, so nothing drawn in between gets missed. This also runs
  // after EventSource reconnects by itself, since updates could've been missed while it was down.
  events.onopen = resync;
  events.onmessage = (e) => {
    const updates = JSON.parse(e.data) as number[];
    if (buffered) buffered.push(updates);
    else applyUpdates(updates);
  };
}

// --- drawing ---
let sendTimer: ReturnType<typeof setTimeout> | undefined;

function updatePending() {
  pending.value = queued.size + inflight.size;
}

function paint(x: number, y: number) {
  if (selected.value === null) return;
  if (x < 0 || y < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) return;
  const i = y * CANVAS_WIDTH + x;
  const color = hexToRgb(CANVAS_COLORS[selected.value]!);
  if (shownColor(i) === color) return;

  if (color === colorUnderQueue(i)) {
    // Drawing back over your own unsent pixel is free
    queued.delete(i);
  } else if (!queued.has(i)) {
    if (pixels.value <= 0) {
      outOfPixels.value = true;
      return;
    }
    queued.set(i, color);
  } else {
    queued.set(i, color);
  }
  drawPixel(i, color);
  updatePending();
  sendTimer ??= setTimeout(send, SEND_DELAY);
}

// Only one request at a time, so balances from responses always come back in order
async function send() {
  clearTimeout(sendTimer);
  sendTimer = undefined;
  if (inflight.size || !queued.size) return;

  for (const [i, color] of queued) {
    if (inflight.size >= CANVAS_MAX_BATCH) break;
    inflight.set(i, color);
    queued.delete(i);
  }

  let rejected: Set<number>;
  try {
    const res = await $fetch("/api/canvas", {
      method: "POST",
      body: {
        pixels: [...inflight].map(([i, color]) => [
          i % CANVAS_WIDTH,
          Math.floor(i / CANVAS_WIDTH),
          color,
        ]),
      },
    });
    rejected = new Set(res.rejected.map(([x, y]) => y! * CANVAS_WIDTH + x!));
    setPixels(res.pixels);
    if (rejected.size) outOfPixels.value = true;
    error.value = "";
  } catch (e) {
    rejected = new Set(inflight.keys());
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "couldn't draw those pixels, try again!";
  }

  for (const [i, color] of inflight) {
    if (!rejected.has(i)) setConfirmed(i, color);
  }
  inflight.clear();
  // Put back whatever the server didn't take
  for (const i of rejected) {
    if (!queued.has(i)) drawPixel(i, confirmedColor(i));
  }
  updatePending();
  if (queued.size) send();
}

// Every pixel on the line between two points, so fast drags don't leave gaps
function paintLine(x0: number, y0: number, x1: number, y1: number) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    paint(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// Balance went up (e.g. from a project), so let them keep going
watch(pixels, (value) => {
  if (value > 0) outOfPixels.value = false;
});

// --- rendering ---
let renderFrame: number | undefined;

// Batches everything that changed in a frame into one render
function scheduleRender() {
  renderFrame ??= requestAnimationFrame(render);
}

function render() {
  renderFrame = undefined;
  const el = screenEl.value;
  if (!el || !board) return;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(el.clientWidth * dpr);
  const height = Math.round(el.clientHeight * dpr);
  if (el.width !== width || el.height !== height) {
    el.width = width;
    el.height = height;
  }

  const c = screenCtx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, width, height);
  c.imageSmoothingEnabled = false;
  c.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y);
  c.drawImage(board, 0, 0);

  if (hover.value && selected.value !== null && loaded.value) {
    const { x, y } = hover.value;
    c.fillStyle = CANVAS_COLORS[selected.value]!;
    c.fillRect(x, y, 1, 1);
    // 1 screen pixel wide, just outside the pixel
    const line = 1 / view.scale;
    c.lineWidth = line;
    c.strokeStyle = "black";
    c.strokeRect(x - line / 2, y - line / 2, 1 + line, 1 + line);
  }
}

watch([hover, selected, loaded], scheduleRender);

// --- panning and zooming ---
const view = { x: 0, y: 0, scale: 1 };
let fitted = false;

function applyView() {
  scheduleRender();
}

function viewportSize() {
  const el = viewportEl.value!;
  return { width: el.clientWidth, height: el.clientHeight };
}

function minScale() {
  const { width, height } = viewportSize();
  return Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT) / 2;
}

function fitView() {
  const { width, height } = viewportSize();
  view.scale = Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT) * 0.9;
  view.x = (width - CANVAS_WIDTH * view.scale) / 2;
  view.y = (height - CANVAS_HEIGHT * view.scale) / 2;
  applyView();
}

// Zooms by `factor`, keeping the point (px, py) in the viewport where it is
function zoomAt(px: number, py: number, factor: number) {
  const scale = Math.min(MAX_SCALE, Math.max(minScale(), view.scale * factor));
  const k = scale / view.scale;
  view.x = px - (px - view.x) * k;
  view.y = py - (py - view.y) * k;
  view.scale = scale;
  applyView();
}

const cursorClass = computed(() => {
  if (panning.value) return "cursor-grabbing";
  if (spaceHeld.value || selected.value === null) return "cursor-grab";
  return "cursor-crosshair";
});

// --- input ---
type Point = { x: number; y: number };

// Where a pointer is, relative to the viewport
function localPoint(e: PointerEvent | WheelEvent): Point {
  const rect = viewportEl.value!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function boardPoint(p: Point): Point {
  return {
    x: Math.floor((p.x - view.x) / view.scale),
    y: Math.floor((p.y - view.y) / view.scale),
  };
}

function onBoard(p: Point) {
  return p.x >= 0 && p.y >= 0 && p.x < CANVAS_WIDTH && p.y < CANVAS_HEIGHT;
}

// "tap" is a touch that hasn't moved yet: lifting it draws, moving it pans
let mode: "none" | "draw" | "pan" | "tap" | "pinch" = "none";
const pointers = new Map<number, Point>();
let lastPoint: Point = { x: 0, y: 0 };
let lastPixel: Point = { x: 0, y: 0 };
let tapStart: Point = { x: 0, y: 0 };
let lastPinch = { x: 0, y: 0, distance: 1 };

function pinchInfo() {
  const [a, b] = [...pointers.values()] as [Point, Point];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}

function onPointerDown(e: PointerEvent) {
  if (!loaded.value) return;
  const p = localPoint(e);
  viewportEl.value!.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, p);

  if (e.pointerType === "touch") {
    if (pointers.size === 1) {
      mode = "tap";
      tapStart = lastPoint = p;
    } else if (pointers.size === 2) {
      mode = "pinch";
      lastPinch = pinchInfo();
    }
    return;
  }

  if (pointers.size > 1) return;
  if (e.button === 0 && selected.value !== null && !spaceHeld.value) {
    mode = "draw";
    lastPixel = boardPoint(p);
    paint(lastPixel.x, lastPixel.y);
  } else {
    mode = "pan";
    panning.value = true;
    lastPoint = p;
  }
}

function onPointerMove(e: PointerEvent) {
  const p = localPoint(e);
  if (e.pointerType !== "touch") {
    const pixel = boardPoint(p);
    hover.value = onBoard(pixel) ? pixel : null;
  }
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, p);

  if (mode === "tap" && Math.hypot(p.x - tapStart.x, p.y - tapStart.y) > 8) {
    mode = "pan";
    panning.value = true;
  }

  if (mode === "draw") {
    const pixel = boardPoint(p);
    if (pixel.x !== lastPixel.x || pixel.y !== lastPixel.y) {
      paintLine(lastPixel.x, lastPixel.y, pixel.x, pixel.y);
      lastPixel = pixel;
    }
  } else if (mode === "pan") {
    view.x += p.x - lastPoint.x;
    view.y += p.y - lastPoint.y;
    lastPoint = p;
    applyView();
  } else if (mode === "pinch" && pointers.size >= 2) {
    const pinch = pinchInfo();
    view.x += pinch.x - lastPinch.x;
    view.y += pinch.y - lastPinch.y;
    zoomAt(pinch.x, pinch.y, pinch.distance / lastPinch.distance);
    lastPinch = pinch;
  }
}

function onPointerUp(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  if (mode === "tap" && e.type === "pointerup") {
    const pixel = boardPoint(localPoint(e));
    paint(pixel.x, pixel.y);
  }
  pointers.delete(e.pointerId);

  if (mode === "pinch" && pointers.size === 1) {
    // Carry on panning with the finger that's still down
    mode = "pan";
    panning.value = true;
    lastPoint = [...pointers.values()][0]!;
  } else if (!pointers.size) {
    mode = "none";
    panning.value = false;
  }
}

function onWheel(e: WheelEvent) {
  if (!loaded.value) return;
  const p = localPoint(e);
  // Trackpad pinches come through as ctrl+wheel with small deltas
  const speed = e.ctrlKey ? 0.01 : e.deltaMode === 1 ? 0.05 : 0.002;
  zoomAt(p.x, p.y, Math.exp(-e.deltaY * speed));
}

function isTyping(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  return (
    !!target &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function onKeyDown(e: KeyboardEvent) {
  if (isTyping(e)) return;
  if (e.code === "Space") {
    e.preventDefault();
    spaceHeld.value = true;
  } else if (e.key === "Escape") {
    selected.value = null;
  } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= CANVAS_COLORS.length) {
    selected.value = Number(e.key) - 1;
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (e.code === "Space") spaceHeld.value = false;
}

// --- lifecycle ---
let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  board!.width = CANVAS_WIDTH;
  board!.height = CANVAS_HEIGHT;
  ctx = board!.getContext("2d", { alpha: false })!;
  screenCtx = screenEl.value!.getContext("2d")!;
  redrawAll();
  resizeObserver = new ResizeObserver(() => {
    // Fit once the viewport has a size, after that leave the view where the user put it
    if (!fitted && viewportEl.value!.clientWidth) {
      fitted = true;
      fitView();
    }
    // The visible canvas matches the viewport's size, so it has to be redrawn at the new one
    scheduleRender();
  });
  resizeObserver.observe(viewportEl.value!);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  connect();
});

function onBlur() {
  spaceHeld.value = false;
}

onBeforeUnmount(() => {
  events?.close();
  resizeObserver?.disconnect();
  if (renderFrame !== undefined) cancelAnimationFrame(renderFrame);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("blur", onBlur);
  // Don't lose anything drawn right before leaving the page
  if (queued.size) send();
});
</script>
