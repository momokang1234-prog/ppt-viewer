export function buildDeck({ slides = 3, stepsPerSlide = {}, titles = {} } = {}) {
  const slideMarkup = Array.from({ length: slides }, (_, i) => {
    const steps = Array.from(
      { length: stepsPerSlide[i] || 0 },
      (_, s) => `<p data-step="${s + 1}">step ${s + 1}</p>`
    ).join('');
    const title = titles[i] === null ? '' : `<h1 class="slide-title">${titles[i] || `Title ${i + 1}`}</h1>`;
    return `<div class="slide">${title}<div class="slide-body">${steps}</div></div>`;
  }).join('');

  document.body.innerHTML = `
    <button class="theme-toggle-btn" id="themeToggle"><span id="themeLabel">Theme</span></button>
    <div class="slide-deck" id="slideDeck">
      ${slideMarkup}
      <div class="slide-outline-panel">
        <span class="outline-count" id="outlineCount">1 / 1</span>
        <ul class="outline-list" id="outlineList"></ul>
      </div>
    </div>
    <div class="slide-counter" id="slideCounter">1 / 1</div>
  `;
}

export function setViewport(width, height) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true });
}

export function slideClasses() {
  return Array.from(document.querySelectorAll('.slide')).map((slide) => slide.className.trim());
}

export function activeStepCount() {
  return document.querySelectorAll('.step-active').length;
}

export function outlineTitles() {
  return Array.from(document.querySelectorAll('.outline-item .outline-title-text')).map((el) => el.textContent);
}
