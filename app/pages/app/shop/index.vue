<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">shop</h1>
        <p class="mt-3">
          trade your bonus points for prizes. get 5 bonus points per hour
          shipped!
        </p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall
            to="/app/shop/orders"
            icon="lucide:package"
            class="border-3 border-white"
          >
            your orders
          </UiButtonSmall>
        </div>
      </UiCard>

      <div
        v-if="shop?.items.length"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article
          v-for="item in shop.items"
          :key="item.id"
          class="flex flex-col border-4 border-black"
        >
          <img
            :src="
              item.bannerKey
                ? `/images/${item.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="h-36 w-full object-cover"
            :class="item.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="flex flex-col flex-1 p-4 border-t-4 border-black">
            <h2 class="font-bold text-lg">{{ item.name }}</h2>
            <p class="text-sm opacity-60">{{ stockLabel(item.stock) }}</p>
            <p class="mt-1 mb-4 opacity-70">{{ item.description }}</p>
            <div class="mt-auto flex items-center justify-between gap-2">
              <p class="font-bold">
                {{ item.price.toLocaleString() }} bonus points
              </p>
              <UiButtonSmall
                icon="lucide:shopping-cart"
                :to="`/app/shop/${item.id}`"
                :class="{ 'opacity-50': item.stock === 0 }"
              >
                {{ item.stock === 0 ? "sold out" : "buy" }}
              </UiButtonSmall>
            </div>
          </div>
        </article>
        <article
          class="flex flex-col items-center justify-center text-center border-4 border-black p-4"
        >
          <Icon name="lucide:shopping-cart" :size="48" />
          <p class="font-bold mt-3">More items coming soon..</p>
          <p>
            Until then,
            <NuxtLink
              to="https://airtable.com/app4iSJSXCxyAiL5c/pagWmLWAssdWPExF4/form"
              >suggest some!</NuxtLink
            >
          </p>
        </article>
      </div>
      <p v-else class="opacity-60 italic">
        Nothing in the shop yet, check back soon!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const { data: shop } = await useFetch("/api/shop");
</script>
