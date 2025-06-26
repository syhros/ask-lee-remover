// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Removes Ask Lee widget, adjusts main content, and fixes card-padding row columns
// @author       @camrees
// @match        https://optimus-internal-eu.amazon.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let widgetRemoved = false;
    let mainContentAdjusted = false;
    let cardRowAdjusted = false;

    function modifyPage(observer) {
        // Remove ask-lee-widget-container (iframe or div)
        const askLeeIframe = document.querySelector('iframe.ask-lee-widget-container');
        const askLeeDiv = document.querySelector('div.ask-lee-widget-container');
        if ((askLeeIframe || askLeeDiv) && !widgetRemoved) {
            if (askLeeIframe) askLeeIframe.remove();
            if (askLeeDiv) askLeeDiv.remove();
            console.log("Removed ask-lee-widget-container");
            widgetRemoved = true;
        }

        // Adjust main-content-column-small
        const mainContentDiv = document.querySelector('div.main-content-column-small');
        if (mainContentDiv && !mainContentAdjusted) {
            mainContentDiv.classList.remove('main-content-column-small');
            mainContentDiv.classList.add('main-content');
            console.log("Adjusted main-content-column-small to main-content");
            mainContentAdjusted = true;
        }

        // Adjust card-padding row children
        const cardRow = document.querySelector('div.card-padding.row');
        if (cardRow && !cardRowAdjusted) {
            const children = cardRow.querySelectorAll(':scope > div');
            if (children.length >= 2) {
                // first child to col-lg-8 col-md-8
                children[0].className = 'col-lg-8 col-md-8';
                // second child from col-lg-8 col-md-6 to col-lg-4 col-md-4
                children[1].className = 'col-lg-4 col-md-4';
                console.log("Adjusted card-padding row children classes");
                cardRowAdjusted = true;
            }
        }

        // Stop observer once complete
        if (widgetRemoved && mainContentAdjusted && cardRowAdjusted && observer) {
            observer.disconnect();
            console.log("All tasks complete, observer disconnected.");
        }
    }

    // initial
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => modifyPage());
    } else {
        modifyPage();
    }

    // observer
    const observer = new MutationObserver(() => modifyPage(observer));
    observer.observe(document.body, { childList: true, subtree: true });

})();
