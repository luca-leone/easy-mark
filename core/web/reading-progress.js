export function calculateReadingProgress({ documentTop, documentHeight, viewportHeight, scrollY }) {
  const scrollableDistance = documentHeight - viewportHeight;
  if (scrollableDistance <= 0) return 100;
  const progress = ((scrollY - documentTop) / scrollableDistance) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function initializeReadingProgress({ content, progress, windowObject = window }) {
  const bar = progress.querySelector('.reading-progress__bar');
  let frame = null;

  function update() {
    frame = null;
    const rect = content.getBoundingClientRect();
    const value = calculateReadingProgress({
      documentTop: windowObject.scrollY + rect.top,
      documentHeight: content.scrollHeight,
      viewportHeight: windowObject.innerHeight,
      scrollY: windowObject.scrollY
    });
    progress.style.setProperty('--reading-progress', `${value}%`);
    progress.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  function schedule() {
    if (frame !== null) return;
    frame = windowObject.requestAnimationFrame(update);
  }

  windowObject.addEventListener('scroll', schedule, { passive: true });
  windowObject.addEventListener('resize', schedule);
  update();
  return { reset: update, update: schedule };
}
