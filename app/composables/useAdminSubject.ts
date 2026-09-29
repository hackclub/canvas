export interface AdminSubject {
  slackId: string | null;
  // Set on project pages, for the project telescreen button
  project?: {
    // The owner's Hackatime user ID
    hackatimeId: number | null;
    hackatimeProjects: string[];
  };
}

// The user (and project, if any) the current page is about, for the admin bar's buttons.
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
    // the next page may have already set its own subject, so only clear ours.
    // toRaw because useState hands back a reactive proxy, which never === the object we set
    if (toRaw(subject.value) === mine) subject.value = null;
  });
}
