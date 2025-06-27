// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Hides Ask Lee, adjusts layout on task detail pages, and re-applies fixes on dynamic updates.
// @author       @camrees (updated by Gemini)
// @match        https://optimus-internal-eu.amazon.com/wims/taskdetail/*
// @match        https://optimus-internal-eu.amazon.com/wims
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // State flags to track when an adjustment has been successfully applied.
    let widgetHidden = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let exclusiveRowAdjusted = false;

    let observer;
    let lastUrl = location.href;
    let retryTimeoutId; // Manages the retry timeout to prevent multiple loops

    /**
     * A helper function to remove any existing column classes (e.g., 'col-lg-6') from an element.
     * This prevents class conflicts when adding new ones.
     * @param {Element} element The DOM element to clean.
     */
    function removeColClasses(element) {
        if (element) {
            const classesToRemove = Array.from(element.classList).filter(cls => cls.startsWith('col-'));
            element.classList.remove(...classesToRemove);
        }
    }

    /**
     * Resets all state flags. This is crucial for SPAs (Single Page Applications)
     * where navigating or performing an action doesn't trigger a full page reload.
     */
    function resetFixes() {
        mainContentAdjusted = false;
        cardRowAdjusted = false;
        exclusiveRowAdjusted = false;
        if (retryTimeoutId) {
            clearTimeout(retryTimeoutId);
            retryTimeoutId = null;
        }
        console.log("[WIMS Fix] Flags have been reset to re-apply fixes.");
    }

    /**
     * Hides the 'Ask Lee' widget using a CSS rule injected by Tampermonkey.
     * This is more efficient than repeatedly searching for and hiding the element.
     */
    function hideAskLeeWidget() {
        if (!widgetHidden) {
            GM_addStyle('.ask-lee-widget-container { display: none !important; }');
            widgetHidden = true;
            console.log("[WIMS Fix] Ask Lee widget has been hidden.");
        }
    }

    /**
     * Monitors for the 'Assign to me' button and attaches a one-time click listener
     * to re-apply fixes after the page content re-renders.
     */
    function monitorAssignButton() {
        const assignButton = document.querySelector('button[data-testid="assign-to-me-button"]');

        // Check if the button exists and doesn't already have our listener.
        if (assignButton && !assignButton.hasAttribute('data-wims-fix-listener')) {
            assignButton.setAttribute('data-wims-fix-listener', 'true'); // Mark as handled
            console.log("[WIMS Fix] 'Assign to me' button found, attaching click listener.");

            assignButton.addEventListener('click', () => {
                console.log("[WIMS Fix] 'Assign to me' button clicked. Resetting and re-applying fixes after a delay.");
                // Reset flags so the script knows to run the fixes again.
                resetFixes();
                // Wait for the SPA framework to re-render the DOM before applying fixes.
                setTimeout(applyLayoutFixes, 500);
            });
        }
    }

    /**
     * The core function that attempts to apply all necessary layout adjustments to the page.
     * It checks flags to ensure it doesn't re-apply fixes unnecessarily.
     */
    function applyLayoutFixes() {
        // ---- FIX 1: Adjust the main content column class ----
        if (!mainContentAdjusted) {
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                mainContentAdjusted = true;
                console.log("[WIMS Fix] Main content column class adjusted.");
            }
        }

        // ---- FIX 2: Find a div with ONLY the class 'row' and rename it ----
        if (!exclusiveRowAdjusted) {
            const exclusiveRow = document.querySelector('div[class="row"]');
            if (exclusiveRow) {
                exclusiveRow.classList.remove('row');
                exclusiveRow.classList.add('row-null');
                exclusiveRowAdjusted = true;
                console.log("[WIMS Fix] Found exclusive 'div.row' and changed its class to 'row-null'.");
            }
        }

        // ---- FIX 3: Adjust children of the 'card-padding row' div ----
        if (!cardRowAdjusted) {
            const cardRow = document.querySelector('div.card-padding.row');
            if (cardRow) {
                const children = cardRow.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];
                    removeColClasses(firstColumn);
                    firstColumn.classList.add('col-lg-8', 'col-md-8');
                    removeColClasses(secondColumn);
                    secondColumn.classList.add('col-lg-4', 'col-md-4');
                    cardRowAdjusted = true;
                    console.log("[WIMS Fix] Resized the two columns inside '.card-padding.row'.");
                }
            }
        }

        if (mainContentAdjusted && cardRowAdjusted && exclusiveRowAdjusted) {
            console.log("[WIMS Fix] All layout adjustments have been successfully applied for this view.");
        }
    }

    /**
     * Sets up the MutationObserver to watch for changes in the document.
     * This is the engine that makes the script work on dynamic pages.
     */
    function initializeObserver() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed, re-initializing.");
                resetFixes();
                lastUrl = location.href;
            }

            hideAskLeeWidget();

            // Only run the main fixes if we are on a task detail page.
            if (location.pathname.includes('/wims/taskdetail')) {
                // Attempt to apply fixes and monitor the button.
                applyLayoutFixes();
                monitorAssignButton();

                const allDone = widgetHidden && mainContentAdjusted && cardRowAdjusted && exclusiveRowAdjusted;
                if (!allDone) {
                    if (retryTimeoutId) { clearTimeout(retryTimeoutId); }
                    retryTimeoutId = setTimeout(() => {
                        console.log("[WIMS Fix] Retrying fixes after a short delay...");
                        applyLayoutFixes();
                        retryTimeoutId = null;
                    }, 200);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log("[WIMS Fix] Observer started.");
    }

    // --- SCRIPT START ---
    // Run initial fixes and start the observer.
    initializeObserver();
    // A final check on load
    if (location.pathname.includes('/wims/taskdetail')) {
        applyLayoutFixes();
    }
})();
