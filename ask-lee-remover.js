// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.4
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

    // Resets all adjustment flags
    function resetFixes() {
        widgetHidden = false;
        mainContentAdjusted = false;
        cardRowAdjusted = false;
        firstRowAdjusted = false;
        console.log("[WIMS Fix] Resetting flags.");
    }

    // Hides the 'Ask Lee' widget using CSS
    function hideAskLeeWidget() {
        if (!widgetHidden) {
            GM_addStyle('.ask-lee-widget-container { display: none !important; }');
            widgetHidden = true;
            console.log("[WIMS Fix] Ask Lee widget hidden.");
        }
    }

    // Applies layout adjustments to page elements
    function applyLayoutFixes() {
        // Adjust main content column class
        if (!mainContentAdjusted) {
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                mainContentAdjusted = true;
                console.log("[WIMS Fix] Main content class adjusted.");
            } else {
                console.log("[WIMS Fix] DEBUG: Main content div not found.");
            }
        }

        // Adjust the first div.row element
        if (!firstRowAdjusted) {
            const firstRowDiv = document.querySelector('div.row');
            if (firstRowDiv && firstRowDiv.classList.contains('row')) {
                if (!firstRowDiv.classList.contains('card-padding')) {
                    firstRowDiv.classList.remove('row');
                    firstRowDiv.classList.add('row-null');
                    firstRowAdjusted = true;
                    console.log("[WIMS Fix] First 'div.row' adjusted.");
                } else {
                    console.log("[WIMS Fix] DEBUG: First 'div.row' is 'card-padding.row', skipping 'row-null'.");
                }
            } else {
                console.log("[WIMS Fix] DEBUG: First 'div.row' not found or suitable.");
            }
        }

        // Adjust children of 'card-padding row'
        if (!cardRowAdjusted) {
            const cardRows = document.querySelectorAll('div.card-padding.row');
            let foundSuitableCardRowAndChildren = false;
            for (const candidate of cardRows) {
                const children = candidate.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Adjust classes for first column
                    firstColumn.classList.forEach(cls => { if (cls.startsWith('col-')) firstColumn.classList.remove(cls); });
                    firstColumn.classList.add('col-lg-8', 'col-md-8');

                    // Adjust classes for second column
                    secondColumn.classList.forEach(cls => { if (cls.startsWith('col-')) secondColumn.classList.remove(cls); });
                    secondColumn.classList.add('col-lg-4', 'col-md-4');

                    console.log("[WIMS Fix] Card-padding row children adjusted.");
                    cardRowAdjusted = true;
                    foundSuitableCardRowAndChildren = true;
                    break;
                }
            }
            if (!foundSuitableCardRowAndChildren) {
                console.log("[WIMS Fix] DEBUG: Card-padding row or its children not found.");
            }
        }

        // Log if all primary adjustments are complete
        if (mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
            console.log("[WIMS Fix] All primary adjustments applied.");
        }
    }

    // Monitors for the 'Assign to me' button and re-applies fixes on click
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

    // Main observer to watch for DOM changes and URL changes
    function observeTaskPage() {
        observer = new MutationObserver((mutationsList, currentObserver) => {
            // Reset flags if URL changes
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed, re-initializing.");
                resetFixes();
                lastUrl = location.href;
            }

            hideAskLeeWidget(); // Ensure widget is hidden

            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                applyLayoutFixes(); // Apply fixes if on a task details page
                monitorAssignButton(); // Monitor assign button
            } else {
                // If not on task details page, reset flags if adjustments were made
                if (mainContentAdjusted || cardRowAdjusted || firstRowAdjusted) {
                    console.log("[WIMS Fix] Not on task details page, flags reset.");
                    resetFixes();
                }
            }

            // Disconnect observer once all fixes are confirmed
            if (widgetHidden && mainContentAdjusted && cardRowAdjusted && firstRowAdjusted) {
                currentObserver.disconnect();
                console.log("[WIMS Fix] All fixes applied, observer disconnected.");
            }
        });

        // Observe the entire body for all DOM changes
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Script start
    hideAskLeeWidget(); // Initial hide for Ask Lee
    observeTaskPage(); // Start watching for page changes

})();
