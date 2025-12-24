/**
 * Section Loader
 * Dynamically loads HTML sections from the sections/ directory
 */

(function() {
    'use strict';

    // Define all sections in order
    const sections = [
        'home',
        'about',
        'resume',
        'publications',
        'teaching',
        'collaborators',
        'students',
        'service',
        'blog',
        'contact'
    ];

    /**
     * Load a single section
     */
    function loadSection(sectionName) {
        return fetch(`sections/${sectionName}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${sectionName}.html: ${response.statusText} (${response.status})`);
                }
                return response.text();
            })
            .then(html => {
                if (!html || html.trim().length === 0) {
                    throw new Error(`Empty content in ${sectionName}.html`);
                }
                
                // Create a temporary container to parse the HTML
                const temp = document.createElement('div');
                temp.innerHTML = html.trim();
                
                // Get the section element
                const section = temp.querySelector('section');
                if (!section) {
                    console.error(`No section element found in ${sectionName}.html. HTML content:`, html.substring(0, 200));
                    throw new Error(`No section element found in ${sectionName}.html`);
                }
                
                return section;
            })
            .catch(error => {
                console.error(`Error loading section ${sectionName}:`, error);
                throw error;
            });
    }

    /**
     * Load all sections in order
     */
    function loadAllSections() {
        const mainContent = document.querySelector('.main_content');
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }

        console.log('Starting to load sections...');
        // Clear existing content (except navigation)
        mainContent.innerHTML = '';

        // Load all sections sequentially
        const loadPromises = sections.map(sectionName => 
            loadSection(sectionName)
                .then(section => {
                    console.log(`Loaded section: ${sectionName}`);
                    mainContent.appendChild(section);
                    return section;
                })
                .catch(error => {
                    console.error(`Error loading ${sectionName}:`, error);
                    // Create a placeholder section if loading fails
                    const placeholder = document.createElement('section');
                    placeholder.id = sectionName;
                    placeholder.className = 'single_page';
                    placeholder.innerHTML = `<div class="container"><p style="color: red;">Error loading ${sectionName} section: ${error.message}</p></div>`;
                    mainContent.appendChild(placeholder);
                })
        );

        // Wait for all sections to load
        Promise.all(loadPromises).then(() => {
            console.log('All sections loaded successfully');
            
            // Dispatch custom event for other scripts (main.js listens for this)
            const event = new CustomEvent('sectionsLoaded', { 
                detail: { sections: sections } 
            });
            document.dispatchEvent(event);
            
            // Small delay to ensure DOM is fully updated
            setTimeout(() => {
                // Re-initialize main.js functionality if needed
                if (typeof window.initMainJS === 'function') {
                    window.initMainJS();
                }
            }, 100);
        });
    }

    // Wait for jQuery to be loaded before loading sections
    function waitForJQuery() {
        if (typeof jQuery !== 'undefined') {
            loadAllSections();
        } else {
            setTimeout(waitForJQuery, 50);
        }
    }

    // Load sections when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForJQuery);
    } else {
        // DOM is already ready
        waitForJQuery();
    }

})();

