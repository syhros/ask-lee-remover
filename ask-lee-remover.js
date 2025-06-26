// ==UserScript==
// @name         Ask Lee Remover & WIMs Sizing Fix (clone & apply on task details)
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Duplicate task-details-page, fix layout on duplicate only, remove duplicate on SPA URL change
// @match        https://optimus-internal-eu.amazon.com/wims/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let observer;
    let duplicatePage = null;
    let lastPathname = location.pathname;

    // Remove Ask Lee iframe/div globally (original page and duplicate)
    function removeAskLee(root = document) {
        const askLeeIframe = root.querySelector('iframe.ask-lee-widget-container');
        const askLeeDiv = root.querySelector('div.ask-lee-widget-container');
        if (askLeeIframe) askLeeIframe.remove();
        if (askLeeDiv) askLeeDiv.remove();
        if (askLeeIframe || askLeeDiv) {
            console.log("Removed ask-lee-widget-container");
        }
    }

    // Apply your layout fixes ONLY on a given root element (the duplicate)
    function applyLayoutFixes(root) {
        console.log("[WIMS Fix] Applying layout changes to duplicate");

        const cardRows = root.querySelectorAll('div.card-padding.row');
        for (const candidate of cardRows) {
            const children = candidate.querySelectorAll(':scope > div.col-lg-8.col-md-6');
            if (children.length >= 2) {
                children[0].className = 'col-lg-8 col-md-8';
                children[1].className = 'col-lg-4 col-md-4';
                console.log("Adjusted cardRow columns");
            }
        }

        const mainContentDiv = root.querySelector('div.main-content-column-small');
        if (mainContentDiv) {
            mainContentDiv.classList.remove('main-content-column-small');
            mainContentDiv.classList.add('main-content');
            console.log("Adjusted main-content-column-small to main-content");
        }

        const plainRow = root.querySelector('div.row:not(.card-padding)');
        if (plainRow) {
            plainRow.classList.remove('row');
            console.log("Removed row class from plain row");
        }
    }

    // Clone and fix the task details page
    function cloneAndFixTaskDetails() {
        const original = document.querySelector('.task-details-page');
        if (!original || duplicatePage) return;

        // Clone the whole task details container deeply
        duplicatePage = original.cloneNode(true);
        duplicatePage.id = 'task-details-page-duplicate';

        // Insert the duplicate after the original or somewhere suitable
        original.style.display = 'none';  // optionally hide original
        original.parentNode.insertBefore(duplicatePage, original.nextSibling);

        removeAskLee(duplicatePage);
        applyLayoutFixes(duplicatePage);

        console.log("[WIMS Fix] Cloned and fixed task details page");
    }

    // Remove duplicate and show original again
    function removeDuplicate() {
        if (duplicatePage) {
            duplicatePage.remove();
            duplicatePage = null;

            const original = document.querySelector('.task-details-page');
            if (original) original.style.display = ''; // show original

            console.log("[WIMS Fix] Removed duplicate and restored original");
        }
    }

    // Check URL and toggle duplicate accordingly
    function checkUrlAndToggle() {
        const isTaskDetail = /^\/wims\/taskdetails\/.*/.test(location.pathname);

        if (isTaskDetail) {
            cloneAndFixTaskDetails();
        } else {
            removeDuplicate();
        }
    }

    // Hook into history API to detect SPA navigation changes
    function hookHistoryEvents() {
        const pushState = history.pushState;
        history.pushState = function() {
            pushState.apply(this, arguments);
            setTimeout(checkUrlAndToggle, 100);
        };

        const replaceState = history.replaceState;
        history.replaceState = function() {
            replaceState.apply(this, arguments);
            setTimeout(checkUrlAndToggle, 100);
        };

        window.addEventListener('popstate', () => {
            setTimeout(checkUrlAndToggle, 100);
        });
    }

    // Initial cleanup
    removeAskLee();
    checkUrlAndToggle();
    hookHistoryEvents();

    // Also observe DOM in case page loads or changes late
    observer = new MutationObserver(() => {
        removeAskLee();
        checkUrlAndToggle();
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
