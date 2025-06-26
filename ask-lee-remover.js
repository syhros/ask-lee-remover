// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Removes Ask Lee widget, adjusts main content, and fixes card-padding row columns
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/wims/taskdetail/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let widgetRemoved = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;

    function modifyPage(observer) {
        // 1) remove ask-lee-widget-container (iframe or div)
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

        // stop observer if all tasks are complete
        if (widgetRemoved && mainContentAdjusted && cardRowAdjusted && observer) {
            observer.disconnect();
            console.log("All tasks complete, observer disconnected.");
        }
    }

    // initial run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => modifyPage());
    } else {
        modifyPage();
    }

    const observer = new MutationObserver(() => modifyPage(observer));
    observer.observe(document.body, { childList: true, subtree: true });
})();
