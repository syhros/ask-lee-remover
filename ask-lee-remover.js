// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.5 // Updated version
// @description  Hides Ask Lee widget and adjusts task page layout for better viewing.
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // State flags to track completed adjustments
    let widgetHidden = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let firstRowAdjusted = false;
    let observer;
    let lastUrl = location.href;
    let retryTimeoutId; // New variable to manage retry timeouts

    // A helper function to remove any existing column classes
    function removeColClasses(element) {
        if (element) {
            element.classList.forEach(cls => {
                if (cls.startsWith('col-')) {
                    element.classList.remove(cls);
                }
            });
        }
    }

    // Resets all flags, useful when navigating between pages
    function resetFixes() {
        widgetHidden = false;
        mainContentAdjusted = false;
        cardRowAdjusted = false;
        firstRowAdjusted = false;
        // Clear any pending retry timeout when resetting fixes
        if (retryTimeoutId) {
            clearTimeout(retryTimeoutId);
            retryTimeoutId = null;
        }
        console.log("[WIMS Fix] Resetting flags.");
    }

    // Hides the 'Ask Lee' widget using a persistent CSS rule
    function hideAskLeeWidget() {
        if (!widgetHidden) {
            GM_addStyle('.ask-lee-widget-container { display: none !important; }');
            widgetHidden = true;
            console.log("[WIMS Fix] Ask Lee widget hidden.");
        }
    }

    // Attempts to apply all layout adjustments
    function applyLayoutFixes() {
        // Adjust the main content column class
        if (!mainContentAdjusted) {
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                mainContentAdjusted = true;
                console.log("[WIMS Fix] Main content class adjusted.");
            }
        }

        // Adjust the first 'div.row' found that is not a 'card-padding' row
        if (!firstRowAdjusted) {
            const firstRowDiv = document.querySelector('div.row:not(.card-padding)');
            if (firstRowDiv) {
                firstRowDiv.classList.remove('row');
                firstRowDiv.classList.add('row-null');
                firstRowAdjusted = true;
                console.log("[WIMS Fix] First 'div.row' adjusted.");
            }
        }

        // Adjust the children of the 'card-padding row'
        if (!cardRowAdjusted) {
            const cardRow = document.querySelector('div.card-padding.row');
            if (cardRow) {
                const children = cardRow.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    removeColClasses(children[0]);
                    children[0].classList.add('col-lg-8', 'col-md-8');

                    removeColClasses(children[1]);
                    children[1].classList.add('col-lg-4', 'col-md-4');

                    cardRowAdjusted = true;
                    console.log("[WIMS Fix] Card-padding row children adjusted.");
                }
            }
        }

        // Log when all primary adjustments are complete
        if (mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
            console.log("[WIMS Fix] All primary adjustments applied.");
        }
    }

    // Monitors for the 'Assign to me' button to handle page re-renders
    function monitorAssignButton() {
        const assignButton = document.querySelector('button[data-testid="assign-to-me-button"]');
        if (assignButton && !assignButton.hasAttribute('data-wims-fix-listener')) {
            assignButton.setAttribute('data-wims-fix-listener', 'true');
            console.log("[WIMS Fix] Assign button found, attaching listener.");
            assignButton.addEventListener('click', () => {
                console.log("[WIMS Fix] Assign button clicked, re-applying fixes.");
                setTimeout(applyLayoutFixes, 500);
            });
        }
    }

    // Main observer that watches for DOM and URL changes
    function observeTaskPage() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed, re-initializing.");
                resetFixes();
                lastUrl = location.href;
            }

            hideAskLeeWidget();

            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                applyLayoutFixes(); // Initial attempt to apply fixes
                monitorAssignButton();

                // If not all fixes are applied, schedule a retry.
                // This ensures fixes are applied even if elements load asynchronously.
                if (!(widgetHidden && mainContentAdjusted && cardRowAdjusted && firstRowAdjusted)) {
                    if (retryTimeoutId) { // Clear existing timeout to prevent multiple concurrent retries
                        clearTimeout(retryTimeoutId);
                    }
                    retryTimeoutId = setTimeout(() => {
                        // Re-check if still on task details page before retrying
                        if (document.querySelector('.task-details-page')) {
                            applyLayoutFixes();
                            console.log("[WIMS Fix] Retrying applyLayoutFixes after delay.");
                        }
                    }, 100); // Small delay (100ms) to allow page to render more elements
                }
            } else {
                // If not on task details page, reset flags if adjustments were made
                if (mainContentAdjusted || cardRowAdjusted || firstRowAdjusted) {
                    console.log("[WIMS Fix] Not on task details page, flags reset.");
                    resetFixes();
                }
            }

            // Disconnect observer once all fixes are confirmed to save resources
            if (widgetHidden && mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
                currentObserver.disconnect();
                console.log("[WIMS Fix] All fixes applied, observer disconnected.");
                // Ensure no more retries after disconnecting
                if (retryTimeoutId) {
                    clearTimeout(retryTimeoutId);
                    retryTimeoutId = null;
                }
            }
        });

        // Observe the entire body for all DOM changes
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Script start
    hideAskLeeWidget();
    observeTaskPage();

})();
