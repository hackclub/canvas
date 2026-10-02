// Search box and page state for an admin audit log section. `q` follows `search` once
// typing stops, so every keystroke isn't a request, and going back to page 1 on a new search.
export function useAuditSearch() {
  const search = ref("");
  const q = ref("");
  const page = ref(1);

  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(search, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      q.value = value.trim();
      page.value = 1;
    }, 300);
  });
  onBeforeUnmount(() => clearTimeout(timer));

  return { search, q, page };
}
