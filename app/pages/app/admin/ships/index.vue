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
        <h1 class="mt-2 font-bold text-3xl">review queue</h1>
        <p class="mt-1 opacity-70">{{ ships?.length ?? 0 }} {{ status }}</p>
      </UiCard>

      <div class="flex gap-2">
        <UiButtonSmall
          v-for="s in statuses"
          :key="s"
          :class="s === status ? '' : 'opacity-50 hover:opacity-100'"
          @click="status = s"
        >
          {{ s }}
        </UiButtonSmall>
      </div>

      <div v-if="ships?.length" class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="ship in ships"
          :key="ship.id"
          :to="`/app/admin/projects/${ship.project.id}`"
          class="no-underline! block border-4 border-black hover:bg-black hover:text-white transition-colors"
        >
          <img
            :src="
              ship.project.bannerKey
                ? `/images/${ship.project.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="h-32 w-full object-cover"
            :class="ship.project.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="p-5 border-t-4 border-black">
            <h2 class="font-bold text-xl">{{ ship.project.name }}</h2>
            <p class="text-sm opacity-60">
              by {{ ownerName(ship.owner) }} · shipped
              {{ new Date(ship.createdAt).toLocaleString() }}
            </p>
            <p class="mt-1 opacity-70 line-clamp-2">
              {{ ship.project.description || "No description" }}
            </p>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">
        {{ status === "pending" ? "Nothing to review, nice!" : "No ships." }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const statuses = ["pending", "approved", "rejected"] as const;
const status = ref<(typeof statuses)[number]>("pending");

const { data: ships } = await useFetch("/api/admin/ships", {
  query: { status },
});

function ownerName(owner: {
  id: string;
  identity: { first_name?: string; last_name?: string };
}) {
  return (
    [owner.identity.first_name, owner.identity.last_name]
      .filter(Boolean)
      .join(" ") || owner.id
  );
}
</script>
