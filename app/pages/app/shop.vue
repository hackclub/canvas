<template>
  <div class="flex justify-center w-full">
    <div class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <h1 class="font-bold text-3xl">shop</h1>
        <p class="mt-3">trade your bonus points for prizes!</p>
        <p class="mt-3 font-bold text-2xl">
          {{ (shop?.bonusPoints ?? 0).toLocaleString() }} bonus points
        </p>
        <p class="text-sm opacity-70">
          Get 10 for every hour you spend on a project, once it's shipped and
          approved.
        </p>
      </UiCard>

      <p v-if="notice" class="border-4 border-black px-4 py-2 font-bold">
        {{ notice }}
      </p>

      <div v-if="shop?.items.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                :disabled="item.stock === 0"
                class="disabled:opacity-50 disabled:cursor-not-allowed"
                @click="buy"
              >
                buy
              </UiButtonSmall>
            </div>
          </div>
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

// Placeholder until buying is built
const notice = ref("");
function buy() {
  notice.value = "Buying isn't open yet, check back soon!";
}
</script>
