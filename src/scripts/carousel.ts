// One slide at a time, 1s slide transition, autoplay every 4s that stops at the last slide
// (as the old Owl Carousel set-up did), arrow buttons and swipe/drag.
const AUTOPLAY_MS = 4000;

export function initCarousels() {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(setup);
}

function setup(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const slides = Array.from(track.children) as HTMLElement[];
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;

  slides.forEach((s, i) => {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
  });

  const go = (i: number) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.style.transform = `translate3d(${-index * (track.clientWidth + gap)}px,0,0)`;
    slides.forEach((s, j) => {
      s.toggleAttribute('inert', j !== index);
      s.setAttribute('aria-hidden', String(j !== index));
    });
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === slides.length - 1;
  };

  let timer: number | undefined;
  const restart = () => {
    window.clearInterval(timer);
    if (reduced) return;
    timer = window.setInterval(() => {
      if (index < slides.length - 1) go(index + 1);
    }, AUTOPLAY_MS);
  };

  prev?.addEventListener('click', () => { go(index - 1); restart(); });
  next?.addEventListener('click', () => { go(index + 1); restart(); });

  // swipe / drag
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dragging = false;
  root.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(e.clientY - startY)) {
      root.classList.add('is-dragging');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.style.transform = `translate3d(${-index * (track.clientWidth + gap) + dx}px,0,0)`;
    }
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-dragging');
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    else go(index);
    restart();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  window.addEventListener('resize', () => go(index));
  go(0);
  restart();
}
