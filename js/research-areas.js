(function () {
    "use strict";

    function initResearchAreas() {
        var root = document.querySelector("[data-research-areas]");
        if (!root) {
            return;
        }

        var tabs = root.querySelectorAll("[data-research-tab]");
        var panels = root.querySelectorAll("[data-research-panel]");

        function activate(tabKey) {
            tabs.forEach(function (tab) {
                var isActive = tab.getAttribute("data-research-tab") === tabKey;
                tab.classList.toggle("active", isActive);
                tab.setAttribute("aria-selected", isActive ? "true" : "false");
                tab.tabIndex = isActive ? 0 : -1;
            });

            panels.forEach(function (panel) {
                var isActive = panel.getAttribute("data-research-panel") === tabKey;
                panel.classList.toggle("active", isActive);
                if (isActive) {
                    panel.removeAttribute("hidden");
                } else {
                    panel.setAttribute("hidden", "");
                }
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                activate(tab.getAttribute("data-research-tab"));
            });

            tab.addEventListener("keydown", function (e) {
                var keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (keys.indexOf(e.key) === -1) {
                    return;
                }
                e.preventDefault();
                var list = Array.prototype.slice.call(tabs);
                var index = list.indexOf(tab);
                if (e.key === "Home") {
                    index = 0;
                } else if (e.key === "End") {
                    index = list.length - 1;
                } else if (e.key === "ArrowRight") {
                    index = (index + 1) % list.length;
                } else if (e.key === "ArrowLeft") {
                    index = (index - 1 + list.length) % list.length;
                }
                list[index].focus();
                activate(list[index].getAttribute("data-research-tab"));
            });
        });

        var hash = window.location.hash.replace(/^#/, "");
        if (hash && root.querySelector('[data-research-tab="' + hash + '"]')) {
            activate(hash);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initResearchAreas);
    } else {
        initResearchAreas();
    }
})();
