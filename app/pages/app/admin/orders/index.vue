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
        <h1 class="mt-2 font-bold text-3xl">orders</h1>
        <p class="mt-1 opacity-70">{{ orders?.length ?? 0 }} {{ status }}</p>
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

      <div
        v-if="orders?.length"
        class="border-4 border-black divide-y-2 divide-black"
      >
        <NuxtLink
          v-for="order in orders"
          :key="order.id"
          :to="`/app/admin/orders/${order.id}`"
          class="no-underline! flex items-center gap-4 px-4 py-3 hover:bg-black hover:text-white transition-colors"
        >
          <img
            :src="
              order.bannerKey
                ? `/images/${order.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="hidden sm:block size-14 shrink-0 object-cover border-2 border-black"
          />
          <div class="min-w-0 flex-1">
            <p class="font-bold truncate">
              {{ order.quantity }}× {{ order.itemName }}
              <span v-if="order.silly" class="font-normal opacity-60">
                (silly)</span
              >
            </p>
            <p v-if="order.choices.length" class="text-sm truncate">
              {{ order.choices.map((c) => `${c.field}: ${c.option}`).join(" · ") }}
            </p>
            <p class="text-sm opacity-60 truncate">
              #{{ order.id }} · by {{ userName(order.user) }} ·
              {{ new Date(order.createdAt).toLocaleString() }}
            </p>
          </div>
          <p class="shrink-0 text-sm font-bold">
            {{ (order.price * order.quantity).toLocaleString() }} bonus points
          </p>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">
        {{ status === "pending" ? "Nothing to send out, nice!" : "No orders." }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const statuses = ["pending", "fulfilled", "rejected"] as const;
const status = ref<(typeof statuses)[number]>("pending");

const { data: orders } = await useFetch("/api/admin/orders", {
  query: { status },
});

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
