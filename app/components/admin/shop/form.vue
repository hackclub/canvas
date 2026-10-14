<template>
  <form class="space-y-3" @submit.prevent="emit('submit')">
    <label class="block">
      <span class="font-semibold">Name</span>
      <input
        v-model="form.name"
        required
        maxlength="100"
        class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
      />
    </label>
    <label class="block">
      <span class="font-semibold">Description</span>
      <span class="opacity-70"> (a sentence or two)</span>
      <textarea
        v-model="form.description"
        rows="2"
        maxlength="500"
        class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
      />
    </label>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="font-semibold">Price</span>
        <span class="opacity-70"> (bonus points)</span>
        <input
          v-model.number="form.price"
          type="number"
          required
          min="0"
          step="1"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
        />
      </label>
      <label class="block">
        <span class="font-semibold">Stock</span>
        <span class="opacity-70"> (empty for no limit)</span>
        <input
          v-model.number="form.stock"
          type="number"
          min="0"
          step="1"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
        />
      </label>
    </div>
    <div class="space-y-1">
      <label class="flex items-center gap-2">
        <input v-model="form.showInApp" type="checkbox" class="size-5 accent-black" />
        <span class="font-semibold">Show in the app carousel</span>
      </label>
      <label class="flex items-center gap-2">
        <input v-model="form.showOnLanding" type="checkbox" class="size-5 accent-black" />
        <span class="font-semibold">Show in the landing page carousel</span>
      </label>
    </div>

    <h3 class="pt-2 font-bold text-lg">checkout</h3>
    <label class="flex items-start gap-2">
      <input v-model="form.silly" type="checkbox" class="mt-0.5 size-5 shrink-0 accent-black" />
      <span>
        <span class="font-semibold">Silly item</span>
        <span class="opacity-70">
          (nothing gets sent out: checkout won't ask for an address, and orders
          are marked fulfilled straight away)</span
        >
      </span>
    </label>
    <label class="flex items-start gap-2" :class="{ 'opacity-40': form.silly }">
      <input
        v-model="form.requirePhone"
        type="checkbox"
        :disabled="form.silly"
        class="mt-0.5 size-5 shrink-0 accent-black"
      />
      <span>
        <span class="font-semibold">Require a phone number</span>
        <span class="opacity-70">
          (if the address someone picks doesn't have one, checkout asks for
          it)</span
        >
      </span>
    </label>
    <label class="flex items-center gap-2">
      <input v-model="form.showQuantity" type="checkbox" class="size-5 accent-black" />
      <span class="font-semibold">Let people pick a quantity</span>
      <span class="opacity-70">(otherwise every order is for one)</span>
    </label>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="font-semibold">Per person limit</span>
        <span class="opacity-70"> (empty for no limit)</span>
        <input
          v-model.number="form.perUserLimit"
          type="number"
          min="1"
          step="1"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
        />
      </label>
      <div>
        <label class="flex items-center gap-2">
          <input
            v-model="form.checkoutLimitEnabled"
            type="checkbox"
            class="size-5 accent-black"
          />
          <span class="font-semibold">Checkout limit</span>
          <span class="opacity-70">(per order)</span>
        </label>
        <input
          v-model.number="form.checkoutLimit"
          type="number"
          min="1"
          max="1000"
          step="1"
          required
          :disabled="!form.checkoutLimitEnabled"
          aria-label="Checkout limit"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none disabled:opacity-40"
        />
      </div>
    </div>
    <p class="text-sm opacity-70">
      The per person limit counts every order someone's placed that wasn't
      rejected. The checkout limit only caps a single order, so people can get
      around it by ordering again.
    </p>
    <label class="block">
      <span class="font-semibold">Disclaimer</span>
      <span class="opacity-70"> (shown at checkout, optional)</span>
      <textarea
        v-model="form.disclaimer"
        rows="2"
        maxlength="1000"
        placeholder="e.g. If we can't get this to you, we'll send something similar instead."
        class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
      />
    </label>
    <div class="space-y-1">
      <h3 class="pt-2 font-bold text-lg">fields</h3>
      <p class="text-sm opacity-70">
        Questions people answer at checkout, like a size or colour. Changing
        them doesn't change orders that were already placed.
      </p>
    </div>
    <AdminShopFields v-model="form.fields" />

    <p v-if="error" class="text-red-600">{{ error }}</p>
    <UiButtonSmall
      type="submit"
      :disabled="saving"
      class="disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ saving ? "saving..." : submitLabel }}
    </UiButtonSmall>
  </form>
</template>

<script setup lang="ts">
import type { ShopItemFieldForm } from "~/components/admin/shop/fields.vue";

export interface ShopItemForm {
  name: string;
  description: string;
  price: number | "";
  // An empty number input gives "", which means no limit
  stock: number | "" | null;
  showInApp: boolean;
  showOnLanding: boolean;
  showQuantity: boolean;
  // Empty means no limit, like stock
  perUserLimit: number | "" | null;
  checkoutLimit: number | "";
  checkoutLimitEnabled: boolean;
  disclaimer: string;
  silly: boolean;
  requirePhone: boolean;
  fields: ShopItemFieldForm[];
}

const form = defineModel<ShopItemForm>({ required: true });
defineProps<{ saving: boolean; error: string; submitLabel: string }>();
const emit = defineEmits<{ submit: [] }>();
</script>
