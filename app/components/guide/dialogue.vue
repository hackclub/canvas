<template>
  <div
    role="dialog"
    aria-live="polite"
    class="relative flex w-full max-w-200 items-stretch border-4 border-black bg-white shadow-[8px_8px_0_black]"
    @click="reveal"
  >
    <!-- pixel orpheus sits on top of the box, legs hanging over the edge -->
    <div
      aria-hidden="true"
      class="absolute left-6"
      :style="{
        width: `${GUIDE_SPRITE.width * GUIDE_SPRITE.scale}px`,
        height: `${GUIDE_SPRITE.height * GUIDE_SPRITE.scale}px`,
        // the box's border is one sprite pixel, so the legs start on top of it
        bottom: `calc(100% - ${(GUIDE_SPRITE.overhang - 1) * GUIDE_SPRITE.scale}px)`,
        backgroundImage: `url(${GUIDE_SPRITE.src})`,
        backgroundSize: '200% 100%',
        backgroundPosition: mouthOpen ? '100% 0' : '0 0',
        imageRendering: 'pixelated',
      }"
    />
    <div
      class="absolute -top-4 bg-black px-3 py-0.5 text-sm font-bold text-white"
      :style="{ left: `${GUIDE_SPRITE.width * GUIDE_SPRITE.scale + 40}px` }"
    >
      {{ speaker }}
    </div>
    <button
      type="button"
      :aria-label="muted ? 'unmute dialogue sounds' : 'mute dialogue sounds'"
      class="absolute top-2 right-2 flex cursor-pointer opacity-40 hover:opacity-100"
      @click.stop="toggleMuted"
    >
      <Icon :name="muted ? 'lucide:volume-x' : 'lucide:volume-2'" :size="18" />
    </button>
    <div class="flex min-h-28 flex-1 flex-col gap-2 p-4">
      <!-- leaves room for the mute button -->
      <p class="flex-1 pr-6 text-lg">
        <!-- the rest is there but invisible, so the box doesn't grow as it types -->
        <span
          v-for="(part, i) in parts"
          :key="i"
          :class="{ 'font-bold': part.bold, italic: part.italic }"
          >{{ part.shown }}<span class="invisible">{{ part.hidden }}</span></span
        >
      </p>
      <div class="flex min-h-8 items-center justify-end gap-2">
        <slot v-if="done" />
        <UiButtonSmall
          v-if="done && hasMore"
          icon="lucide:chevron-right"
          @click.stop="emit('next')"
        >
          next
        </UiButtonSmall>
        <Icon
          v-else-if="!done"
          name="lucide:chevrons-right"
          class="opacity-40"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { GUIDE_SPRITE, GUIDE_VOICE } from "~/utils/guide";

const props = defineProps({
  speaker: { type: String, required: true },
  text: { type: String, required: true },
  // Swapped in for "<name>" in the text, in bold
  vars: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  // There's another line after this one, so show a next button
  hasMore: { type: Boolean, default: false },
});
const emit = defineEmits<{ next: [] }>();

const { reduceMotion } = useReduceMotion();
const { muted, toggleMuted, speak } = useGuideVoice();

// The text split up into runs of the same style: **bold**, *italic*, and variables, which
// are filled in and always bold
const segments = computed(() => {
  const out: { text: string; bold: boolean; italic: boolean }[] = [];
  let bold = false;
  let italic = false;
  for (const token of props.text.split(/(\*\*|\*|<[a-z ]+>)/)) {
    if (!token) continue;
    if (token === "**") bold = !bold;
    else if (token === "*") italic = !italic;
    else {
      const name = token.match(/^<([a-z ]+)>$/)?.[1];
      if (name !== undefined && name in props.vars) {
        out.push({ text: props.vars[name]!, bold: true, italic });
      } else {
        out.push({ text: token, bold, italic });
      }
    }
  }
  return out;
});
const full = computed(() => segments.value.map((s) => s.text).join(""));

// The text types itself out, clicking the box fills in the rest
const count = ref(0);
const done = computed(() => count.value >= full.value.length);
const parts = computed(() => {
  let start = 0;
  return segments.value.map(({ text, bold, italic }) => {
    const shownLength = Math.max(0, Math.min(text.length, count.value - start));
    start += text.length;
    return {
      bold,
      italic,
      shown: text.slice(0, shownLength),
      hidden: text.slice(shownLength),
    };
  });
});

let timer: ReturnType<typeof setInterval> | undefined;

const mouthOpen = ref(false);

function reveal() {
  count.value = full.value.length;
  mouthOpen.value = false;
}

function type() {
  clearInterval(timer);
  count.value = 0;
  if (reduceMotion.value) return reveal();
  timer = setInterval(() => {
    count.value++;
    const char = full.value[count.value - 1] ?? "";
    if ((count.value - 1) % GUIDE_VOICE.every === 0) speak(char);
    // The mouth flaps as they talk, and stays shut on spaces and punctuation
    if ((count.value - 1) % GUIDE_SPRITE.mouthEvery === 0) {
      mouthOpen.value = /[a-z]/i.test(char) && !mouthOpen.value;
    }
    if (done.value) {
      clearInterval(timer);
      mouthOpen.value = false;
    }
  }, 25);
}

// Clicking anywhere on the screen: finish typing first, then go on
function advance() {
  if (done.value) emit("next");
  else reveal();
}
defineExpose({ advance });

// Starts again if the line changes, or a variable loads in after it started
watch(full, type);
onMounted(type);
onBeforeUnmount(() => clearInterval(timer));
</script>
