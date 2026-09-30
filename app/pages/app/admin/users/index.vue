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
        <h1 class="mt-2 font-bold text-3xl">users</h1>
        <p class="mt-1 opacity-70">{{ users?.length ?? 0 }} total</p>
      </UiCard>

      <input
        v-model="search"
        placeholder="search by name or ID"
        class="w-full border-3 border-black px-3 py-2 outline-none"
      />

      <div
        v-if="filtered.length"
        class="border-4 border-black divide-y-2 divide-black"
      >
        <NuxtLink
          v-for="u in filtered"
          :key="u.id"
          :to="`/app/admin/users/${encodeURIComponent(u.id)}`"
          class="no-underline! flex items-center justify-between gap-4 px-4 py-3 hover:bg-black hover:text-white transition-colors"
        >
          <div class="min-w-0">
            <p class="font-bold truncate">
              {{ fullName(u.identity) }}
              <span
                v-if="u.isAdmin"
                class="ml-1 text-xs font-bold uppercase opacity-70"
                >admin</span
              >
            </p>
            <p class="text-sm opacity-60 truncate">{{ u.id }}</p>
          </div>
          <div class="shrink-0 text-right text-sm">
            <p>{{ u.pixels }} pixels</p>
            <p class="opacity-60">
              {{ u.projectCount }} project{{ u.projectCount == 1 ? "" : "s" }}
            </p>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">No users found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { data: users } = await useFetch("/api/admin/users");

const search = ref("");
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (users.value ?? []).filter(
    (u) =>
      !q ||
      u.id.toLowerCase().includes(q) ||
      fullName(u.identity).toLowerCase().includes(q),
  );
});

function fullName(identity: { first_name?: string; last_name?: string }) {
  return (
    [identity.first_name, identity.last_name].filter(Boolean).join(" ") ||
    "(no name)"
  );
}
</script>
