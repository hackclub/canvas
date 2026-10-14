<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/shop"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> shop
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">your orders</h1>
        <p class="mt-1 opacity-70">
          {{ orders?.length ?? 0 }} order{{ orders?.length == 1 ? "" : "s" }}
        </p>
      </UiCard>

      <div v-if="orders?.length" class="space-y-4">
        <article
          v-for="order in orders"
          :key="order.id"
          class="flex gap-4 border-4 border-black p-4"
        >
          <img
            :src="
              order.bannerKey
                ? `/images/${order.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="hidden sm:block size-24 shrink-0 object-cover border-2 border-black"
            :class="order.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 class="font-bold text-lg">
                {{ order.quantity }}×
                <NuxtLink
                  v-if="order.itemId !== null"
                  :to="`/app/shop/${order.itemId}`"
                >
                  {{ order.itemName }}
                </NuxtLink>
                <template v-else>{{ order.itemName }}</template>
              </h2>
              <p class="text-sm font-bold">
                {{ (order.price * order.quantity).toLocaleString() }} bonus
                points
              </p>
            </div>
            <p class="text-sm opacity-60">
              #{{ order.id }} · ordered
              {{ new Date(order.createdAt).toLocaleDateString() }}
            </p>

            <p
              v-if="order.status === 'rejected'"
              class="mt-3 flex items-center gap-2 border-2 border-red-600 px-3 py-2 text-sm"
            >
              <Icon name="lucide:circle-x" class="shrink-0 text-red-600" />
              <span>
                We couldn't send this one, so you got your
                <b>{{ (order.price * order.quantity).toLocaleString() }} bonus
                points</b>
                back.
              </span>
            </p>
            <template v-else>
              <!-- progress: ordered, then sent out (silly items are done straight away) -->
              <ol class="mt-3 flex items-center gap-2 text-sm">
                <li class="flex items-center gap-1 font-bold">
                  <Icon name="lucide:circle-check" /> ordered
                </li>
                <li
                  aria-hidden="true"
                  class="h-1 flex-1 bg-black"
                  :class="order.status === 'fulfilled' ? '' : 'opacity-20'"
                />
                <li
                  class="flex items-center gap-1"
                  :class="
                    order.status === 'fulfilled' ? 'font-bold' : 'opacity-50'
                  "
                >
                  <Icon
                    :name="
                      order.status === 'fulfilled'
                        ? 'lucide:circle-check'
                        : 'lucide:circle-dashed'
                    "
                  />
                  {{ order.silly ? "all yours" : "sent out" }}
                </li>
              </ol>
              <p class="mt-1 text-sm opacity-70">
                <template v-if="order.status === 'pending'">
                  We've got your order and will send it out soon.
                </template>
                <template v-else-if="order.silly">It's all yours!</template>
                <template v-else>
                  Sent out on
                  {{ new Date(order.updatedAt).toLocaleDateString() }}, it's on
                  its way!
                </template>
              </p>
            </template>
          </div>
        </article>
      </div>
      <p v-else class="opacity-60 italic">
        You haven't ordered anything yet.
        <NuxtLink to="/app/shop">Go shopping!</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { data: orders } = await useFetch("/api/me/orders");
</script>
