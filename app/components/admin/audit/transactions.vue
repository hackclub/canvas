<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UiButtonSmall
        v-for="d in directions"
        :key="d.value"
        :class="d.value === direction ? '' : 'opacity-50 hover:opacity-100'"
        @click="setDirection(d.value)"
      >
        {{ d.label }}
      </UiButtonSmall>
    </div>

    <input
      v-model="search"
      placeholder="search by user, admin, reason or project"
      class="w-full border-3 border-black px-3 py-2 outline-none"
    />

    <p class="text-sm opacity-70">
      {{ data?.total ?? 0 }} transaction{{ data?.total == 1 ? "" : "s" }}
    </p>

    <div
      v-if="data?.items.length"
      class="border-4 border-black divide-y-2 divide-black"
    >
      <div
        v-for="t in data.items"
        :key="t.id"
        class="flex items-center justify-between gap-4 px-4 py-3"
      >
        <div class="min-w-0">
          <p class="truncate">
            <NuxtLink
              :to="`/app/admin/users/${encodeURIComponent(t.user.id)}`"
              class="font-bold"
            >
              {{ userName(t.user) }}
            </NuxtLink>
            <template v-if="t.reason === 'canvas'">
              placed pixels on the canvas</template
            >
            <template v-else-if="t.reason === 'ship'">
              — paid for shipping
              <NuxtLink
                v-if="t.project"
                :to="`/app/admin/projects/${t.project.id}`"
                class="font-bold"
              >
                {{ t.project.name }}
              </NuxtLink>
              <span v-else class="italic">a deleted project</span>
            </template>
            <template v-else>
              — changed by
              <NuxtLink
                v-if="t.actor"
                :to="`/app/admin/users/${encodeURIComponent(t.actor.id)}`"
                class="font-bold"
              >
                {{ userName(t.actor) }}
              </NuxtLink>
              <span v-else class="italic">a deleted admin</span>
            </template>
          </p>
          <p class="text-sm opacity-60">
            {{ new Date(t.createdAt).toLocaleString() }}
          </p>
        </div>
        <div class="shrink-0 text-right text-sm">
          <p
            class="font-bold"
            :class="t.amount > 0 ? 'text-green-700' : 'text-red-700'"
          >
            {{ t.amount > 0 ? "+" : "" }}{{ t.amount.toLocaleString() }}
            {{ unit }}
          </p>
          <p class="opacity-60">balance {{ t.balance.toLocaleString() }}</p>
        </div>
      </div>
    </div>
    <p v-else class="opacity-60 italic">
      {{ status === "pending" ? "Loading…" : "No transactions found." }}
    </p>

    <AdminAuditPager
      v-if="data"
      v-model="page"
      :total="data.total"
      :page-size="data.pageSize"
    />
  </div>
</template>

<script setup lang="ts">
// Pixel or bonus point transactions, which look the same
const props = defineProps<{ kind: "pixels" | "bonus" }>();

const unit = computed(() =>
  props.kind === "pixels" ? "pixels" : "bonus points",
);

const directions = [
  { value: "all", label: "all" },
  { value: "increased", label: "increased" },
  { value: "decreased", label: "decreased" },
] as const;
const direction = ref<(typeof directions)[number]["value"]>("all");

const { search, q, page } = useAuditSearch();

function setDirection(value: typeof direction.value) {
  direction.value = value;
  page.value = 1;
}

const { data, status } = useFetch(
  props.kind === "pixels"
    ? "/api/admin/audit/pixels"
    : "/api/admin/audit/bonus",
  { query: { q, page, direction } },
);

function userName(u: {
  id: string;
  identity: { first_name?: string; last_name?: string };
}) {
  return (
    [u.identity.first_name, u.identity.last_name].filter(Boolean).join(" ") ||
    u.id
  );
}
</script>
