// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.3 // Increased version number for clarity
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
    let firstRowAdjusted = false; // Flag for the first div.row adjustment
    let observer; // Will store our MutationObserver instance
    let lastUrl = location.href; // Track the current URL for navigation changes

    /**
     * Resets all adjustment flags, typically called on URL change.
     */
    function resetFixes() {
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
            } else {
                console.log("[WIMS Fix] DEBUG: 'main-content-column-small' not found yet.");
            }
        }

        // --- Adjust the *first* div.row found on the page ---
        if (!firstRowAdjusted) {
            const firstRowDiv = document.querySelector('div.row');
            if (firstRowDiv && firstRowDiv.classList.contains('row')) {
                // This condition avoids modifying the card-padding row if it happens to be the first one.
                // Adjust this logic if you intend to apply 'row-null' to ALL 'div.row's including card-padding.
                if (!firstRowDiv.classList.contains('card-padding')) {
                    firstRowDiv.classList.remove('row');
                    firstRowDiv.classList.add('row-null');
                    firstRowAdjusted = true;
                    console.log("[WIMS Fix] Changed first 'div.row' to 'row-null'.");
                } else {
                    console.log("[WIMS Fix] DEBUG: First 'div.row' is also 'card-padding.row', skipping 'row-null' adjustment for distinct handling.");
                    // If you intend for this "first row" adjustment to apply to the card-padding row
                    // if it's the first one, you'd remove this 'if' block.
                    // If it should only apply to non-card-padding rows, and the first is card-padding,
                    // the flag will remain false, and it will keep looking for a suitable 'firstRowDiv'.
                }
            } else {
                console.log("[WIMS Fix] DEBUG: First 'div.row' not found yet or not suitable.");
            }
        }

        // --- Adjust card-padding row children classes ---
        if (!cardRowAdjusted) {
            const cardRows = document.querySelectorAll('div.card-padding.row');
            let foundSuitableCardRowAndChildren = false; // Track if we found *and modified* a suitable row
            for (const candidate of cardRows) {
                // Get ALL direct div children. This is more robust than looking for specific starting classes.
                const children = candidate.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Safely remove any existing Bootstrap column classes from the first child
                    firstColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            firstColumn.classList.remove(cls);
                        }
                    });
                    firstColumn.classList.add('col-lg-8', 'col-md-8');

                    // Safely remove any existing Bootstrap column classes from the second child
                    secondColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            secondColumn.classList.remove(cls);
                        }
                    });
                    secondColumn.classList.add('col-lg-4', 'col-md-4');

                    console.log("[WIMS Fix] Adjusted children in a card-padding row.");
                    cardRowAdjusted = true;
                    foundSuitableCardRowAndChildren = true;
                    break; // Assuming only one 'card-padding.row' needs this specific adjustment, exit loop
                }
            }
            if (!foundSuitableCardRowAndChildren) {
                console.log("[WIMS Fix] DEBUG: 'card-padding.row' or its suitable children not found yet.");
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
            assignButton.setAttribute('data-wims-fix-listener', 'true');
            console.log("[WIMS Fix] Found Assign button, attaching listener.");

            assignButton.addEventListener('click', () => {
                console.log("[WIMS Fix] Assign button clicked, re-applying layout fixes after short delay...");
                setTimeout(applyLayoutFixes, 500); // Give the page a moment to re-render
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
            // Check for URL change on every mutation
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed detected. Resetting script state and re-evaluating.");
                resetFixes(); // Reset flags to re-apply fixes on the new page
                lastUrl = location.href; // Update last URL
            }

            // Ensure the widget is hidden. This will only run once due to the 'widgetHidden' flag.
            hideAskLeeWidget();

            // Only proceed with layout fixes if we are on a task details page
            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                // Always attempt to apply fixes if on a task detail page and not all are done
                applyLayoutFixes();
                // Monitor for the assign button on task detail pages
                monitorAssignButton();
            } else {
                // If we are no longer on a task details page, reset flags if they were set,
                // so the fixes will be re-attempted if we navigate back to a task page.
                if (mainContentAdjusted || cardRowAdjusted || firstRowAdjusted) {
                    console.log("[WIMS Fix] Not on a task details page. Ensuring adjustment flags are reset.");
                    resetFixes();
                }
            }

            // If all the necessary fixes are applied, disconnect the observer to save resources.
            if (widgetHidden && mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
                currentObserver.disconnect();
                console.log("[WIMS Fix] All required fixes applied and verified, observer disconnected.");
            }
        });

        // Start observing the entire body for child list changes and subtree modifications.
        // This makes the observer react to most DOM changes, including those from SPAs.
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Script Initialization ---
    // Hide the Ask Lee widget as early as possible
    hideAskLeeWidget();

    // Start observing for page content changes, especially for task detail pages
    observeTaskPage();

})();
