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
export interface ShopItemForm {
  name: string;
  description: string;
  price: number | "";
  // An empty number input gives "", which means no limit
  stock: number | "" | null;
}

const form = defineModel<ShopItemForm>({ required: true });
defineProps<{ saving: boolean; error: string; submitLabel: string }>();
const emit = defineEmits<{ submit: [] }>();
</script>
