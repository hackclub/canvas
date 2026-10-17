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
          >. Approving pays them for the hours since their last approved ship.
          Try the demo and check the project works before approving it. The
          project is locked until you review it.
        </p>
        <div class="border-3 border-black">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center justify-between px-3 py-2 font-semibold"
            :aria-expanded="submitterOpen"
            @click="toggleSubmitter"
          >
            submitter's personal details
            <Icon
              name="lucide:chevron-down"
              :class="{ 'rotate-180': submitterOpen }"
              class="transition-transform"
            />
          </button>
          <div v-if="submitterOpen" class="space-y-3 px-3 pb-3">
            <p v-if="submitterStatus === 'pending'" class="opacity-70">
              Loading from Hack Club Auth...
            </p>
            <p v-else-if="submitterError" class="text-red-600">
              {{
                submitterError.statusMessage ??
                "Couldn't load their details, try again!"
              }}
            </p>
            <template v-else-if="submitter">
              <p class="text-sm opacity-70">
                What gets sent to Airtable when you approve.
              </p>
              <dl class="space-y-1">
                <div
                  v-for="field in submitterFields"
                  :key="field.label"
                  class="flex gap-2"
                >
                  <dt class="opacity-70 shrink-0">{{ field.label }}:</dt>
                  <dd v-if="field.value" class="min-w-0 break-words">
                    {{ field.value }}
                  </dd>
                  <dd v-else class="opacity-40 italic">none</dd>
                </div>
              </dl>
              <AdminAddress
                v-if="submitter.address"
                :address="submitter.address"
                title="address"
              />
              <p v-else class="opacity-60 italic">No address on file.</p>
            </template>
          </div>
        </div>
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
          <input
            v-model="cooking"
            type="checkbox"
            class="size-5 accent-black"
          />
          cooking
          <span class="font-normal opacity-70"
            >(pays 1.2x the pixels for this ship)</span
          >
        </label>
        <div class="space-y-3 border-t-2 border-black pt-3">
          <h3 class="font-bold">justification for the spot-checkers</h3>
          <p class="text-sm opacity-70">
            Sent to Airtable when you approve. Leave blank what doesn't apply.
          </p>
          <div>
            <label for="ship-hours" class="font-semibold">Hours</label>
            <span class="opacity-70">
              ({{ originalHours ?? "unknown" }} hours)
            </span>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <input
                id="ship-hours"
                v-model="justification.overrideHours"
                type="number"
                min="0"
                max="1000"
                step="0.01"
                class="block w-40 border-3 border-black px-3 py-2 outline-none"
              />
              <UiButtonSmall
                v-if="originalHours !== null && deflatePercent === null"
                icon="lucide:trending-down"
                @click="deflatePercent = ''"
              >
                deflate
              </UiButtonSmall>
              <label
                v-if="deflatePercent !== null"
                class="flex items-center gap-1"
              >
                by
                <input
                  v-model="deflatePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  class="block w-20 border-3 border-black px-3 py-2 outline-none"
                />
                %
              </label>
            </div>
            <p class="mt-1 text-sm opacity-70">
              This ship is paid for these hours, and they're sent to Airtable.
              Needed to approve.
            </p>
          </div>
          <label class="block">
            <span class="font-semibold">Specific technical features</span>
            <span class="opacity-70"> (what justifies the hours spent)</span>
            <textarea
              v-model="justification.specialTechnicalFeatures"
              rows="2"
              maxlength="5000"
              class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none"
            />
          </label>
          <label v-if="deflated" class="block">
            <span class="font-semibold">Deflation justification</span>
            <span class="opacity-70"> (why the hours were lowered)</span>
            <textarea
              v-model="justification.deflationJustification"
              rows="2"
              maxlength="5000"
              class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none"
            />
          </label>
          <div>
            <label for="additional-justification" class="font-semibold">
              Additional justification
            </label>
            <span class="opacity-70">
              ({{
                editingAdditional
                  ? "edited by you"
                  : "generated from the project's data"
              }},
              <button
                type="button"
                class="underline cursor-pointer"
                @click="toggleAdditional"
              >
                {{ editingAdditional ? "autogenerate" : "edit" }}</button
              >)
            </span>
            <textarea
              id="additional-justification"
              :value="
                editingAdditional
                  ? justification.additionalJustification
                  : additionalTemplate
              "
              :readonly="!editingAdditional"
              rows="8"
              maxlength="5000"
              class="mt-1 block w-full border-3 border-black px-3 py-2 outline-none read-only:opacity-70"
              @input="
                justification.additionalJustification = (
                  $event.target as HTMLTextAreaElement
                ).value
              "
            />
          </div>
        </div>
        <p v-if="reviewError" class="text-red-600">{{ reviewError }}</p>
        <div class="flex gap-2">
          <UiButtonSmall
            icon="lucide:check"
            class="disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="reviewing || justification.overrideHours === ''"
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
            <b v-if="ship.cooking">cooking · </b>paid
            {{ ship.pixelsAwarded.toLocaleString() }} pixels and
            {{ ship.bonusPointsAwarded?.toLocaleString() }} bonus
            points<template v-if="ship.hackatimeSeconds !== null">
              for {{ formatHours(ship.hackatimeSeconds) }} hours total</template
            >
          </p>
          <p
            v-if="ship.justification?.overrideHours != null"
            class="text-sm opacity-70"
          >
            reviewed as {{ ship.justification.overrideHours }} hours
          </p>
          <p v-if="ship.feedback" class="mt-1 whitespace-pre-wrap">
            {{ ship.feedback }}
          </p>
        </div>
      </div>

      <AdminNotes :project-id="project.id" />
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

function roundHours(hours: number) {
  return Math.round(hours * 100) / 100;
}

// The hours each paid ship was paid for, like payShip: the reviewer's hours, else its
// Hackatime time since the project's previous paid ship
const paidHours = computed(() => {
  const paid = new Map<number, number>();
  let previous = 0;
  for (const ship of [...(project.value?.ships ?? [])].reverse()) {
    if (ship.pixelsAwarded === null) continue;
    const seconds = ship.hackatimeSeconds ?? previous;
    paid.set(
      ship.id,
      ship.justification?.overrideHours ??
        roundHours(Math.max(0, seconds - previous) / 3600),
    );
    previous = Math.max(previous, seconds);
  }
  return { paid, previousSeconds: previous };
});

// The pending ship's Hackatime hours since the last paid ship, null for ships from before
// Hackatime time was saved when shipping
const originalHours = computed(() => {
  const seconds = pendingShip.value?.hackatimeSeconds;
  if (seconds == null) return null;
  return roundHours(
    Math.max(0, seconds - paidHours.value.previousSeconds) / 3600,
  );
});

// The owner's personal details, only requested once a reviewer opens them
const submitterOpen = ref(false);
const {
  data: submitter,
  status: submitterStatus,
  error: submitterError,
  execute: loadSubmitter,
} = useFetch(`/api/admin/projects/${id}/submitter`, {
  immediate: false,
  server: false,
});
function toggleSubmitter() {
  submitterOpen.value = !submitterOpen.value;
  // Retries on reopen if it failed
  if (
    submitterOpen.value &&
    (submitterStatus.value === "idle" || submitterStatus.value === "error")
  ) {
    loadSubmitter();
  }
}
const submitterFields = computed(() => {
  const s = submitter.value;
  if (!s) return [];
  return [
    { label: "First name", value: s.firstName },
    { label: "Last name", value: s.lastName },
    { label: "Birthday", value: s.birthday },
    { label: "GitHub username", value: s.githubUsername },
  ];
});

const feedback = ref("");
const cooking = ref(false);
const justification = reactive({
  overrideHours: "" as number | "",
  specialTechnicalFeatures: "",
  deflationJustification: "",
  additionalJustification: "",
});
// The percentage to take off the original hours, null until "deflate" is clicked
const deflatePercent = ref<number | "" | null>(null);
// Once edited, the additional justification stops following the template
const editingAdditional = ref(false);

function resetReview() {
  feedback.value = "";
  cooking.value = false;
  deflatePercent.value = null;
  editingAdditional.value = false;
  Object.assign(justification, {
    overrideHours: originalHours.value ?? "",
    specialTechnicalFeatures: "",
    deflationJustification: "",
    additionalJustification: "",
  });
}
watch(() => pendingShip.value?.id, resetReview, { immediate: true });

watch(deflatePercent, (percent) => {
  if (percent === null || percent === "" || originalHours.value === null) {
    return;
  }
  const clamped = Math.min(100, Math.max(0, percent));
  justification.overrideHours = roundHours(
    (originalHours.value * (100 - clamped)) / 100,
  );
});

const deflated = computed(
  () =>
    originalHours.value !== null &&
    justification.overrideHours !== "" &&
    justification.overrideHours < originalHours.value,
);

const { user: me } = useUserSession();

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US");
}

// A summary of the project for the spot-checkers, the same shape for every ship
const additionalTemplate = computed(() => {
  const p = project.value;
  const ship = pendingShip.value;
  if (!p || !ship) return "";
  const hours = justification.overrideHours;
  const lines: string[] = [];

  lines.push(
    `Reviewed on Canvas by ${me.value ? personName({ id: me.value.id, identity: me.value }) : "an admin"} on ${formatDate(new Date())}.`,
  );
  lines.push(`Shipped on ${formatDate(ship.createdAt)}.`);
  lines.push(
    ship.hackatimeSeconds !== null
      ? `Hackatime: ${formatHours(ship.hackatimeSeconds)} hours total on ${p.hackatimeProjects.join(", ") || "no projects"}, ${originalHours.value} hours since the last approved ship.`
      : "Hackatime: hours weren't recorded when this was shipped.",
  );
  if (hours !== "") {
    let paidFor = `Paid for ${hours} hours`;
    if (deflated.value) {
      const percent = Math.round((1 - hours / originalHours.value!) * 100);
      paidFor += ` (deflated ${percent}% from ${originalHours.value} hours)`;
    } else if (originalHours.value !== null && hours > originalHours.value) {
      paidFor += ` (raised from ${originalHours.value} hours)`;
    }
    lines.push(`${paidFor}.`);
  }
  if (cooking.value) lines.push("Marked as cooking (1.2x pixels).");
  lines.push(`Existed before Canvas: ${p.preexisting ? "yes" : "no"}.`);
  lines.push(`Self-reported AI usage: ${p.aiUsage.trim() || "none"}`);

  const past = reviewedShips.value;
  if (!past.length) {
    lines.push("", "First ship of this project.");
  } else {
    lines.push("", `Past ships (${past.length}):`);
    for (const s of [...past].reverse()) {
      const reviewer = s.reviewer ? personName(s.reviewer) : "a deleted admin";
      let line = `- Shipped ${formatDate(s.createdAt)}, ${s.status} by ${reviewer}`;
      if (s.reviewedAt) line += ` on ${formatDate(s.reviewedAt)}`;
      const paid = paidHours.value.paid.get(s.id);
      if (s.pixelsAwarded !== null) {
        line += `, paid ${s.pixelsAwarded} pixels and ${s.bonusPointsAwarded ?? 0} bonus points for ${paid} hours`;
        if (s.cooking) line += " (cooking)";
      }
      lines.push(`${line}.`);
    }
  }
  return lines.join("\n");
});

function toggleAdditional() {
  if (!editingAdditional.value) {
    justification.additionalJustification = additionalTemplate.value;
  }
  editingAdditional.value = !editingAdditional.value;
}

const reviewing = ref(false);
const reviewError = ref("");

async function review(status: "approved" | "rejected") {
  reviewing.value = true;
  reviewError.value = "";
  try {
    await $fetch(`/api/admin/ships/${pendingShip.value!.id}`, {
      method: "PATCH",
      body: {
        status,
        feedback: feedback.value,
        cooking: cooking.value,
        justification: {
          overrideHours: justification.overrideHours,
          specialTechnicalFeatures: justification.specialTechnicalFeatures,
          deflationJustification: deflated.value
            ? justification.deflationJustification
            : "",
          additionalJustification: editingAdditional.value
            ? justification.additionalJustification
            : additionalTemplate.value,
        },
      },
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
