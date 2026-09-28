export interface AdminSubject {
  slackId: string | null;
}

// The user the current page is about, for the admin bar's user buttons (like telescreen).
// Pages call setAdminSubject() with a getter; it's cleared when the page unmounts.
export function useAdminSubject() {
  return useState<AdminSubject | null>("admin-subject", () => null);
}

export function setAdminSubject(getSubject: () => AdminSubject | null | undefined) {
  const subject = useAdminSubject();
  let mine: AdminSubject | null = null;
  watchEffect(() => {
    mine = getSubject() ?? null;
    subject.value = mine;
  });
  onBeforeUnmount(() => {
    // the next page may have already set its own subject, so only clear ours
    if (subject.value === mine) subject.value = null;
  });
}
