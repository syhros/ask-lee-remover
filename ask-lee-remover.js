// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Hides Ask Lee widget and adjusts task page layout for better viewing, including initial row modification.
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- State Variables to track completed fixes ---
    let widgetHidden = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let firstRowAdjusted = false; // New flag for the first div.row adjustment
    let observer; // Will store our MutationObserver instance
    let lastUrl = location.href; // Track the current URL for navigation changes

    /**
     * Resets all adjustment flags, typically called on URL change.
     */
    function resetFixes() {
        // widgetHidden is handled by GM_addStyle and is generally persistent,
        // but resetting it here keeps the state consistent for re-evaluation if needed.
        widgetHidden = false;
        mainContentAdjusted = false;
        cardRowAdjusted = false;
        firstRowAdjusted = false;
        console.log("[WIMS Fix] Resetting all fix flags due to URL change or re-evaluation.");
    }

    /**
     * Hides the 'Ask Lee' widget immediately using CSS injection.
     * This method is fast and prevents initial flickering.
     */
    function hideAskLeeWidget() {
        if (!widgetHidden) {
            GM_addStyle('.ask-lee-widget-container { display: none !important; }');
            widgetHidden = true;
            console.log("[WIMS Fix] Ask Lee widget hidden via GM_addStyle.");
        }
    }

    /**
     * Applies layout adjustments to the main content, first 'div.row', and card row sections.
     * This function is designed to be called multiple times until all fixes are applied.
     */
    function applyLayoutFixes() {
        // --- Adjust main content column class ---
        if (!mainContentAdjusted) {
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                mainContentAdjusted = true;
                console.log("[WIMS Fix] Changed 'main-content-column-small' to 'main-content'.");
            }
        }

        // --- Adjust the *first* div.row found on the page ---
        if (!firstRowAdjusted) {
            const firstRowDiv = document.querySelector('div.row');
            // Ensure it's not the card-padding.row if you intend to treat them separately
            // And ensure it has the 'row' class before attempting to remove it
            if (firstRowDiv && firstRowDiv.classList.contains('row')) {
                // If it's a 'row' you want to change globally (and it's not the specific card-padding row), modify it.
                // This condition avoids modifying the card-padding row if it happens to be the first one.
                // Adjust this condition if you want to apply 'row-null' to ALL 'div.row' initially.
                if (!firstRowDiv.classList.contains('card-padding')) {
                    firstRowDiv.classList.remove('row');
                    firstRowDiv.classList.add('row-null');
                    firstRowAdjusted = true;
                    console.log("[WIMS Fix] Changed first 'div.row' to 'row-null'.");
                } else {
                    console.log("[WIMS Fix] First 'div.row' is also 'card-padding.row', skipping 'row-null' adjustment for distinct handling.");
                    // If you want to force it to be firstRowAdjusted to true even if it's the card-padding.row
                    // and you're not specifically modifying it here, you might set firstRowAdjusted = true;
                    // but usually, you'd only set it if you performed the intended action.
                }
            }
        }

        // --- Adjust card-padding row children classes ---
        if (!cardRowAdjusted) {
            // Using querySelectorAll to check if multiple .card-padding.row exist,
            // but the logic inside aims to adjust the first suitable one found.
            const cardRows = document.querySelectorAll('div.card-padding.row');
            for (const candidate of cardRows) {
                // Get ALL direct div children, regardless of their initial classes
                const children = candidate.querySelectorAll(':scope > div');
                // Ensure there are at least two children that are relevant for modification
                // You might need to add more specific checks for children's content if they are generic divs
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Safely remove any existing Bootstrap column classes from the first child
                    // This is more robust than just overwriting className, as it preserves other classes.
                    firstColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            firstColumn.classList.remove(cls);
                        }
                    });
                    // Add the desired classes for the first child
                    firstColumn.classList.add('col-lg-8', 'col-md-8');
                    console.log("[WIMS Fix] Adjusted first column in a card-padding row to col-lg-8 col-md-8.");

                    // Safely remove any existing Bootstrap column classes from the second child
                    secondColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            secondColumn.classList.remove(cls);
                        }
                    });
                    // Add the desired classes for the second child
                    secondColumn.classList.add('col-lg-4', 'col-md-4');
                    console.log("[WIMS Fix] Adjusted second column in a card-padding row to col-lg-4 col-md-4.");

                    cardRowAdjusted = true; // Set to true after one successful application
                    break; // Assuming only one 'card-padding.row' needs this specific adjustment, exit loop
                } else {
                    console.log("[WIMS Fix] Not enough direct 'div' children in a '.card-padding.row' for column adjustment.");
                }
            }
        }

        // Check if all primary layout fixes are applied
        if (mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
            console.log("[WIMS Fix] All primary layout adjustments applied.");
        }
    }

    /**
     * Monitors for the 'Assign to me' button and re-applies fixes when clicked,
     * as page content might shift or re-render.
     */
    function monitorAssignButton() {
        const assignButton = document.querySelector('button[data-testid="assign-to-me-button"]');
        if (assignButton && !assignButton.hasAttribute('data-wims-fix-listener')) {
            // Add a custom attribute to prevent adding multiple listeners
            assignButton.setAttribute('data-wims-fix-listener', 'true');
            console.log("[WIMS Fix] Found Assign button, attaching listener.");

            assignButton.addEventListener('click', () => {
                console.log("[WIMS Fix] Assign button clicked, re-applying layout fixes after short delay...");
                // Use setTimeout to allow the page to re-render after the click action
                setTimeout(applyLayoutFixes, 500);
            });
        }
    }

    /**
     * Main observer function to watch for changes in the DOM,
     * specifically looking for the '.task-details-page' to trigger layout fixes
     * and handle URL changes for re-initialization.
     */
    function observeTaskPage() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            // Check for URL change
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed. Re-initializing script state.");
                resetFixes(); // Reset flags to re-apply fixes on the new page
                lastUrl = location.href; // Update last URL
            }

            // Ensure the widget is hidden regardless of other conditions
            // This will only apply if not already hidden due to the 'widgetHidden' flag.
            hideAskLeeWidget();

            // Only proceed with layout fixes if we are on a task details page
            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                applyLayoutFixes(); // Attempt to apply fixes
                monitorAssignButton(); // Monitor for the assign button
            } else {
                // If we are no longer on a task details page within the @match scope,
                // and if any specific task-page adjustments were made, we might need to revert them
                // if the elements are reused. For now, resetting flags means they won't re-apply
                // unless a task detail page is found again. Explicit revert logic depends on
                // how the SPA handles navigation (destroying/reusing elements).
                if (mainContentAdjusted || cardRowAdjusted || firstRowAdjusted) {
                    console.log("[WIMS Fix] No longer on a task details page, ensuring flags are reset for next page load.");
                    resetFixes(); // Reset flags so changes are not applied on non-task pages
                }
            }

            // If all the necessary fixes are applied, disconnect the observer
            // Only disconnect if all required modifications have been confirmed.
            if (widgetHidden && mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
                currentObserver.disconnect();
                console.log("[WIMS Fix] All fixes applied and verified, observer disconnected.");
            }
        });

        // Start observing the entire body for child list changes and subtree modifications
        // This makes the observer react to most DOM changes, including those from SPAs.
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Script Initialization ---
    // Hide the Ask Lee widget as early as possible
    hideAskLeeWidget();

    // Start observing for page content changes, especially for task detail pages
    observeTaskPage();

})();
