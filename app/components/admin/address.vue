<template>
  <div class="border-4 border-black p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-bold text-xl">{{ title }}</h2>
      <div class="flex gap-2">
        <UiButtonSmall
          :icon="addressFields ? 'lucide:mail' : 'lucide:list'"
          @click="addressFields = !addressFields"
        >
          {{ addressFields ? "label" : "fields" }}
        </UiButtonSmall>
        <UiButtonSmall
          :icon="copied === 'all' ? 'lucide:check' : 'lucide:copy'"
          @click="copy('all', addressText)"
        >
          {{ copied === "all" ? "copied" : "copy" }}
        </UiButtonSmall>
      </div>
    </div>
    <!-- one field per line, for filling in a shipping form box by box -->
    <dl v-if="addressFields" class="mt-2 space-y-1">
      <div
        v-for="field in addressFieldList"
        :key="field.label"
        class="flex items-center gap-2"
      >
        <dt class="opacity-70 shrink-0">{{ field.label }}:</dt>
        <dd v-if="field.value" class="flex min-w-0 items-center gap-1">
          <span class="break-words">{{ field.value }}</span>
          <button
            type="button"
            :aria-label="`Copy ${field.label.toLowerCase()}`"
            class="flex shrink-0 cursor-pointer opacity-50 hover:opacity-100"
            @click="copy(field.label, field.value)"
          >
            <Icon
              :name="copied === field.label ? 'lucide:check' : 'lucide:copy'"
              :size="14"
            />
          </button>
        </dd>
        <dd v-else class="opacity-40 italic">none</dd>
      </div>
    </dl>
    <template v-else>
      <address class="mt-2 not-italic whitespace-pre-line">{{
        addressText
      }}</address>
      <p v-if="address.phoneNumber" class="mt-2 opacity-70">
        Phone: {{ address.phoneNumber }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
// An address with a label/fields toggle and copy buttons, for the fulfillment dashboard and
// the ship review
const props = withDefaults(
  defineProps<{ address: ShippingAddress; title?: string }>(),
  { title: "ship to" },
);

// The address as it'd go on a label
const addressText = computed(() => {
  const a = props.address;
  return [
    [a.firstName, a.lastName].filter(Boolean).join(" "),
    a.line1,
    a.line2,
    [a.city, a.state, a.postalCode].filter(Boolean).join(", "),
    a.country,
  ]
    .filter(Boolean)
    .join("\n");
});

// Whether the address is shown field by field rather than as a label
const addressFields = ref(false);
const addressFieldList = computed(() => {
  const a = props.address;
  return [
    { label: "First name", value: a.firstName },
    { label: "Last name", value: a.lastName },
    { label: "Street address", value: a.line1 },
    { label: "Address line 2", value: a.line2 },
    { label: "City", value: a.city },
    { label: "State / province", value: a.state },
    { label: "Postal code", value: a.postalCode },
    { label: "Country", value: a.country },
    { label: "Phone", value: a.phoneNumber },
  ];
});

// What was copied last ("all" for the whole address, or a field's label), for the tick
const copied = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
async function copy(what: string, text: string) {
  await navigator.clipboard.writeText(text);
  copied.value = what;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = null), 2000);
}
</script>
