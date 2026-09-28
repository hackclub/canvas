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
            :disabled="uploadingBanner"
            @click="bannerInput?.click()"
          >
            <Icon name="lucide:image-plus" :size="28" />
            {{ uploadingBanner ? "uploading..." : "upload a banner" }}
          </button>
          <div v-else class="absolute bottom-3 right-3 flex gap-2">
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
            type="button"
            class="cursor-pointer opacity-70 hover:opacity-100 hover:underline"
            @click="openDelete"
          >
            delete project
          </button>
        </div>

        <p v-if="bannerError" class="mt-2 text-red-400">{{ bannerError }}</p>

        <form class="mt-4 space-y-5" @submit.prevent="save">
          <input
            v-model="form.name"
            maxlength="100"
            required
            aria-label="Project name"
            class="w-full bg-transparent font-bold text-3xl outline-none border-b-2 border-white/40 focus:border-white"
          />

          <div>
            <p class="font-bold text-2xl">{{ formatHours(totalSeconds) }}</p>
            <p class="opacity-70">Total hours</p>
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

          <p v-if="error" class="text-red-400">{{ error }}</p>

          <div class="flex flex-wrap gap-2">
            <UiButtonSmall
              type="submit"
              class="border-3 border-white disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!dirty || saving"
            >
              {{ saving ? "saving..." : dirty ? "save" : "saved" }}
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
