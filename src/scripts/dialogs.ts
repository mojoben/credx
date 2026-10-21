// "Read more" buttons open a native <dialog>; clicking outside the box closes it.
export function initDialogs() {
  document.querySelectorAll<HTMLButtonElement>('[data-open-dialog]').forEach((btn) => {
    const dialog = document.getElementById(btn.dataset.openDialog!) as HTMLDialogElement | null;
    if (!dialog) return;
    btn.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.team-dialog-content')) dialog.close();
    });
  });
}
