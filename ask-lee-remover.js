// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Hides the Ask Lee widget and adjusts the task page layout for better viewing.
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // State flags to track when an adjustment has been successfully applied.
    let widgetHidden = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let exclusiveRowAdjusted = false; // Changed name for clarity

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
            // Create a copy of the classList to iterate over, as modifying it directly while looping can cause issues.
            const classesToRemove = Array.from(element.classList).filter(cls => cls.startsWith('col-'));
            element.classList.remove(...classesToRemove);
        }
    }

    /**
     * Resets all state flags. This is crucial for SPAs (Single Page Applications)
     * where navigating to a new "page" doesn't trigger a full page reload.
     */
    function resetFixes() {
        widgetHidden = false;
        mainContentAdjusted = false;
        cardRowAdjusted = false;
        exclusiveRowAdjusted = false;
        if (retryTimeoutId) {
            clearTimeout(retryTimeoutId);
            retryTimeoutId = null;
        }
        console.log("[WIMS Fix] Flags have been reset due to navigation or page change.");
    }

    /**
     * Hides the 'Ask Lee' widget using a CSS rule injected by Tampermonkey.
     * This is more efficient than repeatedly searching for and hiding the element.
     */
    function hideAskLeeWidget() {
        if (!widgetHidden) {
            // GM_addStyle is a persistent and clean way to hide elements.
            GM_addStyle('.ask-lee-widget-container { display: none !important; }');
            widgetHidden = true; // Set flag so this only runs once
            console.log("[WIMS Fix] Ask Lee widget has been hidden.");
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
            // The selector 'div[class="row"]' is very specific. It will only match a div
            // that has the class attribute set to exactly "row" and nothing else.
            const exclusiveRow = document.querySelector('div[class="row"]');
            if (exclusiveRow) {
                exclusiveRow.classList.remove('row');
                exclusiveRow.classList.add('row-null'); // Renaming as requested
                exclusiveRowAdjusted = true;
                console.log("[WIMS Fix] Found exclusive 'div.row' and changed its class to 'row-null'.");
            }
        }

        // ---- FIX 3: Adjust children of the 'card-padding row' div ----
        if (!cardRowAdjusted) {
            // Find the specific row container that holds the two columns we want to resize.
            const cardRow = document.querySelector('div.card-padding.row');
            if (cardRow) {
                // Select its direct children that are divs. The :scope selector ensures we only look inside `cardRow`.
                const children = cardRow.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Clean and apply new classes to the first column
                    removeColClasses(firstColumn);
                    firstColumn.classList.add('col-lg-8', 'col-md-8');

                    // Clean and apply new classes to the second column
                    removeColClasses(secondColumn);
                    secondColumn.classList.add('col-lg-4', 'col-md-4');

                    cardRowAdjusted = true;
                    console.log("[WIMS Fix] Resized the two columns inside '.card-padding.row'.");
                }
            }
        }

        // Log when all adjustments are complete for this page view
        if (mainContentAdjusted && cardRowAdjusted && exclusiveRowAdjusted) {
            console.log("[WIMS Fix] All layout adjustments have been successfully applied.");
        }
    }

    /**
     * Sets up the MutationObserver to watch for changes in the document.
     * This is the engine that makes the script work on dynamic pages.
     */
    function initializeObserver() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            // Check for URL changes to reset fixes on navigation
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed, re-initializing fixes.");
                resetFixes();
                lastUrl = location.href;
            }

            // Always try to hide the widget first, as it's a simple, high-level fix.
            hideAskLeeWidget();

            // All fixes depend on the main task page container being present.
            const taskDetailContainer = document.querySelector('.task-details-page');
            if (taskDetailContainer) {
                // Attempt to apply fixes.
                applyLayoutFixes();

                // Check if all fixes are done. If not, it means some elements might still be loading.
                // We'll schedule a single, throttled retry to catch them.
                const allDone = widgetHidden && mainContentAdjusted && cardRowAdjusted && exclusiveRowAdjusted;
                if (!allDone) {
                    if (retryTimeoutId) { clearTimeout(retryTimeoutId); } // Clear any previous retry

                    retryTimeoutId = setTimeout(() => {
                        console.log("[WIMS Fix] Retrying fixes after a short delay...");
                        applyLayoutFixes();
                        retryTimeoutId = null;
                    }, 200); // Wait 200ms for other elements to render
                }
            }
        });

        // Start observing the entire document body for additions, removals, and other changes.
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log("[WIMS Fix] Observer started.");
    }

    // --- SCRIPT START ---
    // Hide the widget immediately on script load, then start the observer to handle the rest.
    hideAskLeeWidget();
    initializeObserver();

})();
