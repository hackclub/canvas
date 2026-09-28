<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> admin
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">projects</h1>
        <p class="mt-1 opacity-70">{{ projects?.length ?? 0 }} total</p>
      </UiCard>

      <input
        v-model="search"
        placeholder="search by project or owner"
        class="w-full border-3 border-black px-3 py-2 outline-none"
      />

      <div v-if="filtered.length" class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="project in filtered"
          :key="project.id"
          :to="`/app/admin/projects/${project.id}`"
          class="no-underline! block border-4 border-black hover:bg-black hover:text-white transition-colors"
        >
          <img
            :src="
              project.bannerKey
                ? `/images/${project.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="h-32 w-full object-cover"
            :class="project.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="p-5 border-t-4 border-black">
            <h2 class="font-bold text-xl">{{ project.name }}</h2>
            <p class="text-sm opacity-60">by {{ ownerName(project.owner) }}</p>
            <p class="mt-1 opacity-70 line-clamp-2">
              {{ project.description || "No description yet" }}
            </p>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">No projects found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { data: projects } = await useFetch("/api/admin/projects");

const search = ref("");
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (projects.value ?? []).filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      ownerName(p.owner).toLowerCase().includes(q),
  );
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
