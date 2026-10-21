// Fade/slide elements in as they scroll into view (replaces WOW.js). Only runs when the
// <head> script enabled it: pointer devices that haven't asked for reduced motion.
export function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!document.documentElement.classList.contains('reveal-on')) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  });
  els.forEach((el) => io.observe(el));
}
