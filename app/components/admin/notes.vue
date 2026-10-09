<template>
  <div class="space-y-2">
    <h2 class="flex items-center gap-2 font-bold text-xl">
      <Icon name="lucide:notebook-pen" /> internal notes
    </h2>
    <p class="text-sm opacity-70">Only admins can see these.</p>
    <form class="space-y-2" @submit.prevent="add">
      <textarea
        v-model="draft"
        rows="3"
        maxlength="5000"
        placeholder="Leave a note for other admins"
        aria-label="New note"
        class="block w-full border-3 border-black px-3 py-2 outline-none"
      />
      <UiButtonSmall
        type="submit"
        icon="lucide:plus"
        class="disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="saving || !draft.trim()"
      >
        {{ saving ? "adding..." : "add note" }}
      </UiButtonSmall>
    </form>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <ul v-if="notes?.length" class="space-y-2">
      <li
        v-for="note in notes"
        :key="note.id"
        class="border-4 border-black p-3"
      >
        <div class="flex items-start justify-between gap-2 text-sm opacity-70">
          <span>
            {{ authorName(note.author) }} ·
            {{ new Date(note.createdAt).toLocaleString() }}
          </span>
          <button
            type="button"
            aria-label="Delete note"
            class="flex cursor-pointer hover:opacity-100"
            @click="remove(note.id)"
          >
            <Icon name="lucide:trash-2" :size="16" />
          </button>
        </div>
        <p class="mt-1 whitespace-pre-wrap">{{ note.body }}</p>
      </li>
    </ul>
    <p v-else class="opacity-60 italic">No notes yet.</p>
  </div>
</template>

<script setup lang="ts">
// Exactly one of these
const props = defineProps<{ userId?: string; projectId?: number }>();

const target = computed(() =>
  props.userId ? { userId: props.userId } : { projectId: props.projectId },
);
const { data: notes, refresh } = await useFetch("/api/admin/notes", {
  query: target,
});

const draft = ref("");
const saving = ref(false);
const error = ref("");

function authorName(author: { identity: { first_name?: string; last_name?: string } } | null) {
  if (!author) return "(deleted admin)";
  return (
    [author.identity.first_name, author.identity.last_name]
      .filter(Boolean)
      .join(" ") || "(no name)"
  );
}

function errorMessage(e: unknown) {
  return (
    (e as { data?: { message?: string } }).data?.message ??
    "Something went wrong, try again!"
  );
}

async function add() {
  saving.value = true;
  error.value = "";
  try {
    await $fetch("/api/admin/notes", {
      method: "POST",
      body: { ...target.value, body: draft.value },
    });
    draft.value = "";
    await refresh();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

async function remove(id: number) {
  if (!window.confirm("delete this note?")) return;
  error.value = "";
  try {
    await $fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
    await refresh();
  } catch (e) {
    error.value = errorMessage(e);
  }
}
</script>
