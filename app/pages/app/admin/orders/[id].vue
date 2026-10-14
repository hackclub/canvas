<template>
  <div class="flex justify-center w-full">
    <div v-if="order" class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin/orders"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> all orders
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">
          {{ order.quantity }}× {{ order.itemName }}
        </h1>
        <p class="mt-1 opacity-70">order #{{ order.id }} · {{ order.status }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiButtonSmall
            v-if="order.status === 'pending'"
            icon="lucide:package-check"
            class="border-3 border-white"
            :disabled="saving"
            @click="setStatus('fulfilled')"
          >
            mark as fulfilled
          </UiButtonSmall>
          <UiButtonSmall
            v-if="order.status === 'fulfilled' && !order.silly"
            icon="lucide:undo-2"
            class="border-3 border-white"
            :disabled="saving"
            @click="setStatus('pending')"
          >
            back to pending
          </UiButtonSmall>
          <UiButtonSmall
            v-if="order.status !== 'rejected'"
            icon="lucide:x"
            class="border-3 border-white"
            :disabled="saving"
            @click="confirmingReject = true"
          >
            reject
          </UiButtonSmall>
          <p v-if="order.status === 'rejected'" class="opacity-70">
            Rejected, and their bonus points were given back.
          </p>
        </div>
        <p v-if="error" class="mt-2 text-red-400">{{ error }}</p>
      </UiCard>

      <div class="grid gap-4 md:grid-cols-2 items-start">
        <div v-if="!order.address" class="border-4 border-black p-5">
          <h2 class="font-bold text-xl">nothing to send</h2>
          <p class="mt-2 opacity-70">
            This was a silly item, so there's no address and it was fulfilled
            as soon as it was ordered.
          </p>
        </div>
        <div v-else class="border-4 border-black p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-bold text-xl">ship to</h2>
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
                    :name="
                      copied === field.label ? 'lucide:check' : 'lucide:copy'
                    "
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
            <p v-if="order.address.phoneNumber" class="mt-2 opacity-70">
              Phone: {{ order.address.phoneNumber }}
            </p>
          </template>
        </div>

        <div class="border-4 border-black p-5">
          <h2 class="font-bold text-xl">details</h2>
          <dl class="mt-2 space-y-1">
            <div v-for="field in details" :key="field.label" class="flex gap-2">
              <dt class="opacity-70 shrink-0">{{ field.label }}:</dt>
              <dd class="min-w-0 break-words">
                <NuxtLink v-if="field.to" :to="field.to" class="font-bold">
                  {{ field.value }}
                </NuxtLink>
                <template v-else>{{ field.value }}</template>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <AdminNotes :order-id="order.id" />
    </div>
  </div>

  <UiModal v-model="confirmingReject" title="reject order?">
    <p>
      <b>{{ userName }}</b> will get their
      <b>{{ total.toLocaleString() }} bonus points</b> back, and the stock will
      be put back. This can't be undone.
    </p>
    <div class="flex gap-2">
      <UiButtonSmall
        icon="lucide:x"
        :disabled="saving"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        @click="setStatus('rejected')"
      >
        {{ saving ? "rejecting..." : "reject" }}
      </UiButtonSmall>
      <UiButtonSmall @click="confirmingReject = false">cancel</UiButtonSmall>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const route = useRoute();
const id = route.params.id as string;
const { data: order, error: fetchError } = await useFetch(
  `/api/admin/orders/${id}`,
);
if (fetchError.value) {
  throw createError({
    statusCode: fetchError.value.statusCode ?? 500,
    statusMessage: fetchError.value.statusMessage,
    fatal: true,
  });
}

const userName = computed(() => {
  const u = order.value?.user;
  if (!u) return "";
  return (
    [u.identity.first_name, u.identity.last_name].filter(Boolean).join(" ") ||
    u.id
  );
});

const total = computed(() =>
  order.value ? order.value.price * order.value.quantity : 0,
);

// The address as it'd go on a label
const addressText = computed(() => {
  const a = order.value?.address;
  if (!a) return "";
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
  const a = order.value?.address;
  if (!a) return [];
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

const details = computed(() => {
  const o = order.value!;
  return [
    {
      label: "Item",
      value: o.itemName + (o.itemId === null ? " (deleted)" : ""),
      to: o.itemId !== null ? `/app/admin/shop/${o.itemId}` : undefined,
    },
    { label: "Quantity", value: o.quantity.toLocaleString() },
    { label: "Price each", value: `${o.price.toLocaleString()} bonus points` },
    { label: "Total", value: `${total.value.toLocaleString()} bonus points` },
    {
      label: "Ordered by",
      value: userName.value,
      to: `/app/admin/users/${encodeURIComponent(o.user.id)}`,
    },
    { label: "Slack ID", value: o.user.slackId ?? "none" },
    { label: "Placed", value: new Date(o.createdAt).toLocaleString() },
    { label: "Last changed", value: new Date(o.updatedAt).toLocaleString() },
  ];
});

const saving = ref(false);
const error = ref("");
const confirmingReject = ref(false);

async function setStatus(status: OrderStatus) {
  saving.value = true;
  error.value = "";
  try {
    const updated = await $fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      body: { status },
    });
    order.value = { ...order.value!, ...updated };
    confirmingReject.value = false;
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
    confirmingReject.value = false;
  } finally {
    saving.value = false;
  }
}
</script>
