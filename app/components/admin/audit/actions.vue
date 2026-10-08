<template>
  <div class="space-y-4">
    <input
      v-model="search"
      placeholder="search by admin, user, project, action or feedback"
      class="w-full border-3 border-black px-3 py-2 outline-none"
    />

    <p class="text-sm opacity-70">
      {{ data?.total ?? 0 }} action{{ data?.total == 1 ? "" : "s" }}
    </p>

    <div
      v-if="data?.items.length"
      class="border-4 border-black divide-y-2 divide-black"
    >
      <div v-for="a in data.items" :key="a.id" class="px-4 py-3">
        <p>
          <NuxtLink
            v-if="a.admin"
            :to="`/app/admin/users/${encodeURIComponent(a.admin.id)}`"
            class="font-bold"
          >
            {{ userName(a.admin) }}
          </NuxtLink>
          <span v-else class="italic">a deleted admin</span>

          <template v-if="a.action === 'user.pixels'">
            <template v-if="balanceChange(a).op === 'set'">
              set the pixels of <UserLink :user="a.target" /> to
              {{ balanceChange(a).after.toLocaleString() }} (was
              {{ balanceChange(a).before.toLocaleString() }})
            </template>
            <template v-else-if="balanceChange(a).amount >= 0">
              gave {{ balanceChange(a).amount.toLocaleString() }} pixels to
              <UserLink :user="a.target" />
            </template>
            <template v-else>
              took {{ (-balanceChange(a).amount).toLocaleString() }} pixels from
              <UserLink :user="a.target" />
            </template>
          </template>

          <template v-else-if="a.action === 'user.bonusPoints'">
            <template v-if="balanceChange(a).op === 'set'">
              set the bonus points of <UserLink :user="a.target" /> to
              {{ balanceChange(a).after.toLocaleString() }} (was
              {{ balanceChange(a).before.toLocaleString() }})
            </template>
            <template v-else-if="balanceChange(a).amount >= 0">
              gave {{ balanceChange(a).amount.toLocaleString() }} bonus points to
              <UserLink :user="a.target" />
            </template>
            <template v-else>
              took {{ (-balanceChange(a).amount).toLocaleString() }} bonus points
              from <UserLink :user="a.target" />
            </template>
          </template>

          <template v-else-if="a.action === 'user.canvasBan'">
            <template v-if="canvasBan(a).banned">
              banned <UserLink :user="a.target" /> from drawing on the canvas
            </template>
            <template v-else>
              let <UserLink :user="a.target" /> draw on the canvas again
            </template>
          </template>

          <template v-else-if="a.action === 'user.admin'">
            <template v-if="adminChange(a).isAdmin">
              made <UserLink :user="a.target" /> an admin
            </template>
            <template v-else>
              removed admin from <UserLink :user="a.target" />
            </template>
          </template>

          <template v-else-if="a.action === 'ship.review'">
            {{ review(a).status }} a ship of <ProjectLink :project="a.project" />
            by <UserLink :user="a.target" />
          </template>

          <template v-else-if="a.action === 'ship.override'">
            changed a ship of <ProjectLink :project="a.project" /> by
            <UserLink :user="a.target" /> from {{ override(a).from }} to
            {{ override(a).to }}
          </template>

          <template v-else-if="a.action === 'shop.create'">
            added <ShopItemLink :item="shopItem(a)" /> to the shop
          </template>

          <template v-else-if="a.action === 'shop.update'">
            changed the {{ shopUpdate(a).changes.join(", ") }} of
            <ShopItemLink :item="shopItem(a)" />
          </template>

          <template v-else-if="a.action === 'shop.delete'">
            removed <b>{{ shopItem(a).name }}</b> from the shop
          </template>

          <template v-else> did {{ a.action }}</template>
        </p>
        <p
          v-if="feedback(a)"
          class="mt-1 border-l-4 border-black pl-2 text-sm opacity-80 whitespace-pre-wrap"
        >
          {{ feedback(a) }}
        </p>
        <p class="text-sm opacity-60">
          {{ new Date(a.createdAt).toLocaleString() }}
        </p>
      </div>
    </div>
    <p v-else class="opacity-60 italic">
      {{ status === "pending" ? "Loading…" : "No admin actions found." }}
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

const { search, q, page } = useAuditSearch();

const { data, status } = useFetch("/api/admin/audit/actions", {
  query: { q, page },
});

interface Person {
  id: string;
  identity: { first_name?: string; last_name?: string };
}

function userName(u: Person) {
  return (
    [u.identity.first_name, u.identity.last_name].filter(Boolean).join(" ") ||
    u.id
  );
}

// details is typed as the union of every action's details, so narrow it by action
type Details<A extends AdminAction["action"]> = Extract<
  AdminAction,
  { action: A }
>["details"];
type Entry = { details: AdminAction["details"] };
// Pixel and bonus point changes have the same details
const balanceChange = (a: Entry) => a.details as Details<"user.pixels">;
const canvasBan = (a: Entry) => a.details as Details<"user.canvasBan">;
const adminChange = (a: Entry) => a.details as Details<"user.admin">;
const review = (a: Entry) => a.details as Details<"ship.review">;
const override = (a: Entry) => a.details as Details<"ship.override">;
const shopItem = (a: Entry) => a.details as Details<"shop.create">;
const shopUpdate = (a: Entry) => a.details as Details<"shop.update">;
const feedback = (a: Entry) =>
  "feedback" in a.details ? a.details.feedback : "";

// Links to a user or project in the admin panel, or says it's been deleted
const UserLink = (props: { user: Person | null }) =>
  props.user
    ? h(
        NuxtLink,
        {
          to: `/app/admin/users/${encodeURIComponent(props.user.id)}`,
          class: "font-bold",
        },
        () => userName(props.user!),
      )
    : h("span", { class: "italic" }, "a deleted user");
UserLink.props = ["user"];

const ProjectLink = (props: { project: { id: number; name: string } | null }) =>
  props.project
    ? h(
        NuxtLink,
        { to: `/app/admin/projects/${props.project.id}`, class: "font-bold" },
        () => props.project!.name,
      )
    : h("span", { class: "italic" }, "a deleted project");
ProjectLink.props = ["project"];

// The item's name as it was then, linking to the item as it is now
const ShopItemLink = (props: { item: { itemId: number; name: string } }) =>
  h(
    NuxtLink,
    { to: `/app/admin/shop/${props.item.itemId}`, class: "font-bold" },
    () => props.item.name,
  );
ShopItemLink.props = ["item"];
</script>
