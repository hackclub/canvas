<template>
  <div
    v-if="user?.isAdmin"
    tabindex="0"
    aria-label="admin bar"
    @mousedown.prevent
    class="group fixed bottom-6 right-0 z-50 flex items-center rounded-l-full bg-black py-2 pl-3 text-white outline-none"
  >
    <Icon name="lucide:shield" :size="22" class="shrink-0" />
    <div
      class="max-w-0 overflow-hidden transition-[max-width] delay-1000 duration-350 ease-out group-hover:max-w-(--content-w) group-hover:delay-0 group-focus-within:max-w-(--content-w) group-focus-within:delay-0"
      :style="{ '--content-w': `${contentWidth}px` }"
    >
      <div
        ref="contentEl"
        class="flex w-max items-center gap-2 whitespace-nowrap pl-3 pr-0"
      >
        <!-- open the page's project in telescreen's Hackatime workbench -->
        <template v-if="subject?.project">
          <UiButtonBasic
            v-if="projectTelescreenLink"
            :to="projectTelescreenLink"
            target="_blank"
            class="border-white"
          >
            project telescreen
          </UiButtonBasic>
          <UiButtonBasic
            v-else
            disabled
            class="border-white opacity-50! cursor-not-allowed!"
          >
            {{
              subject.project.hackatimeId
                ? "no hackatime projects"
                : "no hackatime ID"
            }}
          </UiButtonBasic>
        </template>

        <!-- open the page's user in telescreen -->
        <template v-if="subject">
          <UiButtonBasic
            v-if="subject.slackId"
            :to="`https://telescreen.hackclub.com/subjects/${encodeURIComponent(subject.slackId)}`"
            target="_blank"
            class="border-white"
          >
            telescreen
          </UiButtonBasic>
          <UiButtonBasic
            v-else
            disabled
            icon="lucide:external-link"
            class="border-white opacity-50! cursor-not-allowed!"
          >
            no slack ID
          </UiButtonBasic>
        </template>

        <!-- open in admin -->
        <UiButtonBasic
          :to="adminLink"
          icon="lucide:arrow-right"
          class="border-white"
        >
          open in admin panel
        </UiButtonBasic>
      </div>
    </div>
    <!-- keeps the collapsed tab from hugging the icon against the screen edge -->
    <div class="w-2 shrink-0" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { user } = useUserSession();
const subject = useAdminSubject();

// e.g. /workbench/hackatime/overview?u=4085&p=project_one,project_two
// Built by hand so the commas between projects aren't encoded as %2C
const projectTelescreenLink = computed(() => {
  const project = subject.value?.project;
  if (!project?.hackatimeId || !project.hackatimeProjects.length) return null;
  const p = project.hackatimeProjects.map(encodeURIComponent).join(",");
  return `https://telescreen.hackclub.com/workbench/hackatime/overview?u=${project.hackatimeId}&p=${p}`;
});

// Where "open in admin panel" goes for the current page. Add cases as admin pages get made.
const adminLink = computed(() => {
  if (route.name === "app-projects-id") {
    return `/app/admin/projects/${route.params.id}`;
  }
  if (route.path === "/app/projects") return "/app/admin/projects";
  if (route.path === "/app/me" && user.value) {
    return `/app/admin/users/${encodeURIComponent(user.value.id)}`;
  }
  return "/app/admin";
});

// max-width can't transition to `auto`, so animate to the content's measured width instead
// (w-max keeps it measurable while collapsed)
const contentEl = ref<HTMLElement>();
const contentWidth = ref(0);

let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(() => {
    contentWidth.value = contentEl.value?.offsetWidth ?? 0;
  });
  if (contentEl.value) observer.observe(contentEl.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
