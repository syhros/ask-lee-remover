// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix
// @namespace    http://tampermonkey.net/
// @version      1.0
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
        const cardRow = document.querySelector('div.card-padding.row');
        if (cardRow && !cardRowAdjusted) {
            const children = cardRow.querySelectorAll(':scope > div');
            if (children.length >= 2) {
                children[0].className = 'col-lg-8 col-md-8';
                children[1].className = 'col-lg-4 col-md-4';
                console.log("Adjusted card-padding row children classes");
                cardRowAdjusted = true;
            }
        }

        // 3) adjust main-content-column-small and remove .row after cardRow fix
        const mainContentDiv = document.querySelector('div.main-content-column-small');
        const mainContentRow = document.querySelector('div.row');
        if (mainContentDiv && !mainContentAdjusted) {
            mainContentDiv.classList.remove('main-content-column-small');
            mainContentDiv.classList.add('main-content');
            if (mainContentRow) {
                mainContentRow.classList.remove('row');
                console.log("Removed 'row' class from mainContentRow");
            }
            console.log("Adjusted main-content-column-small to main-content");
            mainContentAdjusted = true;
        }

        // stop observer
        if (widgetRemoved && mainContentAdjusted && cardRowAdjusted && observer) {
            observer.disconnect();
            console.log("All tasks complete, observer disconnected.");
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => modifyPage());
    } else {
        modifyPage();
    }

    const observer = new MutationObserver(() => modifyPage(observer));
    observer.observe(document.body, { childList: true, subtree: true });
})();
