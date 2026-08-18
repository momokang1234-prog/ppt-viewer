/* ==========================================================================
   2. 16:9 Viewport Auto-Scaling Engine (Q3 Lock)
   3. PPT-Style Keyboard & Click Navigation Engine with Step Animation (Q7 Lock)
   ========================================================================== */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.PPTViewer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var DECK_WIDTH = 1280;
    var DECK_HEIGHT = 720;
    var STANDALONE_SCALE_MARGIN = 0.95;
    var NEXT_KEYS = ['Space', ' ', 'ArrowRight', 'PageDown'];
    var PREV_KEYS = ['ArrowLeft', 'PageUp'];
    var INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, .theme-toggle-btn, .quiz-card, .tab-btn, .accordion-header, .expand-trigger';
    var TITLE_SELECTOR = '.slide-title, .cover-title, h1, h2, h3';

    function isEmbedded(win) {
        return win.self !== win.top;
    }

    /**
     * Deck transform for a viewport. Embedded decks scale on width only and are
     * not repositioned; standalone decks are letterboxed and centered.
     */
    function computeDeckLayout(innerWidth, innerHeight, embedded) {
        if (embedded) {
            return { scale: innerWidth / DECK_WIDTH, left: null, top: null };
        }
        var scale = Math.min(innerWidth / DECK_WIDTH, innerHeight / DECK_HEIGHT) * STANDALONE_SCALE_MARGIN;
        return {
            scale: scale,
            left: (innerWidth - DECK_WIDTH * scale) / 2,
            top: (innerHeight - DECK_HEIGHT * scale) / 2
        };
    }

    function createViewer(doc, win) {
        var slideDeck = doc.getElementById('slideDeck');
        var themeToggleBtn = doc.getElementById('themeToggle');
        var slideCounter = doc.getElementById('slideCounter');
        var outlineList = doc.getElementById('outlineList');
        var outlineCount = doc.getElementById('outlineCount');
        var slides = Array.prototype.slice.call(doc.querySelectorAll('.slide'));
        var currentSlideIndex = 0;
        var currentStepIndex = 0;

        function autoScaleDeck() {
            if (!slideDeck) return;
            var layout = computeDeckLayout(win.innerWidth, win.innerHeight, isEmbedded(win));
            slideDeck.style.transform = 'scale(' + layout.scale + ')';
            if (layout.left !== null) slideDeck.style.left = layout.left + 'px';
            if (layout.top !== null) slideDeck.style.top = layout.top + 'px';
        }

        function slideTitle(slide, index) {
            var titleEl = slide.querySelector(TITLE_SELECTOR);
            return titleEl ? titleEl.textContent.trim() : 'Slide ' + (index + 1);
        }

        function buildOutlinePanel() {
            if (!outlineList) return;
            outlineList.innerHTML = '';
            slides.forEach(function (slide, index) {
                var item = doc.createElement('li');
                item.className = 'outline-item ' + (index === currentSlideIndex ? 'active' : '');
                item.innerHTML = '<span class="outline-num">' + String(index + 1).padStart(2, '0') +
                    '</span><span class="outline-title-text">' + slideTitle(slide, index) + '</span>';
                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    currentSlideIndex = index;
                    updateSlides();
                });
                outlineList.appendChild(item);
            });
        }

        function getActiveSteps() {
            var currentSlide = slides[currentSlideIndex];
            return currentSlide ? Array.prototype.slice.call(currentSlide.querySelectorAll('[data-step]')) : [];
        }

        function updateSlides() {
            slides.forEach(function (slide, index) {
                slide.classList.remove('active', 'prev', 'next');
                if (index === currentSlideIndex) {
                    slide.classList.add('active');
                } else if (index < currentSlideIndex) {
                    slide.classList.add('prev');
                } else {
                    slide.classList.add('next');
                }
            });
            currentStepIndex = 0;
            getActiveSteps().forEach(function (step) {
                step.classList.remove('step-active');
            });
            if (slideCounter) slideCounter.textContent = (currentSlideIndex + 1) + ' / ' + slides.length;

            if (outlineList) {
                outlineList.querySelectorAll('.outline-item').forEach(function (item, idx) {
                    if (idx === currentSlideIndex) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
            }
            if (outlineCount) outlineCount.textContent = (currentSlideIndex + 1) + ' / ' + slides.length;
        }

        function nextStepOrSlide() {
            var steps = getActiveSteps();
            if (currentStepIndex < steps.length) {
                steps[currentStepIndex].classList.add('step-active');
                currentStepIndex++;
            } else if (currentSlideIndex < slides.length - 1) {
                currentSlideIndex++;
                updateSlides();
            }
        }

        function prevStepOrSlide() {
            var steps = getActiveSteps();
            if (currentStepIndex > 0) {
                currentStepIndex--;
                steps[currentStepIndex].classList.remove('step-active');
            } else if (currentSlideIndex > 0) {
                currentSlideIndex--;
                updateSlides();
            }
        }

        function goToSlide(index) {
            currentSlideIndex = index;
            updateSlides();
        }

        // Global Ambient Click Navigation Handler (Filters Interactive Controls)
        function handleClick(e) {
            if (e.target.closest && e.target.closest(INTERACTIVE_SELECTOR)) {
                return;
            }
            nextStepOrSlide();
        }

        // Global Keyboard Event Navigation Listener
        function handleKeydown(e) {
            if (NEXT_KEYS.indexOf(e.key) !== -1) {
                e.preventDefault();
                nextStepOrSlide();
            } else if (PREV_KEYS.indexOf(e.key) !== -1) {
                e.preventDefault();
                prevStepOrSlide();
            } else if (e.key === 'Home') {
                e.preventDefault();
                goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                goToSlide(slides.length - 1);
            }
        }

        function init() {
            if (isEmbedded(win) && themeToggleBtn) {
                themeToggleBtn.style.display = 'none';
            }
            win.addEventListener('resize', autoScaleDeck);
            doc.addEventListener('click', handleClick);
            win.addEventListener('keydown', handleKeydown);
            autoScaleDeck();
            buildOutlinePanel();
            updateSlides();
            return api;
        }

        var api = {
            init: init,
            autoScaleDeck: autoScaleDeck,
            buildOutlinePanel: buildOutlinePanel,
            updateSlides: updateSlides,
            getActiveSteps: getActiveSteps,
            nextStepOrSlide: nextStepOrSlide,
            prevStepOrSlide: prevStepOrSlide,
            goToSlide: goToSlide,
            handleClick: handleClick,
            handleKeydown: handleKeydown,
            getState: function () {
                return {
                    slideCount: slides.length,
                    currentSlideIndex: currentSlideIndex,
                    currentStepIndex: currentStepIndex
                };
            }
        };

        return api;
    }

    return {
        DECK_WIDTH: DECK_WIDTH,
        DECK_HEIGHT: DECK_HEIGHT,
        STANDALONE_SCALE_MARGIN: STANDALONE_SCALE_MARGIN,
        NEXT_KEYS: NEXT_KEYS,
        PREV_KEYS: PREV_KEYS,
        INTERACTIVE_SELECTOR: INTERACTIVE_SELECTOR,
        isEmbedded: isEmbedded,
        computeDeckLayout: computeDeckLayout,
        createViewer: createViewer
    };
});
