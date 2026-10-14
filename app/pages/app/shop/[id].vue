<template>
  <div class="flex justify-center w-full">
    <div v-if="data" class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <NuxtLink
        to="/app/shop"
        class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
      >
        <Icon name="lucide:arrow-left" /> back to the shop
      </NuxtLink>

      <div class="grid gap-4 md:grid-cols-2 items-start">
        <div class="border-4 border-black">
          <img
            :src="
              item.bannerKey
                ? `/images/${item.bannerKey}`
                : '/img/placeholder-img.svg'
            "
            alt=""
            class="h-64 w-full object-cover"
            :class="item.bannerKey ? 'object-center' : 'object-bottom'"
          />
          <div class="p-5 border-t-4 border-black space-y-3">
            <div>
              <h1 class="font-bold text-3xl">{{ item.name }}</h1>
              <p class="opacity-60">
                {{ item.price.toLocaleString() }} bonus points
                <template v-if="item.stock !== null">
                  · {{ stockLabel(item.stock) }}
                </template>
              </p>
            </div>
            <p v-if="item.description" class="whitespace-pre-wrap opacity-70">
              {{ item.description }}
            </p>
            <div
              v-if="item.disclaimer"
              class="flex gap-2 border-3 border-black px-4 py-3"
            >
              <Icon name="lucide:info" class="shrink-0 mt-1" />
              <p class="whitespace-pre-wrap">{{ item.disclaimer }}</p>
            </div>
          </div>
        </div>

        <UiCard>
          <div v-if="placed" class="space-y-3">
            <h2 class="flex items-center gap-2 font-bold text-2xl">
              <Icon name="lucide:party-popper" /> order placed!
            </h2>
            <template v-if="placed.status === 'fulfilled'">
              <p>
                <b>{{ item.name }}</b> is all yours! Your order number is
                <b>#{{ placed.id }}</b>.
              </p>
            </template>
            <template v-else>
              <p>
                We'll send your <b>{{ item.name }}</b> to the address you
                picked. Your order number is <b>#{{ placed.id }}</b>.
              </p>
              <p class="text-sm opacity-70">
                If something goes wrong and we can't send it, you'll get your
                bonus points back.
              </p>
            </template>
            <div class="flex flex-wrap gap-2">
              <UiButtonSmall
                to="/app/shop/orders"
                icon="lucide:package"
                class="border-3 border-white"
              >
                your orders
              </UiButtonSmall>
              <UiButtonSmall
                to="/app/shop"
                icon="lucide:shopping-bag"
                class="border-3 border-white"
              >
                back to the shop
              </UiButtonSmall>
              <UiButtonSmall
                v-if="!limitReached && item.stock !== 0"
                class="border-3 border-white"
                @click="placed = null"
              >
                order another
              </UiButtonSmall>
            </div>
          </div>

          <form v-else class="space-y-5" @submit.prevent="placeOrder">
            <h2 class="font-bold text-2xl">complete your order</h2>

            <p
              v-if="item.perUserLimit !== null"
              class="border-2 border-white/40 px-4 py-3 text-sm"
            >
              You can get up to <b>{{ item.perUserLimit }}</b> of these<template
                v-if="data.ordered"
              >, and you've ordered <b>{{ data.ordered }}</b> so far</template
              >.
            </p>

            <label v-if="item.showQuantity" class="block">
              <span class="font-semibold">Quantity</span>
              <input
                v-model.number="quantity"
                type="number"
                min="1"
                :max="maxQuantity || undefined"
                step="1"
                required
                :class="inputClass"
              />
              <span
                v-if="item.checkoutLimit !== null"
                class="mt-1 block text-sm opacity-70"
              >
                At most {{ item.checkoutLimit }} per order
              </span>
            </label>

            <fieldset v-for="field in item.fields" :key="field.id">
              <legend class="font-semibold">
                {{ field.title }}
                <span v-if="!field.required" class="font-normal opacity-70">
                  (optional)</span
                >
              </legend>
              <p
                v-if="field.description"
                class="text-sm opacity-70 whitespace-pre-wrap"
              >
                {{ field.description }}
              </p>
              <div class="mt-1 space-y-1">
                <label
                  v-for="option in fieldOptions(field)"
                  :key="option.id"
                  class="flex cursor-pointer items-center gap-3 border-2 px-3 py-2"
                  :class="
                    picks[field.id] === option.id
                      ? 'border-white'
                      : 'border-white/40 hover:border-white/70'
                  "
                >
                  <input
                    v-model="picks[field.id]"
                    type="radio"
                    :name="field.id"
                    :value="option.id"
                    class="size-4 shrink-0 accent-white"
                  />
                  <span class="flex-1">{{ option.label }}</span>
                  <span v-if="option.price" class="text-sm opacity-70">
                    +{{ option.price.toLocaleString() }} bonus points
                  </span>
                </label>
              </div>
            </fieldset>

            <!-- silly items aren't sent anywhere -->
            <div v-if="!item.silly">
              <label for="address" class="font-semibold">Shipping address</label>
              <p v-if="loadingAddresses" :class="inputClass">
                loading your addresses...
              </p>
              <p v-else-if="addressError" :class="inputClass">
                {{ addressError }}
                <NuxtLink
                  v-if="needsSignIn"
                  to="/auth/hackclub"
                  external
                  class="font-bold"
                >
                  Sign in again
                </NuxtLink>
              </p>
              <p v-else-if="!addresses?.length" :class="inputClass">
                You don't have an address on Hack Club Auth yet. Add one, then
                hit refresh.
              </p>
              <select
                v-else
                id="address"
                v-model="addressId"
                required
                :class="[inputClass, 'cursor-pointer']"
              >
                <option
                  v-for="a in addresses"
                  :key="a.id"
                  :value="a.id"
                  class="text-black"
                >
                  {{ a.label }}
                </option>
              </select>
              <div class="mt-2 flex flex-wrap gap-2">
                <UiButtonSmall
                  to="https://auth.hackclub.com"
                  target="_blank"
                  icon="lucide:external-link"
                  class="border-3 border-white"
                >
                  edit addresses
                </UiButtonSmall>
                <UiButtonSmall
                  icon="lucide:refresh-cw"
                  class="border-3 border-white"
                  :disabled="loadingAddresses"
                  @click="refreshAddresses()"
                >
                  refresh
                </UiButtonSmall>
              </div>
            </div>

            <!-- for items that need one, when the picked address doesn't have one -->
            <label v-if="needsPhone" class="block">
              <span class="font-semibold">Phone number</span>
              <input
                v-model="phoneNumber"
                type="tel"
                autocomplete="tel"
                required
                maxlength="30"
                placeholder="+1 555 0100"
                :class="inputClass"
              />
              <span class="mt-1 block text-sm opacity-70">
                This item needs a phone number to ship, and your address doesn't
                have one. It's only shared with the people sending your order.
              </span>
            </label>

            <div>
              <h3 class="font-bold text-lg">order summary</h3>
              <p class="text-sm opacity-70">
                Your balance: {{ data.bonusPoints.toLocaleString() }} bonus
                points
              </p>
              <dl class="mt-2 border-2 border-white/40 px-4 py-3 space-y-1">
                <div class="flex justify-between gap-4">
                  <dt>Price</dt>
                  <dd>{{ item.price.toLocaleString() }} bonus points</dd>
                </div>
                <div
                  v-for="choice in pricedChoices"
                  :key="choice.fieldId"
                  class="flex justify-between gap-4"
                >
                  <dt class="min-w-0">{{ choice.field }}: {{ choice.option }}</dt>
                  <dd class="shrink-0">
                    +{{ choice.price.toLocaleString() }} bonus points
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt>Quantity</dt>
                  <dd>{{ validQuantity ? orderQuantity : "?" }}×</dd>
                </div>
                <div
                  class="flex justify-between gap-4 font-bold border-t-2 border-white/40 pt-2 mt-2"
                >
                  <dt>Total</dt>
                  <dd>
                    {{ validQuantity ? total.toLocaleString() : "?" }} bonus
                    points
                  </dd>
                </div>
              </dl>
            </div>

            <p v-if="error" class="text-red-400">{{ error }}</p>

            <UiButton
              type="submit"
              icon="lucide:shopping-cart"
              :disabled="!!blocker || placing"
              class="w-full justify-center border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{
                placing
                  ? "ordering..."
                  : (blocker ?? `order for ${total.toLocaleString()} bonus points`)
              }}
            </UiButton>
          </form>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
  layout: "app",
});

const inputClass =
  "mt-1 block w-full bg-transparent border-2 border-white/40 focus:border-white outline-none px-3 py-2";

const route = useRoute();
const id = route.params.id as string;
const { refreshPixels } = usePixels();

// Cast so it isn't typed as /api/shop/featured too
const {
  data,
  error: fetchError,
  refresh,
} = await useFetch(`/api/shop/${id}` as `/api/shop/${number}`);
if (fetchError.value) {
  throw createError({
    statusCode: fetchError.value.statusCode ?? 500,
    statusMessage: fetchError.value.statusMessage,
    fatal: true,
  });
}
const item = computed(() => data.value!.item);

// Loaded in the browser, since it asks Hack Club Auth and shouldn't hold up the page
const {
  data: addresses,
  status: addressStatus,
  error: addressFetchError,
  refresh: refreshAddresses,
} = useFetch("/api/me/addresses", {
  server: false,
  lazy: true,
  immediate: !item.value.silly,
});
// "idle" while the page is rendered on the server, before the request starts
const loadingAddresses = computed(() =>
  ["idle", "pending"].includes(addressStatus.value),
);
const needsSignIn = computed(() => addressFetchError.value?.statusCode === 409);
const addressError = computed(() =>
  addressFetchError.value
    ? ((addressFetchError.value.data as { message?: string } | undefined)
        ?.message ??
      "Couldn't load your addresses, try refreshing.")
    : "",
);

const addressId = ref("");
const phoneNumber = ref("");
// The item needs a phone number and the picked address doesn't have one
const needsPhone = computed(
  () =>
    item.value.requirePhone &&
    !item.value.silly &&
    addresses.value?.find((a) => a.id === addressId.value)?.hasPhone === false,
);
// Picks their primary address (sent first), and again if the picked one disappears
watch(
  addresses,
  (list) => {
    if (!list?.some((a) => a.id === addressId.value)) {
      addressId.value = list?.[0]?.id ?? "";
    }
  },
  { immediate: true },
);

const quantity = ref<number | "">(1);
const orderQuantity = computed(() =>
  item.value.showQuantity ? quantity.value : 1,
);
const validQuantity = computed(
  () =>
    Number.isInteger(orderQuantity.value) && (orderQuantity.value as number) >= 1,
);
// What they've picked for each of the item's fields: field ID -> option ID ("" for none).
// Optional fields start on none, required ones on nothing so they have to be picked.
const initialPicks = () =>
  Object.fromEntries(
    item.value.fields.filter((f) => !f.required).map((f) => [f.id, ""]),
  );
const picks = ref<Record<string, string>>(initialPicks());
type Field = (typeof item.value.fields)[number];
// Optional fields get a "none" option, since a picked radio button can't be unpicked
const fieldOptions = (field: Field) =>
  field.required
    ? field.options
    : [{ id: "", label: "None", price: 0 }, ...field.options];
const pickedChoices = computed(() =>
  item.value.fields.flatMap((field) => {
    const option = field.options.find((o) => o.id === picks.value[field.id]);
    return option
      ? [{ fieldId: field.id, field: field.title, option: option.label, price: option.price }]
      : [];
  }),
);
// The ones that cost extra, for the order summary
const pricedChoices = computed(() =>
  pickedChoices.value.filter((c) => c.price > 0),
);
const missingField = computed(() =>
  item.value.fields.find((f) => f.required && !picks.value[f.id]),
);
// Each one costs the item's price plus whatever the picked options add
const unitPrice = computed(
  () => item.value.price + pickedChoices.value.reduce((sum, c) => sum + c.price, 0),
);
const total = computed(() =>
  validQuantity.value ? unitPrice.value * (orderQuantity.value as number) : 0,
);

const limitReached = computed(
  () =>
    item.value.perUserLimit !== null &&
    data.value!.ordered >= item.value.perUserLimit,
);
// The most they could order right now, 0 for no limit
const maxQuantity = computed(() => {
  const limits = [
    item.value.checkoutLimit,
    item.value.stock,
    item.value.perUserLimit !== null
      ? item.value.perUserLimit - data.value!.ordered
      : null,
  ].filter((n) => n !== null);
  return limits.length ? Math.max(0, Math.min(...limits)) : 0;
});

// Why they can't order yet, shown on the button
const blocker = computed(() => {
  if (item.value.stock === 0) return "sold out";
  if (limitReached.value) return "you've already got as many as you can";
  if (!validQuantity.value) return "pick a quantity";
  if (maxQuantity.value && (orderQuantity.value as number) > maxQuantity.value) {
    return `you can order at most ${maxQuantity.value}`;
  }
  if (missingField.value) return `pick an option for ${missingField.value.title}`;
  const short = total.value - data.value!.bonusPoints;
  if (short > 0) return `you need ${short.toLocaleString()} more bonus points`;
  if (!item.value.silly && !addressId.value) return "pick an address";
  if (needsPhone.value && !phoneNumber.value.trim()) return "add a phone number";
  return null;
});

const placing = ref(false);
const error = ref("");
const placed = ref<{ id: number; status: OrderStatus } | null>(null);

async function placeOrder() {
  if (blocker.value) return;
  placing.value = true;
  error.value = "";
  try {
    placed.value = await $fetch(`/api/shop/${id}/order`, {
      method: "POST",
      body: {
        quantity: orderQuantity.value,
        addressId: item.value.silly ? undefined : addressId.value,
        phoneNumber: needsPhone.value ? phoneNumber.value : undefined,
        choices: Object.fromEntries(
          Object.entries(picks.value).filter(([, optionId]) => optionId),
        ),
      },
    });
    quantity.value = 1;
    await Promise.all([refresh(), refreshPixels()]);
    // After the refresh, in case the item's fields changed
    picks.value = initialPicks();
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
    // e.g. the stock or their balance changed since the page loaded
    await refresh();
  } finally {
    placing.value = false;
  }
}
</script>
