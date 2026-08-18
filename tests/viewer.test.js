import { describe, it, expect, beforeEach, vi } from 'vitest';
import PPTViewer from '../assets/viewer.js';
import { buildDeck, setViewport, slideClasses, activeStepCount, outlineTitles } from './helpers/deck.js';

const { computeDeckLayout, isEmbedded, createViewer, DECK_WIDTH, DECK_HEIGHT } = PPTViewer;

function embeddedWindow(innerWidth = 640, innerHeight = 360) {
  const top = {};
  return {
    self: {},
    top,
    innerWidth,
    innerHeight,
    addEventListener: vi.fn()
  };
}

function key(name) {
  return { key: name, preventDefault: vi.fn() };
}

describe('computeDeckLayout', () => {
  it('letterboxes and centers a standalone deck with a 5% margin', () => {
    const layout = computeDeckLayout(1280, 720, false);

    expect(layout.scale).toBeCloseTo(0.95);
    expect(layout.left).toBeCloseTo((1280 - DECK_WIDTH * 0.95) / 2);
    expect(layout.top).toBeCloseTo((720 - DECK_HEIGHT * 0.95) / 2);
  });

  it('constrains the scale by the tighter viewport axis', () => {
    expect(computeDeckLayout(1280, 360, false).scale).toBeCloseTo(0.475);
    expect(computeDeckLayout(640, 720, false).scale).toBeCloseTo(0.475);
  });

  it('scales an embedded deck on width only and never repositions it', () => {
    const layout = computeDeckLayout(640, 100, true);

    expect(layout.scale).toBeCloseTo(0.5);
    expect(layout.left).toBeNull();
    expect(layout.top).toBeNull();
  });
});

describe('isEmbedded', () => {
  it('detects an iframe by comparing self and top', () => {
    expect(isEmbedded(embeddedWindow())).toBe(true);
    const standalone = {};
    standalone.self = standalone;
    standalone.top = standalone;
    expect(isEmbedded(standalone)).toBe(false);
  });
});

describe('createViewer', () => {
  beforeEach(() => {
    buildDeck({ slides: 3, stepsPerSlide: { 0: 2 } });
    setViewport(1280, 720);
  });

  it('activates the first slide and syncs both counters on init', () => {
    const viewer = createViewer(document, window).init();

    expect(slideClasses()).toEqual(['slide active', 'slide next', 'slide next']);
    expect(document.getElementById('slideCounter').textContent).toBe('1 / 3');
    expect(document.getElementById('outlineCount').textContent).toBe('1 / 3');
    expect(viewer.getState()).toEqual({ slideCount: 3, currentSlideIndex: 0, currentStepIndex: 0 });
  });

  it('marks slides before the current one as prev and later ones as next', () => {
    const viewer = createViewer(document, window).init();

    viewer.goToSlide(1);

    expect(slideClasses()).toEqual(['slide prev', 'slide active', 'slide next']);
  });

  it('reveals each step before advancing to the next slide', () => {
    const viewer = createViewer(document, window).init();

    viewer.nextStepOrSlide();
    expect(activeStepCount()).toBe(1);
    expect(viewer.getState().currentSlideIndex).toBe(0);

    viewer.nextStepOrSlide();
    expect(activeStepCount()).toBe(2);

    viewer.nextStepOrSlide();
    expect(viewer.getState()).toMatchObject({ currentSlideIndex: 1, currentStepIndex: 0 });
  });

  it('rewinds steps before returning to the previous slide', () => {
    const viewer = createViewer(document, window).init();

    viewer.goToSlide(1);
    viewer.prevStepOrSlide();
    expect(viewer.getState().currentSlideIndex).toBe(0);

    // Steps of slide 1 are reset, so stepping forward re-reveals them one by one.
    viewer.nextStepOrSlide();
    viewer.nextStepOrSlide();
    expect(activeStepCount()).toBe(2);

    viewer.prevStepOrSlide();
    expect(activeStepCount()).toBe(1);
    expect(viewer.getState()).toMatchObject({ currentSlideIndex: 0, currentStepIndex: 1 });
  });

  it('clamps navigation at both ends of the deck', () => {
    const viewer = createViewer(document, window).init();

    viewer.prevStepOrSlide();
    expect(viewer.getState().currentSlideIndex).toBe(0);

    viewer.goToSlide(2);
    viewer.nextStepOrSlide();
    expect(viewer.getState().currentSlideIndex).toBe(2);
  });

  it('clears revealed steps when the slide changes', () => {
    const viewer = createViewer(document, window).init();

    viewer.nextStepOrSlide();
    expect(activeStepCount()).toBe(1);

    viewer.goToSlide(1);
    viewer.goToSlide(0);

    expect(activeStepCount()).toBe(0);
    expect(viewer.getState().currentStepIndex).toBe(0);
  });

  it('only returns steps belonging to the active slide', () => {
    buildDeck({ slides: 2, stepsPerSlide: { 1: 3 } });
    const viewer = createViewer(document, window).init();

    expect(viewer.getActiveSteps()).toHaveLength(0);

    viewer.goToSlide(1);
    expect(viewer.getActiveSteps()).toHaveLength(3);
  });

  it('applies the computed transform and centering offsets to the deck', () => {
    const viewer = createViewer(document, window).init();
    setViewport(2560, 1440);

    viewer.autoScaleDeck();

    const deck = document.getElementById('slideDeck');
    const expected = computeDeckLayout(2560, 1440, false);
    expect(deck.style.transform).toBe(`scale(${expected.scale})`);
    expect(deck.style.left).toBe(`${expected.left}px`);
    expect(deck.style.top).toBe(`${expected.top}px`);
  });

  it('hides the theme toggle and skips centering when embedded', () => {
    const win = embeddedWindow(640, 360);

    createViewer(document, win).init();

    const deck = document.getElementById('slideDeck');
    expect(document.getElementById('themeToggle').style.display).toBe('none');
    expect(deck.style.transform).toBe('scale(0.5)');
    expect(deck.style.left).toBe('');
    expect(deck.style.top).toBe('');
    expect(win.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('rescales on window resize', () => {
    createViewer(document, window).init();
    setViewport(640, 360);

    window.dispatchEvent(new window.Event('resize'));

    expect(document.getElementById('slideDeck').style.transform).toBe('scale(0.475)');
  });

  it('builds one outline entry per slide with padded numbers and titles', () => {
    buildDeck({ slides: 2, titles: { 1: null } });
    createViewer(document, window).init();

    expect(outlineTitles()).toEqual(['Title 1', 'Slide 2']);
    expect(
      Array.from(document.querySelectorAll('.outline-item .outline-num')).map((el) => el.textContent)
    ).toEqual(['01', '02']);
    expect(document.querySelector('.outline-item').classList.contains('active')).toBe(true);
  });

  it('moves the active outline marker with the current slide', () => {
    const viewer = createViewer(document, window).init();

    viewer.goToSlide(2);

    const active = Array.from(document.querySelectorAll('.outline-item')).map((item) =>
      item.classList.contains('active')
    );
    expect(active).toEqual([false, false, true]);
  });

  it('jumps to a slide when its outline entry is clicked without bubbling the click', () => {
    createViewer(document, window).init();
    const outlineItem = document.querySelectorAll('.outline-item')[2];
    const bubbled = vi.fn();
    document.addEventListener('click', bubbled);

    outlineItem.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(document.getElementById('slideCounter').textContent).toBe('3 / 3');
    expect(bubbled).not.toHaveBeenCalled();
    document.removeEventListener('click', bubbled);
  });

  it('rebuilds the outline without duplicating entries', () => {
    const viewer = createViewer(document, window).init();

    viewer.buildOutlinePanel();

    expect(document.querySelectorAll('.outline-item')).toHaveLength(3);
  });

  it('tolerates a document without deck, counter or outline nodes', () => {
    document.body.innerHTML = '';

    const viewer = createViewer(document, window);

    expect(() => viewer.init()).not.toThrow();
    expect(viewer.getActiveSteps()).toEqual([]);
    expect(viewer.getState()).toEqual({ slideCount: 0, currentSlideIndex: 0, currentStepIndex: 0 });
  });

  describe('keyboard navigation', () => {
    it('advances on forward keys and rewinds on backward keys', () => {
      const viewer = createViewer(document, window).init();

      for (const name of PPTViewer.NEXT_KEYS) {
        const event = key(name);
        viewer.handleKeydown(event);
        expect(event.preventDefault).toHaveBeenCalled();
      }
      // 2 steps revealed, then 2 slide advances.
      expect(viewer.getState().currentSlideIndex).toBe(2);

      for (const name of PPTViewer.PREV_KEYS) {
        const event = key(name);
        viewer.handleKeydown(event);
        expect(event.preventDefault).toHaveBeenCalled();
      }
      expect(viewer.getState().currentSlideIndex).toBe(0);
    });

    it('jumps to the first and last slide with Home and End', () => {
      const viewer = createViewer(document, window).init();

      viewer.handleKeydown(key('End'));
      expect(viewer.getState().currentSlideIndex).toBe(2);

      viewer.handleKeydown(key('Home'));
      expect(viewer.getState().currentSlideIndex).toBe(0);
    });

    it('ignores unrelated keys', () => {
      const viewer = createViewer(document, window).init();
      const event = key('Enter');

      viewer.handleKeydown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(viewer.getState()).toMatchObject({ currentSlideIndex: 0, currentStepIndex: 0 });
    });

    it('is wired to the window on init', () => {
      const viewer = createViewer(document, window).init();

      const event = new window.KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
      window.dispatchEvent(event);

      expect(viewer.getState().currentStepIndex).toBe(1);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('ambient click navigation', () => {
    it('advances when clicking non-interactive slide content', () => {
      const viewer = createViewer(document, window).init();

      document.querySelector('.slide-body').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(viewer.getState().currentStepIndex).toBe(1);
    });

    it('ignores clicks that originate inside interactive controls', () => {
      const viewer = createViewer(document, window).init();

      document.getElementById('themeLabel').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      expect(viewer.getState()).toMatchObject({ currentSlideIndex: 0, currentStepIndex: 0 });
    });
  });
});
