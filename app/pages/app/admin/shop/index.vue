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
        <h1 class="mt-2 font-bold text-3xl">shop</h1>
        <p class="mt-1 opacity-70">{{ items?.length ?? 0 }} items</p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall
            icon="lucide:plus"
            class="border-3 border-white"
            @click="openCreate"
          >
            new item
          </UiButtonSmall>
        </div>
      </UiCard>

      <div v-if="items?.length" class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="`/app/admin/shop/${item.id}`"
          class="no-underline! block border-4 border-black hover:bg-black hover:text-white transition-colors"
        >
          <img
            :src="
              item.bannerKey
                ? `/images/${item.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            loading="lazy"
            class="h-32 w-full object-cover"
            :class="item.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="p-5 border-t-4 border-black">
            <h2 class="font-bold text-xl">{{ item.name }}</h2>
            <p class="text-sm opacity-60">
              {{ item.price.toLocaleString() }} bonus points ·
              {{ stockLabel(item.stock) }}
            </p>
            <p class="mt-1 opacity-70 line-clamp-2">
              {{ item.description || "No description" }}
            </p>
          </div>
        </NuxtLink>
      </div>
      <p v-else class="opacity-60 italic">Nothing in the shop yet.</p>
    </div>
  </div>

  <UiModal v-model="creating" title="new shop item">
    <AdminShopForm
      v-model="form"
      :saving="saving"
      :error="error"
      submit-label="add item"
      @submit="create"
    />
    <p class="text-sm opacity-70">You can add a banner after it's made.</p>
  </UiModal>
</template>

<script setup lang="ts">
import type { ShopItemForm } from "~/components/admin/shop/form.vue";

definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { data: items } = await useFetch("/api/admin/shop");

const creating = ref(false);
const saving = ref(false);
const error = ref("");
const form = ref<ShopItemForm>({
  name: "",
  description: "",
  price: "",
  stock: "",
  showInApp: true,
  showOnLanding: false,
});

function openCreate() {
  form.value = {
    name: "",
    description: "",
    price: "",
    stock: "",
    showInApp: true,
    showOnLanding: false,
  };
  error.value = "";
  creating.value = true;
}

async function create() {
  saving.value = true;
  error.value = "";
  try {
    const item = await $fetch("/api/admin/shop", {
      method: "POST",
      body: shopItemBody(form.value),
    });
    await navigateTo(`/app/admin/shop/${item.id}`);
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    saving.value = false;
  }
}
</script>
