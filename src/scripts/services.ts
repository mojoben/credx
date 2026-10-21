// Home page "Our Bridging Finance Solutions" (992px and up): the invisible spacers in the left
// column set the scroll distance; whichever one crosses the middle of the screen picks the
// service shown in the sticky copy and the sticky card list.
export function initServices() {
  const root = document.querySelector<HTMLElement>('[data-services]');
  if (!root || !('IntersectionObserver' in window)) return;
  const items = root.querySelectorAll<HTMLElement>('[data-item]');
  const navs = root.querySelectorAll<HTMLElement>('[data-nav]');
  const spacers = root.querySelectorAll<HTMLElement>('[data-spacer]');
  let active = 0;

  const show = (i: number) => {
    if (i === active) return;
    active = i;
    items.forEach((el, j) => {
      const on = j === i;
      el.classList.toggle('is-active', on);
      el.toggleAttribute('aria-hidden', !on);
      el.querySelectorAll('a').forEach((a) => (on ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
    });
    navs.forEach((el, j) => el.classList.toggle('is-active', j === i));
  };

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) show(Number((entry.target as HTMLElement).dataset.spacer));
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  spacers.forEach((s) => io.observe(s));
}
