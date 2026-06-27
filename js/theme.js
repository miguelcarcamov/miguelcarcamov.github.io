(function () {
  "use strict";

  var STORAGE_KEY = "site-theme";

  function preferredTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") return stored;
    } catch (err) {
      /* ignore */
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      var isDark = theme === "dark";
      toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      toggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
    document.dispatchEvent(new CustomEvent("site:themechange", { detail: { theme: theme } }));
  }

  function initToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || preferredTheme();
      var next = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        /* ignore */
      }
      applyTheme(next);
    });
  }

  function init() {
    applyTheme(preferredTheme());
    initToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SiteTheme = {
    get: function () {
      return document.documentElement.getAttribute("data-theme") || preferredTheme();
    },
    set: applyTheme
  };
})();
