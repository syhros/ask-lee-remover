// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix (SPA Safe)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Removes Ask Lee widget, adjusts main content, and fixes card-padding row columns, even on WIMS SPA transitions
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/wims/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let observer;

    function applyFixes() {
        console.log("[WIMS Fix] Checking page");

        // only run on taskdetail
        if (!window.location.pathname.includes('/wims/taskdetail/')) {
            console.log("[WIMS Fix] Not on taskdetail page, skipping.");
            return;
        }

        let widgetRemoved = false;
        let mainContentAdjusted = false;
        let cardRowAdjusted = false;

        function modifyPage(observer) {
            // 1) remove ask-lee-widget-container
            const askLeeIframe = document.querySelector('iframe.ask-lee-widget-container');
            const askLeeDiv = document.querySelector('div.ask-lee-widget-container');
            if ((askLeeIframe || askLeeDiv) && !widgetRemoved) {
                if (askLeeIframe) askLeeIframe.remove();
                if (askLeeDiv) askLeeDiv.remove();
                console.log("Removed ask-lee-widget-container");
                widgetRemoved = true;
            }

            // 2) adjust card-padding row children
            const cardRows = document.querySelectorAll('div.card-padding.row');
            for (const candidate of cardRows) {
                const children = candidate.querySelectorAll(':scope > div.col-lg-8.col-md-6');
                if (children.length >= 2) {
                    children[0].className = 'col-lg-8 col-md-8';
                    children[1].className = 'col-lg-4 col-md-4';
                    console.log("Adjusted children in the correct cardRow");
                    cardRowAdjusted = true;
                    break;
                }
            }

            // 3) adjust main-content-column-small
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv && !mainContentAdjusted) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                console.log("Adjusted main-content-column-small to main-content");
            }

            // 4) remove .row class from first plain row div (not card-padding)
            const plainRow = document.querySelector('div.row:not(.card-padding)');
            if (plainRow && !mainContentAdjusted) {
                plainRow.classList.remove('row');
                console.log("Removed 'row' class from first plain row div");
                mainContentAdjusted = true;
            }

            if (widgetRemoved && mainContentAdjusted && cardRowAdjusted && observer) {
                observer.disconnect();
                console.log("All tasks complete, observer disconnected.");
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => modifyPage(observer));
        } else {
            modifyPage(observer);
        }

        observer = new MutationObserver(() => modifyPage(observer));
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // run on first load
    applyFixes();

    // monitor URL changes for SPA
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log("[WIMS Fix] URL changed to", currentUrl);
            applyFixes();
        }
    }).observe(document.body, { childList: true, subtree: true });

})();
