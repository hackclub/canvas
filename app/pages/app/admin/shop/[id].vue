<template>
  <div class="flex justify-center w-full">
    <div v-if="item" class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin/shop"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> all items
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">{{ item.name }}</h1>
        <p class="mt-1 opacity-70">
          {{ item.price.toLocaleString() }} bonus points
          <template v-if="item.stock !== null">
            · {{ stockLabel(item.stock) }}
          </template>
        </p>
        <div class="absolute top-8 right-8">
          <UiButtonSmall
            icon="lucide:trash-2"
            class="border-3 border-white"
            @click="confirmingDelete = true"
          >
            delete
          </UiButtonSmall>
        </div>
      </UiCard>

      <div class="border-4 border-black">
        <div class="relative h-51">
          <img
            v-if="item.bannerKey"
            :src="`/images/${item.bannerKey}`"
            alt=""
            class="size-full object-cover"
          />
          <button
            v-else
            type="button"
            class="size-full flex flex-col items-center justify-center gap-1 cursor-pointer opacity-70 hover:opacity-100 disabled:cursor-wait"
            :disabled="uploadingBanner"
            @click="bannerInput?.click()"
          >
            <Icon name="lucide:image-plus" :size="28" />
            {{ uploadingBanner ? "uploading..." : "upload a banner" }}
          </button>
          <div v-if="item.bannerKey" class="absolute bottom-3 right-3 flex gap-2">
            <UiButtonSmall
              :disabled="uploadingBanner"
              @click="bannerInput?.click()"
            >
              {{ uploadingBanner ? "uploading..." : "change" }}
            </UiButtonSmall>
            <UiButtonSmall :disabled="uploadingBanner" @click="removeBanner">
              remove
            </UiButtonSmall>
          </div>
          <input
            ref="bannerInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            class="hidden"
            @change="uploadBanner"
          />
        </div>
        <p v-if="bannerError" class="px-4 py-2 text-red-600 border-t-4 border-black">
          {{ bannerError }}
        </p>
      </div>

      <div class="border-4 border-black p-5">
        <AdminShopForm
          v-model="form"
          :saving="saving"
          :error="error"
          submit-label="save"
          @submit="save"
        />
      </div>
    </div>
  </div>

  <UiModal v-model="confirmingDelete" title="delete item">
    <p>
      <b>{{ item?.name }}</b> will be taken out of the shop. This can't be
      undone.
    </p>
    <p v-if="deleteError" class="text-red-600">{{ deleteError }}</p>
    <div class="flex gap-2">
      <UiButtonSmall
        icon="lucide:trash-2"
        :disabled="deleting"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        @click="deleteItem"
      >
        {{ deleting ? "deleting..." : "delete" }}
      </UiButtonSmall>
      <UiButtonSmall @click="confirmingDelete = false">cancel</UiButtonSmall>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import type { ShopItemForm } from "~/components/admin/shop/form.vue";

definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const route = useRoute();
const id = route.params.id as string;
const { data: item, error: fetchError } = await useFetch(
  `/api/admin/shop/${id}`,
);
if (fetchError.value) {
  throw createError({
    statusCode: fetchError.value.statusCode ?? 500,
    statusMessage: fetchError.value.statusMessage,
    fatal: true,
  });
}

type ShopItem = NonNullable<typeof item.value>;

function errorMessage(e: unknown) {
  return (
    (e as { data?: { message?: string } }).data?.message ??
    "Something went wrong, try again!"
  );
}

// --- details ---
const form = ref<ShopItemForm>(emptyShopItemForm());
function reset() {
  if (!item.value) return;
  const {
    name,
    description,
    price,
    stock,
    showInApp,
    showOnLanding,
    showQuantity,
    perUserLimit,
    checkoutLimit,
    checkoutLimitEnabled,
    disclaimer,
    silly,
    requirePhone,
    fields,
  } = item.value;
  form.value = {
    name,
    description,
    price,
    stock: stock ?? "",
    showInApp,
    showOnLanding,
    showQuantity,
    perUserLimit: perUserLimit ?? "",
    checkoutLimit,
    checkoutLimitEnabled,
    disclaimer,
    silly,
    requirePhone,
    // Copied, so editing the form doesn't change the saved item until it's saved
    fields: structuredClone(toRaw(fields)),
  };
}
reset();

const saving = ref(false);
const error = ref("");

async function save() {
  saving.value = true;
  error.value = "";
  try {
    item.value = await $fetch<ShopItem>(`/api/admin/shop/${id}`, {
      method: "PATCH",
      body: shopItemBody(form.value),
    });
    reset();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

// --- banner, uploaded straight away, separately from the save button ---
const MAX_BANNER_BYTES = 10 * 1024 * 1024;
const bannerInput = ref<HTMLInputElement>();
const uploadingBanner = ref(false);
const bannerError = ref("");

async function uploadBanner() {
  const file = bannerInput.value?.files?.[0];
  if (!file) return;
  bannerInput.value!.value = "";
  bannerError.value = "";
  if (file.size > MAX_BANNER_BYTES) {
    bannerError.value = "Images can be at most 10 MB";
    return;
  }

  const body = new FormData();
  body.append("banner", file);
  uploadingBanner.value = true;
  try {
    item.value = await $fetch<ShopItem>(`/api/admin/shop/${id}/banner`, {
      method: "PUT",
      body,
    });
  } catch (e) {
    bannerError.value = errorMessage(e);
  } finally {
    uploadingBanner.value = false;
  }
}

async function removeBanner() {
  bannerError.value = "";
  uploadingBanner.value = true;
  try {
    item.value = await $fetch<ShopItem>(`/api/admin/shop/${id}/banner`, {
      method: "DELETE",
    });
  } catch (e) {
    bannerError.value = errorMessage(e);
  } finally {
    uploadingBanner.value = false;
  }
}

// --- deleting ---
const confirmingDelete = ref(false);
const deleting = ref(false);
const deleteError = ref("");

async function deleteItem() {
  deleting.value = true;
  deleteError.value = "";
  try {
    await $fetch(`/api/admin/shop/${id}`, { method: "DELETE" });
    await navigateTo("/app/admin/shop");
  } catch (e) {
    deleteError.value = errorMessage(e);
  } finally {
    deleting.value = false;
  }
}
</script>
