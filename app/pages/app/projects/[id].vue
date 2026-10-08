<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3">
      <div
        v-if="project"
        :class="
          bannerUrl ? 'border-4 border-b-0 border-black' : 'bg-black p-4 pb-0'
        "
      >
        <div
          class="relative overflow-hidden text-white"
          :class="
            bannerUrl ? 'h-51' : 'h-48 border-2 border-dashed border-white/40'
          "
        >
          <img
            v-if="bannerUrl"
            :src="bannerUrl"
            alt=""
            class="size-full object-cover"
          />
          <button
            v-if="!bannerUrl"
            type="button"
            class="size-full flex flex-col items-center justify-center gap-1 cursor-pointer opacity-70 hover:opacity-100 disabled:cursor-wait"
            :class="{ 'hover:opacity-70 cursor-not-allowed!': locked }"
            :disabled="uploadingBanner || locked"
            @click="bannerInput?.click()"
          >
            <Icon name="lucide:image-plus" :size="28" />
            {{
              locked
                ? "no banner"
                : uploadingBanner
                  ? "uploading..."
                  : "upload a banner"
            }}
          </button>
          <div v-else-if="!locked" class="absolute bottom-3 right-3 flex gap-2">
            <UiButtonSmall
              :disabled="uploadingBanner"
              @click="bannerInput?.click()"
            >
              {{ uploadingBanner ? "uploading..." : "change" }}
            </UiButtonSmall>
            <UiButtonSmall :disabled="uploadingBanner" @click="removeBanner">
              remove
            </UiButtonSmall>
          </div>
          <input
            ref="bannerInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            class="hidden"
            @change="uploadBanner"
          />
        </div>
      </div>
      <UiCard v-if="project">
        <div class="flex items-center justify-between">
          <NuxtLink
            to="/app/projects"
            class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Icon name="lucide:arrow-left" /> all projects
          </NuxtLink>
          <button
            v-if="!locked"
            type="button"
            class="cursor-pointer opacity-70 hover:opacity-100 hover:underline"
            @click="openDelete"
          >
            delete project
          </button>
        </div>

        <p v-if="bannerError" class="mt-2 text-red-400">{{ bannerError }}</p>

        <div
          v-if="latestShip"
          class="mt-4 border-2 px-4 py-3"
          :class="
            latestShip.status === 'rejected' ? 'border-red-400' : 'border-white'
          "
        >
          <p class="flex items-center gap-2 font-bold">
            <Icon :name="shipStatus[latestShip.status].icon" />
            {{ shipStatus[latestShip.status].title }}
          </p>
          <p class="mt-1 text-sm opacity-70">
            {{ shipStatus[latestShip.status].description }}
          </p>
          <p
            v-if="latestShip.pixelsAwarded !== null"
            class="mt-1 text-sm font-bold"
          >
            You got {{ latestShip.pixelsAwarded.toLocaleString() }} pixels and
            {{ latestShip.bonusPointsAwarded?.toLocaleString() }} bonus points
            for this ship!
          </p>
          <p
            v-if="latestShip.feedback"
            class="mt-2 whitespace-pre-wrap border-l-2 border-white/40 pl-3"
          >
            {{ latestShip.feedback }}
          </p>
        </div>

        <form class="mt-4 space-y-5" @submit.prevent="save">
          <fieldset :disabled="locked" class="space-y-5 disabled:opacity-70">
            <input
              v-model="form.name"
              maxlength="100"
              required
              aria-label="Project name"
              class="w-full bg-transparent font-bold text-3xl outline-none border-b-2 border-white/40 focus:border-white"
            />

            <div class="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p class="font-bold text-2xl">{{ formatHours(totalSeconds) }}</p>
                <p class="opacity-70">Total hours</p>
              </div>
              <div>
                <p class="font-bold text-2xl">~{{ estimate.pixels }}</p>
                <p class="opacity-70">Estimated pixels</p>
              </div>
              <div>
                <p class="font-bold text-2xl">~{{ estimate.bonusPoints }}</p>
                <p class="opacity-70">Estimated bonus points</p>
              </div>
            </div>

            <label class="block">
              <span class="font-semibold">Description</span>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="What are you building?"
                :class="inputClass"
              />
            </label>

            <div>
              <p class="font-semibold">Hackatime projects</p>
              <p class="text-sm opacity-70">
                Time from these Hackatime projects counts towards this project.
              </p>
              <div
                v-if="hackatime?.linked"
                :class="[inputClass, 'flex flex-wrap gap-2']"
              >
                <span
                  v-for="name in form.hackatimeProjects"
                  :key="name"
                  class="flex items-center gap-1 bg-white text-black text-sm font-semibold ps-3 pe-1 py-1 rounded-full"
                >
                  {{ name }}
                  <span class="opacity-60 font-normal">
                    {{ formatHours(secondsFor(name)) }}h
                  </span>
                  <button
                    type="button"
                    class="cursor-pointer flex"
                    :aria-label="`Unlink ${name}`"
                    @click="unlinkHackatime(name)"
                  >
                    <Icon name="lucide:x" :size="16" />
                  </button>
                </span>
                <select
                  v-if="linkable.length"
                  class="bg-transparent text-sm outline-none cursor-pointer"
                  aria-label="Link a Hackatime project"
                  @change="linkHackatime"
                >
                  <option value="" selected>+ link a project</option>
                  <option
                    v-for="p in linkable"
                    :key="p.name"
                    :value="p.name"
                    class="text-black"
                  >
                    {{ p.name }} ({{ formatHours(p.totalSeconds) }}h)
                  </option>
                </select>
                <span
                  v-else-if="!form.hackatimeProjects.length"
                  class="text-sm opacity-70"
                >
                  No Hackatime projects to link yet. Start coding!
                </span>
              </div>
              <p v-else :class="[inputClass, 'text-sm']">
                You haven't linked Hackatime yet.
                <NuxtLink to="/app/setup/hackatime">Link it here</NuxtLink>
                to track time on this project.
              </p>
            </div>

            <label class="block">
              <span class="font-semibold">AI usage declaration</span>
              <textarea
                v-model="form.aiUsage"
                rows="3"
                placeholder='How did you use AI? Write "None" if you didn&apos;t.'
                :class="inputClass"
              />
            </label>

            <label class="flex items-start gap-3 cursor-pointer">
              <input
                v-model="form.preexisting"
                type="checkbox"
                class="mt-1 size-5 accent-white"
              />
              <span>
                This project was started <b>before Canvas</b>, or was
                <b>previously shipped</b> to a Hack Club event.
              </span>
            </label>

            <label class="block">
              <span class="font-semibold">Demo URL</span>
              <input
                v-model="form.demoUrl"
                type="url"
                placeholder="https://example.com"
                :class="inputClass"
              />
            </label>

            <label class="block">
              <span class="font-semibold">GitHub URL</span>
              <input
                v-model="form.repoUrl"
                type="url"
                placeholder="https://github.com/user/repo"
                :class="inputClass"
              />
            </label>
          </fieldset>

          <p v-if="error" class="text-red-400">{{ error }}</p>

          <div v-if="!locked" class="flex flex-wrap gap-2">
            <UiButtonSmall
              type="submit"
              class="border-3 border-white disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!dirty || saving"
            >
              {{ saving ? "saving..." : dirty ? "save" : "saved" }}
            </UiButtonSmall>
            <UiButtonSmall
              icon="lucide:rocket"
              class="border-3 border-white"
              @click="openShip"
            >
              {{
                latestShip?.status === "approved" ? "ship again" : "ship it!"
              }}
            </UiButtonSmall>
          </div>
        </form>
      </UiCard>
    </div>
  </div>

  <UiModal v-model="confirmingDelete" title="delete project?">
    <p>
      <b>{{ project?.name }}</b> will be deleted forever (a long time!). This
      can't be undone!
    </p>
    <p v-if="deleteError" class="text-red-600">{{ deleteError }}</p>
    <div class="flex gap-2">
      <UiButtonSmall
        icon="lucide:trash-2"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="deleting"
        @click="deleteProject"
      >
        {{ deleting ? "deleting..." : "delete" }}
      </UiButtonSmall>
      <UiButtonSmall @click="confirmingDelete = false">cancel</UiButtonSmall>
    </div>
  </UiModal>

  <UiModal v-model="confirmingShip" title="ship it?" :width="520">
    <p>
      Shipping sends <b>{{ project?.name }}</b> to be reviewed. Reviewers need
      to actually <b>try your project</b>, so before you ship:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Your <b>demo URL has to work</b>. Anyone should be able to open it and
        use your project without installing or setting anything up. A video or
        screenshots aren't a demo!
      </li>
      <li>
        Your project has to be <b>in a working state</b>: it runs, and its main
        features work. Broken projects will be rejected.
      </li>
    </ul>
    <p>You <b>can't edit your project</b> while it's being reviewed.</p>

    <div v-if="shipTodo.length" class="border-3 border-black p-3">
      <p class="font-bold">You still need to:</p>
      <ul class="list-disc pl-5">
        <li v-for="todo in shipTodo" :key="todo">{{ todo }}</li>
      </ul>
    </div>
    <template v-else>
      <label class="flex items-start gap-3 cursor-pointer">
        <input
          v-model="shipChecks.demo"
          type="checkbox"
          class="mt-1 size-5 shrink-0 accent-black"
        />
        <span>
          I opened my demo URL (<NuxtLink
            :to="project?.demoUrl ?? ''"
            external
            target="_blank"
            >{{ project?.demoUrl }}</NuxtLink
          >) and it works.
        </span>
      </label>
      <label class="flex items-start gap-3 cursor-pointer">
        <input
          v-model="shipChecks.working"
          type="checkbox"
          class="mt-1 size-5 shrink-0 accent-black"
        />
        <span>My project is in a working state and ready to be reviewed.</span>
      </label>
    </template>

    <p v-if="shipError" class="text-red-600">{{ shipError }}</p>
    <div class="flex gap-2">
      <UiButtonSmall
        icon="lucide:rocket"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canShip || shipping"
        @click="ship"
      >
        {{ shipping ? "shipping..." : "ship" }}
      </UiButtonSmall>
      <UiButtonSmall @click="confirmingShip = false">cancel</UiButtonSmall>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const inputClass =
  "mt-1 block w-full bg-transparent border-2 border-white/40 focus:border-white outline-none px-3 py-2";

const route = useRoute();
const { user } = useUserSession();

const id = route.params.id as string;
const { data: project, error: fetchError } = await useFetch(
  `/api/projects/${id}`,
);
if (fetchError.value) {
  throw createError({
    statusCode: fetchError.value.statusCode ?? 500,
    statusMessage: fetchError.value.statusMessage,
    fatal: true,
  });
}
const { data: ships } = await useFetch(`/api/projects/${id}/ships`, {
  default: () => [],
});
const latestShip = computed(() => ships.value[0]);
// Projects can't be changed while they're being reviewed
const locked = computed(() => latestShip.value?.status === "pending");

// What shipping now would pay, for the time since the last paid ship. A reviewer can
// change it, e.g. by overriding the hours or marking it as cooking.
const estimate = computed(() => {
  const paidSeconds = Math.max(
    0,
    ...ships.value
      .filter((s) => s.pixelsAwarded !== null)
      .map((s) => s.hackatimeSeconds ?? 0),
  );
  const before = projectEarnings(paidSeconds);
  const now = projectEarnings(totalSeconds.value);
  return {
    pixels: Math.max(0, now.pixels - before.pixels),
    bonusPoints: Math.max(0, now.bonusPoints - before.bonusPoints),
  };
});

const shipStatus = {
  pending: {
    icon: "lucide:hourglass",
    title: "in review",
    description:
      "Your project is waiting to be reviewed. You can't edit it until the review is done.",
  },
  approved: {
    icon: "lucide:party-popper",
    title: "shipped!",
    description:
      "Your project was approved. Keep building and ship it again when you've added more!",
  },
  rejected: {
    icon: "lucide:circle-x",
    title: "ship rejected",
    description:
      "Your project wasn't approved this time. Fix what the reviewer said below, then ship it again.",
  },
};

// Hackatime can be slow or down, so don't block the page on it
const { data: hackatime } = useFetch("/api/hackatime/projects", {
  lazy: true,
});

type ProjectData = NonNullable<typeof project.value>;

function toForm(p: ProjectData) {
  return {
    name: p.name,
    description: p.description,
    hackatimeProjects: [...p.hackatimeProjects],
    aiUsage: p.aiUsage,
    preexisting: p.preexisting,
    demoUrl: p.demoUrl ?? "",
    repoUrl: p.repoUrl ?? "",
  };
}

const form = reactive(toForm(project.value!));
const dirty = computed(
  () => JSON.stringify(form) !== JSON.stringify(toForm(project.value!)),
);

function reset() {
  Object.assign(form, toForm(project.value!));
  error.value = "";
}

// Hackatime projects that aren't linked here or to another project
const linkable = computed(
  () =>
    hackatime.value?.projects.filter(
      (p) =>
        !form.hackatimeProjects.includes(p.name) &&
        (!p.linkedTo || p.linkedTo.id === project.value?.id),
    ) ?? [],
);

function secondsFor(name: string) {
  return (
    hackatime.value?.projects.find((p) => p.name === name)?.totalSeconds ?? 0
  );
}

const totalSeconds = computed(() =>
  form.hackatimeProjects.reduce((sum, name) => sum + secondsFor(name), 0),
);

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

function linkHackatime(event: Event) {
  const select = event.target as HTMLSelectElement;
  if (select.value) form.hackatimeProjects.push(select.value);
  select.value = "";
}

function unlinkHackatime(name: string) {
  form.hackatimeProjects = form.hackatimeProjects.filter((n) => n !== name);
}

const saving = ref(false);
const error = ref("");

function errorMessage(e: unknown) {
  return (
    (e as { data?: { message?: string } }).data?.message ??
    "Something went wrong, try again!"
  );
}

async function save() {
  saving.value = true;
  error.value = "";
  try {
    const updated = await $fetch(`/api/projects/${id}`, {
      method: "PATCH",
      body: form,
    });
    project.value = updated as ProjectData;
    reset();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

// Banners upload straight away, separately from the save button
const MAX_BANNER_BYTES = 10 * 1024 * 1024;
const bannerInput = ref<HTMLInputElement>();
const uploadingBanner = ref(false);
const bannerError = ref("");
const bannerUrl = computed(() =>
  project.value?.bannerKey ? `/images/${project.value.bannerKey}` : null,
);

async function uploadBanner() {
  const file = bannerInput.value?.files?.[0];
  if (!file) return;
  bannerInput.value!.value = "";
  bannerError.value = "";
  if (file.size > MAX_BANNER_BYTES) {
    bannerError.value = "Images can be at most 10 MB";
    return;
  }

  const body = new FormData();
  body.append("banner", file);
  uploadingBanner.value = true;
  try {
    project.value = await $fetch<ProjectData>(`/api/projects/${id}/banner`, {
      method: "PUT",
      body,
    });
  } catch (e) {
    bannerError.value = errorMessage(e);
  } finally {
    uploadingBanner.value = false;
  }
}

async function removeBanner() {
  bannerError.value = "";
  uploadingBanner.value = true;
  try {
    project.value = await $fetch<ProjectData>(`/api/projects/${id}/banner`, {
      method: "DELETE",
    });
  } catch (e) {
    bannerError.value = errorMessage(e);
  } finally {
    uploadingBanner.value = false;
  }
}

const confirmingShip = ref(false);
const shipping = ref(false);
const shipError = ref("");
const shipChecks = reactive({ demo: false, working: false });

// Checked against what's saved, since that's what gets reviewed
// Anyone not eligible yet is checked with Hack Club Auth again, in case that changed since
// they signed in
const { data: eligibility } = await useFetch("/api/me/eligibility");
onMounted(async () => {
  if (eligibility.value?.eligible === false) {
    eligibility.value = await $fetch("/api/me/eligibility", {
      query: { refresh: "1" },
    });
  }
});
const shipTodo = computed(() => [
  ...(eligibility.value?.eligible === false ? ["Waiting on eligibility"] : []),
  ...(dirty.value ? ["Save your changes"] : []),
  ...shipBlockers(project.value!),
]);
const canShip = computed(
  () => !shipTodo.value.length && shipChecks.demo && shipChecks.working,
);

function openShip() {
  shipError.value = "";
  shipChecks.demo = false;
  shipChecks.working = false;
  confirmingShip.value = true;
}

async function ship() {
  shipping.value = true;
  shipError.value = "";
  try {
    const created = await $fetch(`/api/projects/${id}/ships`, {
      method: "POST",
    });
    ships.value = [created, ...ships.value];
    confirmingShip.value = false;
  } catch (e) {
    shipError.value = errorMessage(e);
  } finally {
    shipping.value = false;
  }
}

const confirmingDelete = ref(false);
const deleting = ref(false);
const deleteError = ref("");

function openDelete() {
  deleteError.value = "";
  confirmingDelete.value = true;
}

async function deleteProject() {
  deleting.value = true;
  deleteError.value = "";
  try {
    await $fetch(`/api/projects/${id}`, { method: "DELETE" });
    await navigateTo("/app/projects");
  } catch (e) {
    deleteError.value = errorMessage(e);
  } finally {
    deleting.value = false;
  }
}
</script>
