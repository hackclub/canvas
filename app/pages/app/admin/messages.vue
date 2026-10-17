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
        <h1 class="mt-2 font-bold text-3xl">messages</h1>
        <p class="mt-1 opacity-70">
          DM people on Slack from the Canvas bot
        </p>
      </UiCard>

      <form class="space-y-4" @submit.prevent="send">
        <div class="space-y-2">
          <h2 class="font-bold text-xl">message</h2>
          <div class="flex flex-wrap gap-2">
            <UiButtonSmall
              v-for="t in types"
              :key="t.value"
              :class="t.value === type ? '' : 'opacity-50 hover:opacity-100'"
              @click="type = t.value"
            >
              {{ t.label }}
            </UiButtonSmall>
          </div>
          <p v-if="currentType.description" class="text-sm opacity-70">
            {{ currentType.description }}
          </p>
        </div>

        <div v-if="type === 'custom'" class="space-y-2">
          <textarea
            v-model="message"
            rows="6"
            :maxlength="3000"
            placeholder="hiii :D"
            aria-label="Message"
            class="w-full border-3 border-black px-3 py-2 outline-none"
          />
          <p class="text-sm opacity-70">
            Slack formatting: *bold*, _italic_, `code`,
            &lt;https://example.com|link text&gt;.
            {{ message.length }} / 3000
          </p>
        </div>

        <div class="space-y-2">
          <h2 class="font-bold text-xl">send to</h2>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="everyone" type="radio" :value="false" />
              specific people
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="everyone" type="radio" :value="true" />
              everyone
            </label>
          </div>
          <p v-if="everyone" class="text-sm opacity-70">
            Goes to everyone on Slack who hasn't unsubscribed, with an
            unsubscribe button under it. One a second, so it takes a while
            for a lot of people.
          </p>

          <template v-else>
            <div v-if="selected.length" class="flex flex-wrap gap-2">
              <button
                v-for="u in selected"
                :key="u.id"
                type="button"
                class="inline-flex items-center gap-1 bg-black text-white px-2 py-1 text-sm cursor-pointer"
                :aria-label="`Remove ${fullName(u.identity)}`"
                @click="toggle(u.id)"
              >
                {{ fullName(u.identity) }} <Icon name="lucide:x" />
              </button>
            </div>
            <input
              v-model="search"
              placeholder="search by name, ID or Slack ID"
              class="w-full border-3 border-black px-3 py-2 outline-none"
            />
            <div
              v-if="filtered.length"
              class="border-4 border-black divide-y-2 divide-black max-h-96 overflow-y-auto"
            >
              <label
                v-for="u in filtered"
                :key="u.id"
                class="flex items-center gap-3 px-4 py-2"
                :class="
                  u.slackId ? 'cursor-pointer hover:bg-black/5' : 'opacity-50'
                "
              >
                <input
                  type="checkbox"
                  :checked="selectedIds.has(u.id)"
                  :disabled="!u.slackId"
                  @change="toggle(u.id)"
                />
                <span class="min-w-0">
                  <span class="block font-bold truncate">
                    {{ fullName(u.identity) }}
                  </span>
                  <span class="block text-sm opacity-60 truncate">
                    {{ u.slackId ?? "no Slack ID, can't be messaged" }}
                  </span>
                </span>
              </label>
            </div>
            <p v-else class="opacity-60 italic">No users found.</p>
          </template>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UiButtonSmall
            type="submit"
            icon="lucide:send"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="
              sending ||
              (type === 'custom' && !message.trim()) ||
              (!everyone && !selected.length)
            "
          >
            {{
              sending
                ? "sending..."
                : everyone
                  ? "send to everyone"
                  : `send to ${selected.length} ${selected.length == 1 ? "person" : "people"}`
            }}
          </UiButtonSmall>
          <p v-if="result" class="font-bold">{{ result }}</p>
          <p v-if="error" class="text-red-600">{{ error }}</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const { data: users } = await useFetch("/api/admin/users");

const types: { value: SlackMessageType; label: string; description: string }[] =
  [
    { value: "custom", label: "custom", description: "" },
    {
      value: "welcome",
      label: "welcome",
      description:
        "The DM people get 30 minutes after signing up, with their referral link.",
    },
    {
      value: "nudge",
      label: "double pixels nudge",
      description:
        "Turns on their double pixels deal until the end of the day after tomorrow and DMs them about it, linking their latest project. Doesn't check if they've coded. People without a project are skipped.",
    },
    {
      value: "shipApproved",
      label: "ship approved",
      description:
        "About their latest approved ship, with what it paid. People without one are skipped.",
    },
    {
      value: "shipRejected",
      label: "ship rejected",
      description:
        "About their latest rejected ship, with its reason. People without one are skipped.",
    },
  ];
const type = ref<SlackMessageType>("custom");
const currentType = computed(() => types.find((t) => t.value === type.value)!);

const message = ref("");
const everyone = ref(false);
const search = ref("");
const selectedIds = ref(new Set<string>());

const selected = computed(() =>
  (users.value ?? []).filter((u) => selectedIds.value.has(u.id)),
);
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (users.value ?? []).filter(
    (u) =>
      !q ||
      u.id.toLowerCase().includes(q) ||
      u.slackId?.toLowerCase().includes(q) ||
      fullName(u.identity).toLowerCase().includes(q),
  );
});

function toggle(id: string) {
  const next = new Set(selectedIds.value);
  if (!next.delete(id)) next.add(id);
  selectedIds.value = next;
}

function fullName(identity: { first_name?: string; last_name?: string }) {
  return (
    [identity.first_name, identity.last_name].filter(Boolean).join(" ") ||
    "(no name)"
  );
}

const sending = ref(false);
const result = ref("");
const error = ref("");

async function send() {
  if (
    everyone.value &&
    !confirm("Send this to everyone on Canvas? This can't be undone.")
  )
    return;
  sending.value = true;
  result.value = "";
  error.value = "";
  try {
    const { recipients } = await $fetch("/api/admin/messages", {
      method: "POST",
      body: {
        type: type.value,
        message: message.value,
        ...(everyone.value
          ? { everyone: true }
          : { userIds: [...selectedIds.value] }),
      },
    });
    result.value = `sending to ${recipients} ${recipients == 1 ? "person" : "people"}, about one a second! see the bot audit log for how it went`;
    message.value = "";
    selectedIds.value = new Set();
  } catch (e) {
    error.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    sending.value = false;
  }
}
</script>
