<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <UiButtonSmall
        v-for="k in kinds"
        :key="k.value"
        :class="k.value === kind ? '' : 'opacity-50 hover:opacity-100'"
        @click="setKind(k.value)"
      >
        {{ k.label }}
      </UiButtonSmall>
    </div>

    <input
      v-model="search"
      placeholder="search by user, admin, message or type"
      class="w-full border-3 border-black px-3 py-2 outline-none"
    />

    <p class="text-sm opacity-70">
      {{ data?.total ?? 0 }} entr{{ data?.total == 1 ? "y" : "ies" }}
    </p>

    <div
      v-if="data?.items.length"
      class="border-4 border-black divide-y-2 divide-black"
    >
      <div v-for="e in data.items" :key="e.id" class="px-4 py-3">
        <p>
          <template v-if="e.kind === 'message'">
            <template v-if="message(e).error">
              <b class="text-red-700">failed to send</b>
            </template>
            <template v-else>sent</template>
            {{ SLACK_MESSAGE_LABELS[message(e).type ?? "custom"] }} to
            <UserLink :user="e.user" />
          </template>
          <template v-else>
            <template v-if="boost(e).enabled">
              turned on double pixels for <UserLink :user="e.user" /> until
              {{ new Date(boost(e).until!).toLocaleString() }}
            </template>
            <template v-else>
              turned off double pixels for <UserLink :user="e.user" />
            </template>
            ({{ boostReasons[boost(e).reason] }})
          </template>
          <template v-if="e.actor">
            — by <UserLink :user="e.actor" />
          </template>
        </p>
        <p
          v-if="e.kind === 'message'"
          class="mt-1 border-l-4 border-black pl-2 text-sm opacity-80 whitespace-pre-wrap break-words"
        >
          {{ message(e).text }}
        </p>
        <p v-if="message(e).error" class="mt-1 text-sm text-red-700">
          {{ message(e).error }}
        </p>
        <p class="text-sm opacity-60">
          {{ new Date(e.createdAt).toLocaleString() }}
        </p>
      </div>
    </div>
    <p v-else class="opacity-60 italic">
      {{ status === "pending" ? "Loading…" : "Nothing found." }}
    </p>

    <AdminAuditPager
      v-if="data"
      v-model="page"
      :total="data.total"
      :page-size="data.pageSize"
    />
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";

const kinds = [
  { value: "all", label: "all" },
  { value: "message", label: "messages" },
  { value: "boost", label: "double pixels" },
] as const;
const kind = ref<(typeof kinds)[number]["value"]>("all");

const { search, q, page } = useAuditSearch();

function setKind(value: typeof kind.value) {
  kind.value = value;
  page.value = 1;
}

const { data, status } = useFetch("/api/admin/audit/bot", {
  query: { q, page, kind },
});

const boostReasons = {
  nudge: "from the nudge",
  paid: "used up by a ship",
  admin: "by an admin",
};

// details is typed as the union of every kind's details, so narrow it by kind
type Details<K extends BotLogEntry["kind"]> = Extract<
  BotLogEntry,
  { kind: K }
>["details"];
type Entry = { kind: BotLogEntry["kind"]; details: BotLogEntry["details"] };
// Empty for boost entries, so `message(e).error` can be checked on any entry
const message = (e: Entry) =>
  e.kind === "message"
    ? (e.details as Details<"message">)
    : ({} as Partial<Details<"message">>);
const boost = (e: Entry) => e.details as Details<"boost">;

interface Person {
  id: string;
  identity: { first_name?: string; last_name?: string };
}

const UserLink = (props: { user: Person | null }) =>
  props.user
    ? h(
        NuxtLink,
        {
          to: `/app/admin/users/${encodeURIComponent(props.user.id)}`,
          class: "font-bold",
        },
        () =>
          [props.user!.identity.first_name, props.user!.identity.last_name]
            .filter(Boolean)
            .join(" ") || props.user!.id,
      )
    : h("span", { class: "italic" }, "a deleted user");
UserLink.props = ["user"];
</script>
