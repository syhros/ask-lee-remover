// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix (Final)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Removes Ask Lee widget on all pages, but adjusts layout only on taskdetail pages safely (SPA compatible)
// @match        https://optimus-internal-eu.amazon.com/wims/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let observer;

    function removeAskLee() {
        const askLeeIframe = document.querySelector('iframe.ask-lee-widget-container');
        const askLeeDiv = document.querySelector('div.ask-lee-widget-container');
        if (askLeeIframe) askLeeIframe.remove();
        if (askLeeDiv) askLeeDiv.remove();
        if (askLeeIframe || askLeeDiv) {
            console.log("Removed ask-lee-widget-container");
        }
    }

    function fixTaskDetailLayout() {
        console.log("[WIMS Fix] Applying task detail layout fixes");

        let widgetRemoved = false;
        let mainContentAdjusted = false;
        let cardRowAdjusted = false;

        function modifyPage(observer) {
            removeAskLee();

            // 1) adjust card-padding row children
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

            // 2) adjust main-content-column-small
            const mainContentDiv = document.querySelector('div.main-content-column-small');
            if (mainContentDiv && !mainContentAdjusted) {
                mainContentDiv.classList.remove('main-content-column-small');
                mainContentDiv.classList.add('main-content');
                console.log("Adjusted main-content-column-small to main-content");
            }

            // 3) remove .row class from first plain row div (not card-padding)
            const plainRow = document.querySelector('div.row:not(.card-padding)');
            if (plainRow && !mainContentAdjusted) {
                plainRow.classList.remove('row');
                console.log("Removed 'row' class from first plain row div");
                mainContentAdjusted = true;
            }

            if (cardRowAdjusted && mainContentAdjusted && observer) {
                observer.disconnect();
                console.log("All layout fixes done, observer disconnected");
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

    function onUrlChange() {
        console.log("[WIMS Fix] URL change detected:", location.pathname);

        // always remove Ask Lee, safe everywhere
        removeAskLee();

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (location.pathname.includes('/wims/taskdetail/')) {
            fixTaskDetailLayout();
        }
    }

    // monitor SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            onUrlChange();
        }
    }).observe(document.body, { childList: true, subtree: true });

    // initial run
    removeAskLee();
    if (location.pathname.includes('/wims/taskdetail/')) {
        fixTaskDetailLayout();
    }

})();
