// ==UserScript==
// @name         WIMS Task Page Layout Fixer
// @namespace    http://tampermonkey.net/
// @version      1.9 // Increment version for toggle feature
// @description  Hides Ask Lee widget and adjusts task page layout for better viewing with toggle button.
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // State flags to track completed adjustments
    let widgetHidden = true; // Default to hidden
    let toggleButtonCreated = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;
    let firstRowAdjusted = false;
    let observer;
    let lastUrl = location.href;
    let retryTimeoutId; // Variable to manage retry timeouts

    // A helper function to remove any existing column classes
    function removeColClasses(element) {
        if (element) {
            // Iterate over a copy of classList to safely remove classes during iteration
            Array.from(element.classList).forEach(cls => {
                if (cls.startsWith('col-')) {
                    element.classList.remove(cls);
                }
            });
        }
    }

    // Resets all flags, useful when navigating between pages
    function resetFixes() {
        // Don't reset widgetHidden state to preserve user preference
        toggleButtonCreated = false;
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

    // Hides/shows the 'Ask Lee' widget and creates toggle button
    function manageAskLeeWidget() {
        // Add CSS for both hiding and overlay positioning
        if (!document.getElementById('wims-ask-lee-styles')) {
            GM_addStyle(`
                /* Default hidden state */
                .ask-lee-widget-container.wims-hidden { 
                    display: none !important; 
                }
                
                /* Overlay state - appears above everything without affecting layout */
                .ask-lee-widget-container.wims-overlay { 
                    position: fixed !important;
                    top: 60px !important;
                    right: 20px !important;
                    z-index: 9999 !important;
                    background: white !important;
                    border: 2px solid #007dbc !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                    max-width: 350px !important;
                    max-height: 80vh !important;
                    overflow: auto !important;
                }
                
                /* Toggle button styles */
                #wims-ask-lee-toggle {
                    position: fixed !important;
                    top: 10px !important;
                    right: 20px !important;
                    z-index: 10000 !important;
                    background: #007dbc !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 4px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    font-weight: bold !important;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
                }
                
                #wims-ask-lee-toggle:hover {
                    background: #005a8b !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.3) !important;
                }
            `);
            
            // Add an ID to prevent duplicate styles
            const styleElement = document.createElement('style');
            styleElement.id = 'wims-ask-lee-styles';
            document.head.appendChild(styleElement);
        }

        // Apply the current state to the widget
        const widget = document.querySelector('.ask-lee-widget-container');
        if (widget) {
            if (widgetHidden) {
                widget.classList.add('wims-hidden');
                widget.classList.remove('wims-overlay');
            } else {
                widget.classList.remove('wims-hidden');
                widget.classList.add('wims-overlay');
            }
        }

        // Create toggle button if it doesn't exist
        if (!toggleButtonCreated && !document.getElementById('wims-ask-lee-toggle')) {
            const toggleButton = document.createElement('button');
            toggleButton.id = 'wims-ask-lee-toggle';
            toggleButton.textContent = 'Ask Lee';
            toggleButton.title = 'Toggle Ask Lee widget visibility';
            
            toggleButton.addEventListener('click', () => {
                widgetHidden = !widgetHidden;
                console.log("[WIMS Fix] Ask Lee widget toggled:", widgetHidden ? "hidden" : "shown");
                
                // Apply the toggle immediately
                manageAskLeeWidget();
            });
            
            document.body.appendChild(toggleButton);
            toggleButtonCreated = true;
            console.log("[WIMS Fix] Ask Lee toggle button created.");
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
        if (!cardRowAdjusted) {
            const cardRows = document.querySelectorAll('div.card-padding.row');
            let foundSuitableCardRowAndChildren = false; // Flag for this specific loop
            for (const candidate of cardRows) {
                // Selects ALL direct div children, regardless of their current classes
                const children = candidate.querySelectorAll(':scope > div');
                if (children.length >= 2) {
                    const firstColumn = children[0];
                    const secondColumn = children[1];

                    // Safely remove existing col- classes and add desired ones
                    removeColClasses(firstColumn);
                    firstColumn.classList.add('col-lg-8', 'col-md-6'); // Fixed: changed from col-md-8 to col-md-6

                    removeColClasses(secondColumn);
                    secondColumn.classList.add('col-lg-4', 'col-md-4');

                    cardRowAdjusted = true; // Set the main flag once fixed
                    foundSuitableCardRowAndChildren = true; // Indicate success within this loop
                    console.log("[WIMS Fix] Card-padding row children adjusted - First: col-lg-8 col-md-6, Second: col-lg-4 col-md-4");
                    break; // Assuming only one such row needs fixing
                }
            }
            if (!foundSuitableCardRowAndChildren) {
                console.log("[WIMS Fix DEBUG] 'card-padding.row' or its suitable children not found yet.");
            }
        }

        // Adjust the first 'div.row' that is not a 'card-padding' row
        if (!firstRowAdjusted) {
            const firstRowDiv = document.querySelector('div.row:not(.card-padding)');
            if (firstRowDiv) {
                firstRowDiv.classList.remove('row');
                firstRowDiv.classList.add('row-null');
                firstRowAdjusted = true;
                console.log("[WIMS Fix] First 'div.row' adjusted.");
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
            let urlChanged = false;
            if (location.href !== lastUrl) {
                console.log("[WIMS Fix] URL changed from", lastUrl, "to", location.href);
                resetFixes();
                lastUrl = location.href;
                urlChanged = true;
            }

            manageAskLeeWidget();

            const taskDetail = document.querySelector('.task-details-page');
            if (taskDetail) {
                // Always try to apply fixes when on task detail page, especially after URL change
                if (urlChanged || !(mainContentAdjusted && cardRowAdjusted && firstRowAdjusted)) {
                    console.log("[WIMS Fix] Applying layout fixes - URL changed:", urlChanged);
                    applyLayoutFixes();
                }
                monitorAssignButton();

                // If not all fixes are applied, schedule a retry.
                // This ensures fixes are applied even if elements load asynchronously.
                if (!(mainContentAdjusted && cardRowAdjusted && firstRowAdjusted)) {
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

            // Disconnect observer once layout fixes are complete (but keep the button working)
            if (mainContentAdjusted && cardRowAdjusted && firstRowAdjusted && toggleButtonCreated) {
                currentObserver.disconnect();
                console.log("[WIMS Fix] All fixes applied, observer disconnected.");
                // Clear any pending retry timeout when disconnecting
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
    manageAskLeeWidget();
    observeTaskPage();

})();
