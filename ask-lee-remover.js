// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Hides Ask Lee widget and adjusts task page layout for better viewing.
// @author       Your Name
// @match        https://your-task-details-page.com/* // IMPORTANT: Change this to your actual task page URL(s)!
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- State Variables to track completed fixes ---
    let widgetHidden = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let observer; // Will store our MutationObserver instance

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
     * Applies layout adjustments to the main content and card row sections.
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

        // --- Adjust card-padding row children classes ---
        if (!cardRowAdjusted) {
            const cardRow = document.querySelector('.card-padding.row');
            if (cardRow) {
                const children = cardRow.children;
                // Ensure there are at least two children to modify
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Remove existing Bootstrap column classes from the first child
                    firstColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            firstColumn.classList.remove(cls);
                        }
                    });
                    // Add the desired classes for the first child
                    firstColumn.classList.add('col-lg-8', 'col-md-8');
                    console.log("[WIMS Fix] Adjusted first column in card-padding row to col-lg-8 col-md-8.");

                    // Remove existing Bootstrap column classes from the second child
                    secondColumn.classList.forEach(cls => {
                        if (cls.startsWith('col-')) {
                            secondColumn.classList.remove(cls);
                        }
                    });
                    // Add the desired classes for the second child
                    secondColumn.classList.add('col-lg-4', 'col-md-4');
                    console.log("[WIMS Fix] Adjusted second column in card-padding row to col-lg-4 col-md-4.");

                    cardRowAdjusted = true;
                } else {
                    console.log("[WIMS Fix] Not enough children in '.card-padding.row' for column adjustment.");
                }
            }
        }

        // Check if all primary layout fixes are applied
        if (mainContentAdjusted && cardRowAdjusted) {
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
     * specifically looking for the '.task-details-page' to trigger layout fixes.
     */
    function observeTaskPage() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            // Ensure the widget is hidden regardless of other conditions
            hideAskLeeWidget();

            // Only proceed with layout fixes if we are on a task details page
            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                applyLayoutFixes(); // Attempt to apply fixes
                monitorAssignButton(); // Monitor for the assign button

                // If all the necessary fixes are applied, disconnect the observer
                if (widgetHidden && mainContentAdjusted && cardRowAdjusted) {
                    currentObserver.disconnect();
                    console.log("[WIMS Fix] All fixes applied and verified, observer disconnected.");
                }
            }
        });

        // Start observing the entire body for child list changes and subtree modifications
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Script Initialization ---
    // Hide the Ask Lee widget as early as possible
    hideAskLeeWidget();

    // Start observing for page content changes, especially for task detail pages
    observeTaskPage();

})();
