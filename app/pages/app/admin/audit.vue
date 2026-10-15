<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> admin
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">audit log</h1>
        <p class="mt-1 opacity-70">{{ current.description }}</p>
      </UiCard>

      <div class="flex flex-wrap gap-2">
        <UiButtonSmall
          v-for="s in sections"
          :key="s.value"
          :icon="s.icon"
          icon-position="left"
          :class="s.value === section ? '' : 'opacity-50 hover:opacity-100'"
          @click="section = s.value"
        >
          {{ s.label }}
        </UiButtonSmall>
      </div>

      <!-- keyed so switching between them starts a fresh search -->
      <AdminAuditTransactions
        v-if="section === 'pixels' || section === 'bonus'"
        :key="section"
        :kind="section"
      />
      <AdminAuditBot v-else-if="section === 'bot'" />
      <AdminAuditActions v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const sections = [
  {
    value: "pixels",
    label: "pixels",
    icon: "lucide:grid-2x2",
    description: "Every time a user's pixels went up or down",
  },
  {
    value: "bonus",
    label: "bonus points",
    icon: "lucide:star",
    description: "Every time a user's bonus points went up or down",
  },
  {
    value: "actions",
    label: "admin actions",
    icon: "lucide:shield",
    description: "Every change made by an admin",
  },
  {
    value: "bot",
    label: "bot",
    icon: "lucide:bot",
    description:
      "Every Slack DM the bot sent, and every time someone's double pixels were turned on or off",
  },
] as const;
const section = ref<(typeof sections)[number]["value"]>("pixels");
const current = computed(
  () => sections.find((s) => s.value === section.value)!,
);
</script>
