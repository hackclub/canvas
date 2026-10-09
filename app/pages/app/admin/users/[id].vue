<template>
  <div class="flex justify-center w-full">
    <div v-if="u" class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin/users"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> all users
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">{{ name }}</h1>
        <dl class="mt-1 opacity-70 space-y-0.5">
          <div v-for="field in ids" :key="field.label" class="flex gap-2">
            <dt>{{ field.label }}:</dt>
            <dd>{{ field.value ?? "none" }}</dd>
          </div>
        </dl>
        <div class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white" @click="openManage">
            manage
          </UiButtonSmall>
        </div>
      </UiCard>

      <dl class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="border-4 border-black p-4"
        >
          <dt class="opacity-70">{{ stat.label }}</dt>
          <dd class="font-bold text-2xl">{{ stat.value }}</dd>
        </div>
      </dl>

      <div class="space-y-2">
        <h2 class="font-bold text-xl">projects</h2>
        <div v-if="u.projects.length" class="grid gap-4 sm:grid-cols-2">
          <NuxtLink
            v-for="project in u.projects"
            :key="project.id"
            :to="`/app/admin/projects/${project.id}`"
            class="no-underline! block border-4 border-black p-5 hover:bg-black hover:text-white transition-colors"
          >
            <h3 class="font-bold text-lg">{{ project.name }}</h3>
            <p class="mt-1 opacity-70 line-clamp-2">
              {{ project.description || "No description yet" }}
            </p>
          </NuxtLink>
        </div>
        <p v-else class="opacity-60 italic">No projects yet.</p>
      </div>

      <AdminNotes :user-id="u.id" />
    </div>
  </div>

  <UiModal v-model="managing" title="manage user">
    <template v-if="!confirmingAdmin">
      <div v-for="b in balances" :key="b.field" class="space-y-2">
        <h3 class="font-bold text-lg">{{ b.label }}</h3>
        <p class="text-sm opacity-70">
          Currently {{ u?.[b.field] }} {{ b.label }}.
        </p>
        <input
          v-model.number="amounts[b.field]"
          type="number"
          min="0"
          step="1"
          :aria-label="`Amount of ${b.label}`"
          class="w-full border-3 border-black px-3 py-1 outline-none"
        />
        <div class="flex flex-wrap gap-2">
          <UiButtonSmall
            icon="lucide:plus"
            :disabled="saving"
            @click="changeBalance(b.field, 'give')"
          >
            give
          </UiButtonSmall>
          <UiButtonSmall
            icon="lucide:minus"
            :disabled="saving"
            @click="changeBalance(b.field, 'take')"
          >
            take
          </UiButtonSmall>
          <UiButtonSmall
            icon="lucide:equal"
            :disabled="saving"
            @click="changeBalance(b.field, 'set')"
          >
            set to
          </UiButtonSmall>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="font-bold text-lg">canvas</h3>
        <UiButtonSmall
          :icon="u?.canvasBanned ? 'lucide:brush' : 'lucide:ban'"
          :disabled="saving"
          @click="update({ canvasBanned: !u?.canvasBanned })"
        >
          {{ u?.canvasBanned ? "let them draw again" : "ban from drawing" }}
        </UiButtonSmall>
        <p class="text-sm opacity-70">
          {{
            u?.canvasBanned
              ? "They're banned from drawing, and can't place pixels."
              : "They'll keep their pixels but can't place any on the canvas."
          }}
        </p>
      </div>

      <div class="space-y-2">
        <h3 class="font-bold text-lg">admin</h3>
        <UiButtonSmall
          :icon="u?.isAdmin ? 'lucide:shield-off' : 'lucide:shield'"
          :disabled="isMe"
          class="disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmingAdmin = true"
        >
          {{ u?.isAdmin ? "remove admin" : "make admin" }}
        </UiButtonSmall>
        <p class="text-sm opacity-70">
          {{
            isMe
              ? "You can't remove your own admin status."
              : "Admin pages update straight away, but the admin bar and navigation only change after they sign in again."
          }}
        </p>
      </div>
    </template>

    <!-- confirm step, shown in place so there's no modal on top of a modal -->
    <template v-else>
      <p>
        <b>{{ name }}</b>
        {{
          u?.isAdmin
            ? "will lose access to the admin panel."
            : "will be able to see every user and project, and change anyone's pixels, bonus points and admin status."
        }}
      </p>
      <div class="flex gap-2">
        <UiButtonSmall :disabled="saving" @click="toggleAdmin">
          {{ u?.isAdmin ? "remove admin" : "make admin" }}
        </UiButtonSmall>
        <UiButtonSmall @click="confirmingAdmin = false">back</UiButtonSmall>
      </div>
    </template>

    <p v-if="saveError" class="text-red-600">{{ saveError }}</p>
  </UiModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const route = useRoute();
const id = route.params.id as string;
const { data: u, error } = await useFetch(
  `/api/admin/users/${encodeURIComponent(id)}`,
);
if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusMessage,
    fatal: true,
  });
}

setAdminSubject(() => u.value && { slackId: u.value.slackId });

const ids = computed(() => [
  { label: "Hack Club Auth ID", value: u.value?.id },
  { label: "Slack ID", value: u.value?.slackId },
  { label: "Hackatime ID", value: u.value?.hackatimeId },
]);

const { user: me } = useUserSession();
const isMe = computed(() => me.value?.id === u.value?.id);

const name = computed(
  () =>
    [u.value?.identity.first_name, u.value?.identity.last_name]
      .filter(Boolean)
      .join(" ") || "(no name)",
);

// The balances admins can change, with what's typed in for each
const balances = [
  { field: "pixels", label: "pixels" },
  { field: "bonusPoints", label: "bonus points" },
] as const;
type Balance = (typeof balances)[number]["field"];
const amounts = reactive<Record<Balance, number>>({ pixels: 0, bonusPoints: 0 });
const saving = ref(false);
const saveError = ref("");
const confirmingAdmin = ref(false);
const managing = ref(false);

function openManage() {
  amounts.pixels = 0;
  amounts.bonusPoints = 0;
  saveError.value = "";
  confirmingAdmin.value = false;
  managing.value = true;
}

type BalanceChange = { op: "set" | "add"; amount: number };

async function update(body: {
  pixels?: BalanceChange;
  bonusPoints?: BalanceChange;
  isAdmin?: boolean;
  canvasBanned?: boolean;
}) {
  saving.value = true;
  saveError.value = "";
  try {
    const updated = await $fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
    Object.assign(u.value!, updated);
    // keep the navbar counter in sync when editing yourself
    if (isMe.value) refreshNuxtData("pixels");
    return true;
  } catch (e) {
    saveError.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
    return false;
  } finally {
    saving.value = false;
  }
}

async function changeBalance(field: Balance, action: "give" | "take" | "set") {
  const amount = amounts[field];
  if (!Number.isInteger(amount) || amount < 0) {
    const { label } = balances.find((b) => b.field === field)!;
    saveError.value = `Enter a whole number of ${label}`;
    return;
  }
  const change: BalanceChange =
    action === "set"
      ? { op: "set", amount }
      : { op: "add", amount: action === "give" ? amount : -amount };
  if (await update({ [field]: change })) amounts[field] = 0;
}

async function toggleAdmin() {
  if (await update({ isAdmin: !u.value?.isAdmin })) {
    confirmingAdmin.value = false;
  }
}

const stats = computed(() => [
  { label: "pixels", value: u.value?.pixels ?? 0 },
  { label: "bonus points", value: u.value?.bonusPoints ?? 0 },
  { label: "admin", value: u.value?.isAdmin ? "yes" : "no" },
  { label: "YSWS eligibility", value: u.value ? eligibilityLabel(u.value) : "" },
  { label: "canvas", value: u.value?.canvasBanned ? "banned" : "allowed" },
  {
    label: "hackatime",
    value: u.value?.hackatimeLinked ? "linked" : "not linked",
  },
]);
</script>
