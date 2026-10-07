<template>
  <div class="flex justify-center w-full">
    <div v-if="project" class="max-w-full w-250 px-4 md:px-8 py-3 space-y-4">
      <UiCard>
        <NuxtLink
          to="/app/admin/projects"
          class="no-underline! inline-flex items-center gap-1 opacity-70 hover:opacity-100"
        >
          <Icon name="lucide:arrow-left" /> all projects
        </NuxtLink>
        <h1 class="mt-2 font-bold text-3xl">{{ project.name }}</h1>
        <p class="mt-1 opacity-70">
          by
          <NuxtLink
            :to="`/app/admin/users/${encodeURIComponent(project.owner.id)}`"
            >{{ ownerName }}</NuxtLink
          >
        </p>
        <div v-if="latestShip" class="absolute top-8 right-8">
          <UiButtonSmall class="border-3 border-white" @click="openManage">
            manage
          </UiButtonSmall>
        </div>
      </UiCard>

      <div v-if="pendingShip" class="border-4 border-black p-5 space-y-3">
        <h2 class="flex items-center gap-2 font-bold text-xl">
          <Icon name="lucide:rocket" /> shipped, waiting for review
        </h2>
        <p class="opacity-70">
          Shipped {{ new Date(pendingShip.createdAt).toLocaleString()
          }}<template v-if="pendingShip.hackatimeSeconds !== null">
            with {{ formatHours(pendingShip.hackatimeSeconds) }} hours</template
          >. Approving pays them for the hours since their last approved
          ship. Try
          the demo and check the project works before approving it. The project
          is locked until you review it.
        </p>
        <label class="block">
          <span class="font-semibold">Feedback</span>
          <span class="opacity-70"> (shown to them, needed to reject)</span>
          <textarea
            v-model="feedback"
            rows="3"
            maxlength="5000"
            class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none"
          />
        </label>
        <label class="flex items-center gap-2 font-semibold">
          <input v-model="cooking" type="checkbox" class="size-5 accent-black" />
          cooking
          <span class="font-normal opacity-70">(pays 1.2x the pixels for this ship)</span>
        </label>
        <div class="space-y-3 border-t-2 border-black pt-3">
          <h3 class="font-bold">justification for the spot-checkers</h3>
          <p class="text-sm opacity-70">
            Sent to Airtable when you approve. Leave blank what doesn't apply.
          </p>
          <label class="block">
            <span class="font-semibold">Override hours</span>
            <span class="opacity-70">
              (instead of {{ pendingShip.hackatimeSeconds !== null ? formatHours(pendingShip.hackatimeSeconds) : "Hackatime's" }} hours; this ship is paid for these hours, and they're sent to Airtable)
            </span>
            <input
              v-model="justification.overrideHours"
              type="number"
              min="0"
              max="1000"
              step="0.01"
              class="mt-1 block w-40 border-3 border-black px-3 py-2 outline-none"
            />
          </label>
          <label
            v-for="f in justificationFields"
            :key="f.key"
            class="block"
          >
            <span class="font-semibold">{{ f.label }}</span>
            <span v-if="f.hint" class="opacity-70"> ({{ f.hint }})</span>
            <textarea
              v-model="justification[f.key]"
              rows="2"
              maxlength="5000"
              class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none"
            />
          </label>
        </div>
        <p v-if="reviewError" class="text-red-600">{{ reviewError }}</p>
        <div class="flex gap-2">
          <UiButtonSmall
            icon="lucide:check"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="reviewing || (justification.overrideHours !== '' && !justification.overrideHoursJustification.trim())"
            @click="review('approved')"
          >
            approve
          </UiButtonSmall>
          <UiButtonSmall
            icon="lucide:x"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="reviewing || !feedback.trim()"
            @click="review('rejected')"
          >
            reject
          </UiButtonSmall>
        </div>
      </div>

      <img
        v-if="project.bannerKey"
        :src="`/images/${project.bannerKey}`"
        alt=""
        class="h-51 w-full object-cover border-4 border-black"
      />

      <dl class="border-4 border-black divide-y-2 divide-black">
        <div
          v-for="field in fields"
          :key="field.label"
          class="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]"
        >
          <dt class="font-semibold">{{ field.label }}</dt>
          <dd class="whitespace-pre-wrap break-words">
            <NuxtLink
              v-if="field.link && field.value"
              :to="field.value"
              external
            >
              {{ field.value }}
            </NuxtLink>
            <span v-else-if="field.value">{{ field.value }}</span>
            <span v-else class="opacity-60 italic">none</span>
          </dd>
        </div>
      </dl>

      <div v-if="reviewedShips.length" class="border-4 border-black">
        <h2 class="px-4 py-3 font-bold text-xl border-b-2 border-black">
          past ships
        </h2>
        <div
          v-for="ship in reviewedShips"
          :key="ship.id"
          class="px-4 py-3 border-b-2 border-black last:border-b-0"
        >
          <p>
            <b>{{ ship.status }}</b>
            <span class="opacity-70">
              by
              {{
                ship.reviewer ? personName(ship.reviewer) : "a deleted admin"
              }}
              · {{ new Date(ship.reviewedAt!).toLocaleString() }} (shipped
              {{ new Date(ship.createdAt).toLocaleString() }})
            </span>
          </p>
          <p v-if="ship.pixelsAwarded !== null" class="text-sm opacity-70">
            <b v-if="ship.cooking">cooking · </b>paid {{ ship.pixelsAwarded.toLocaleString() }} pixels and
            {{ ship.bonusPointsAwarded?.toLocaleString() }} bonus points<template
              v-if="ship.hackatimeSeconds !== null"
            >
              for {{ formatHours(ship.hackatimeSeconds) }} hours total</template
            >
          </p>
          <p v-if="ship.justification?.overrideHours != null" class="text-sm opacity-70">
            hours overridden to {{ ship.justification.overrideHours }}: {{ ship.justification.overrideHoursJustification }}
          </p>
          <p v-if="ship.feedback" class="mt-1 whitespace-pre-wrap">
            {{ ship.feedback }}
          </p>
        </div>
      </div>
    </div>
  </div>

  <UiModal v-model="managing" title="manage project">
    <template v-if="!overrideTo">
      <div class="space-y-2">
        <h3 class="font-bold text-lg">ship status</h3>
        <p class="text-sm opacity-70">
          The latest ship is <b>{{ latestShip?.status }}</b
          >, shipped
          {{ latestShip && new Date(latestShip.createdAt).toLocaleString() }}.
        </p>
        <div class="flex flex-wrap gap-2">
          <UiButtonSmall
            v-for="option in statusOptions"
            :key="option.status"
            :icon="option.icon"
            :disabled="latestShip?.status === option.status"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            @click="chooseOverride(option.status)"
          >
            {{ option.label }}
          </UiButtonSmall>
        </div>
        <p class="text-sm opacity-70">
          Overrides the latest ship's status, e.g. to undo a mistaken review.
        </p>
      </div>
    </template>

    <!-- confirm step, shown in place so there's no modal on top of a modal -->
    <template v-else>
      <p>
        <b>{{ project?.name }}</b>
        {{ overrideEffects[overrideTo] }}
      </p>
      <label class="block">
        <span class="font-semibold">Feedback</span>
        <span class="opacity-70">
          (shown to them{{
            overrideTo === "rejected" ? ", needed to reject" : ""
          }})
        </span>
        <textarea
          v-model="overrideFeedback"
          rows="3"
          maxlength="5000"
          class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none"
        />
      </label>
      <div class="flex gap-2">
        <UiButtonSmall
          class="disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="
            overriding ||
            (overrideTo === 'rejected' && !overrideFeedback.trim())
          "
          @click="saveOverride"
        >
          {{ overriding ? "saving..." : `set to ${overrideTo}` }}
        </UiButtonSmall>
        <UiButtonSmall @click="overrideTo = null">back</UiButtonSmall>
      </div>
    </template>

    <p v-if="overrideError" class="text-red-600">{{ overrideError }}</p>
  </UiModal>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "app",
});

const route = useRoute();
const id = route.params.id as string;
const {
  data: project,
  error,
  refresh,
} = await useFetch(`/api/admin/projects/${id}`);
if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: error.value.statusMessage,
    fatal: true,
  });
}

setAdminSubject(
  () =>
    project.value && {
      slackId: project.value.owner.slackId,
      project: {
        hackatimeId: project.value.owner.hackatimeId,
        hackatimeProjects: project.value.hackatimeProjects,
      },
    },
);

function personName(person: {
  id: string;
  identity: { first_name?: string; last_name?: string };
}) {
  return (
    [person.identity.first_name, person.identity.last_name]
      .filter(Boolean)
      .join(" ") || person.id
  );
}

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

const ownerName = computed(
  () => project.value && personName(project.value.owner),
);

const pendingShip = computed(() =>
  project.value?.ships.find((s) => s.status === "pending"),
);
const reviewedShips = computed(
  () => project.value?.ships.filter((s) => s.status !== "pending") ?? [],
);

const feedback = ref("");
const cooking = ref(false);
const justification = reactive({
  overrideHours: "" as number | "",
  overrideHoursJustification: "",
  specialTechnicalFeatures: "",
  deflationJustification: "",
  additionalJustification: "",
});
const justificationFields = [
  {
    key: "overrideHoursJustification",
    label: "Override hours justification",
    hint: "required if you override the hours",
  },
  {
    key: "specialTechnicalFeatures",
    label: "Special technical features",
    hint: "what justifies the hours spent",
  },
  {
    key: "deflationJustification",
    label: "Deflation justification",
    hint: "why the hours were lowered, if they were",
  },
  {
    key: "additionalJustification",
    label: "Additional justification",
    hint: "anything else for the spot-checker",
  },
] as const;
const reviewing = ref(false);
const reviewError = ref("");

async function review(status: "approved" | "rejected") {
  reviewing.value = true;
  reviewError.value = "";
  try {
    await $fetch(`/api/admin/ships/${pendingShip.value!.id}`, {
      method: "PATCH",
      body: { status, feedback: feedback.value, cooking: cooking.value, justification },
    });
    feedback.value = "";
    cooking.value = false;
    Object.assign(justification, {
      overrideHours: "",
      overrideHoursJustification: "",
      specialTechnicalFeatures: "",
      deflationJustification: "",
      additionalJustification: "",
    });
    await refresh();
  } catch (e) {
    reviewError.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    reviewing.value = false;
  }
}

type ShipStatus = "pending" | "approved" | "rejected";

const latestShip = computed(() => project.value?.ships[0]);

const statusOptions: { status: ShipStatus; label: string; icon: string }[] = [
  { status: "pending", label: "pending", icon: "lucide:hourglass" },
  { status: "approved", label: "approved", icon: "lucide:check" },
  { status: "rejected", label: "rejected", icon: "lucide:x" },
];
const overrideEffects: Record<ShipStatus, string> = {
  pending:
    "will go back in the review queue, and its owner won't be able to edit it until it's reviewed again.",
  approved:
    "will be marked as approved. Its owner can edit it and ship it again.",
  rejected:
    "will be marked as rejected. Its owner can edit it and ship it again.",
};

const managing = ref(false);
const overrideTo = ref<ShipStatus | null>(null);
const overrideFeedback = ref("");
const overriding = ref(false);
const overrideError = ref("");

function openManage() {
  overrideTo.value = null;
  overrideError.value = "";
  managing.value = true;
}

function chooseOverride(status: ShipStatus) {
  overrideTo.value = status;
  overrideFeedback.value = latestShip.value?.feedback ?? "";
  overrideError.value = "";
}

async function saveOverride() {
  overriding.value = true;
  overrideError.value = "";
  try {
    await $fetch(`/api/admin/ships/${latestShip.value!.id}`, {
      method: "PATCH",
      body: {
        status: overrideTo.value,
        feedback: overrideFeedback.value,
        override: true,
      },
    });
    await refresh();
    managing.value = false;
  } catch (e) {
    overrideError.value =
      (e as { data?: { message?: string } }).data?.message ??
      "Something went wrong, try again!";
  } finally {
    overriding.value = false;
  }
}

const fields = computed(() => {
  const p = project.value;
  if (!p) return [];
  return [
    { label: "Description", value: p.description },
    { label: "Hackatime projects", value: p.hackatimeProjects.join(", ") },
    { label: "AI usage", value: p.aiUsage },
    { label: "Preexisting", value: p.preexisting ? "yes" : "no" },
    { label: "Demo URL", value: p.demoUrl, link: true },
    { label: "GitHub URL", value: p.repoUrl, link: true },
    { label: "Created", value: new Date(p.createdAt).toLocaleString() },
    { label: "Updated", value: new Date(p.updatedAt).toLocaleString() },
  ];
});
</script>
