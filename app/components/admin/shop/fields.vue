<template>
  <div class="space-y-3">
    <div
      v-for="(field, i) in fields"
      :key="field.id"
      class="border-3 border-black p-4 space-y-3"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-1 text-sm font-semibold opacity-70">
          <Icon name="lucide:circle-dot" /> multiple choice
        </p>
        <div class="flex gap-1">
          <button
            v-for="action in fieldActions(i)"
            :key="action.label"
            type="button"
            :aria-label="action.label"
            :disabled="action.disabled"
            class="flex p-1 cursor-pointer hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current"
            @click="action.run"
          >
            <Icon :name="action.icon" :size="18" />
          </button>
        </div>
      </div>

      <label class="block">
        <span class="font-semibold">Title</span>
        <input
          v-model="field.title"
          required
          maxlength="100"
          placeholder="e.g. Size"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
        />
      </label>
      <label class="block">
        <span class="font-semibold">Description</span>
        <span class="opacity-70"> (optional)</span>
        <textarea
          v-model="field.description"
          rows="2"
          maxlength="500"
          class="mt-1 block w-full border-3 border-black px-3 py-1 outline-none"
        />
      </label>
      <label class="flex items-center gap-2">
        <input
          v-model="field.required"
          type="checkbox"
          class="size-5 accent-black"
        />
        <span class="font-semibold">Required</span>
      </label>

      <div class="space-y-2">
        <p class="font-semibold">
          Options
          <span class="font-normal opacity-70">
            (extra cost is per item, on top of the price)</span
          >
        </p>
        <div
          v-for="(option, j) in field.options"
          :key="option.id"
          class="flex items-center gap-2"
        >
          <input
            v-model="option.label"
            required
            maxlength="100"
            :placeholder="`Option ${j + 1}`"
            :aria-label="`Option ${j + 1} of ${field.title || 'this field'}`"
            class="min-w-0 flex-1 border-3 border-black px-3 py-1 outline-none"
          />
          <label class="flex shrink-0 items-center gap-1">
            <span class="opacity-70">+</span>
            <input
              v-model.number="option.price"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              :aria-label="`Extra cost of option ${j + 1}`"
              class="w-24 border-3 border-black px-2 py-1 outline-none"
            />
          </label>
          <button
            type="button"
            :aria-label="`Remove option ${j + 1}`"
            :disabled="field.options.length === 1"
            class="flex shrink-0 p-1 cursor-pointer hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current"
            @click="field.options.splice(j, 1)"
          >
            <Icon name="lucide:x" :size="18" />
          </button>
        </div>
        <UiButtonSmall
          icon="lucide:plus"
          :disabled="field.options.length >= 20"
          class="disabled:opacity-50 disabled:cursor-not-allowed"
          @click="field.options.push(newOption())"
        >
          add option
        </UiButtonSmall>
      </div>
    </div>

    <UiButtonSmall
      icon="lucide:plus"
      :disabled="fields.length >= 10"
      class="disabled:opacity-50 disabled:cursor-not-allowed"
      @click="fields.push(newField())"
    >
      add multiple choice field
    </UiButtonSmall>
  </div>
</template>

<script setup lang="ts">
export interface ShopItemFieldForm {
  id: string;
  type: "choice";
  title: string;
  description: string;
  required: boolean;
  // An empty number input gives "", which means no extra cost
  options: { id: string; label: string; price: number | "" }[];
}

const fields = defineModel<ShopItemFieldForm[]>({ required: true });

// IDs are made here so new rows have a key, and kept by the server so answers keep matching
const newId = () => crypto.randomUUID().slice(0, 8);
const newOption = () => ({ id: newId(), label: "", price: "" as const });
const newField = (): ShopItemFieldForm => ({
  id: newId(),
  type: "choice",
  title: "",
  description: "",
  required: true,
  options: [newOption(), newOption()],
});

function move(from: number, to: number) {
  const [field] = fields.value.splice(from, 1);
  fields.value.splice(to, 0, field!);
}

const fieldActions = (i: number) => [
  {
    label: "Move up",
    icon: "lucide:arrow-up",
    disabled: i === 0,
    run: () => move(i, i - 1),
  },
  {
    label: "Move down",
    icon: "lucide:arrow-down",
    disabled: i === fields.value.length - 1,
    run: () => move(i, i + 1),
  },
  {
    label: "Remove field",
    icon: "lucide:trash-2",
    disabled: false,
    run: () => fields.value.splice(i, 1),
  },
];
</script>
