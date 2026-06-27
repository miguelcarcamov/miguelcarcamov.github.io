(function () {
  "use strict";

  var STORAGE_KEY = "site-lang";
  var DEFAULT_LANG = "en";
  var SUPPORTED = { en: true, es: true };

  var translations = {};
  var currentLang = DEFAULT_LANG;

  function readEmbeddedTranslations() {
    var node = document.getElementById("i18n-data");
    if (!node) return {};
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (err) {
      console.warn("i18n: failed to parse translation data", err);
      return {};
    }
  }

  function getQueryLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var lang = (params.get("lang") || "").toLowerCase();
      return SUPPORTED[lang] ? lang : null;
    } catch (err) {
      return null;
    }
  }

  function resolveLang() {
    var fromQuery = getQueryLang();
    if (fromQuery) {
      try {
        localStorage.setItem(STORAGE_KEY, fromQuery);
      } catch (err) {
        /* ignore */
      }
      return fromQuery;
    }
    // No ?lang=es in the URL means English — do not restore Spanish from storage.
    try {
      localStorage.setItem(STORAGE_KEY, DEFAULT_LANG);
    } catch (err) {
      /* ignore */
    }
    return DEFAULT_LANG;
  }

  function lookup(key) {
    var parts = key.split(".");
    var value = translations[currentLang];
    for (var i = 0; i < parts.length; i += 1) {
      if (!value || typeof value !== "object") return null;
      value = value[parts[i]];
    }
    return typeof value === "string" ? value : null;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var text = lookup(key);
      if (text) el.textContent = text;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      var text = lookup(key);
      if (text) el.setAttribute("placeholder", text);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (!key) return;
      var text = lookup(key);
      if (text) el.setAttribute("title", text);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key) return;
      var text = lookup(key);
      if (text) el.setAttribute("aria-label", text);
    });
    document.querySelectorAll("[data-i18n-block]").forEach(function (el) {
      var blockLang = el.getAttribute("data-i18n-block");
      if (!blockLang) return;
      if (blockLang === currentLang) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    });
    var toggle = document.getElementById("lang-toggle");
    if (toggle) {
      var toggleKey = currentLang === "es" ? "lang_toggle" : "lang_toggle";
      var toggleText = lookup("lang_toggle");
      if (toggleText) toggle.textContent = toggleText;
      toggle.setAttribute("aria-label", toggleText || "Toggle language");
    }
  }

  function buildUrlWithLang(lang) {
    var url = new URL(window.location.href);
    if (lang === DEFAULT_LANG) {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", lang);
    }
    return url.pathname + url.search + url.hash;
  }

  function switchLang(lang) {
    if (!SUPPORTED[lang] || lang === currentLang) return;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      /* ignore */
    }
    applyTranslations();
    document.dispatchEvent(new CustomEvent("site:langchange", { detail: { lang: lang } }));
  }

  function enhanceLinks() {
    document.querySelectorAll("a[href]").forEach(function (anchor) {
      var href = anchor.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;
      if (anchor.hasAttribute("data-i18n-skip")) return;
      /* In-page section nav — main.js handles transitions and keeps ?lang= in the URL. */
      if (anchor.hasAttribute("data-home-hash")) return;
      if (anchor.dataset.i18nBound === "1") return;
      anchor.dataset.i18nBound = "1";
      anchor.addEventListener("click", function (e) {
        if (currentLang === DEFAULT_LANG) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        try {
          var target = new URL(anchor.href, window.location.origin);
          if (target.origin !== window.location.origin) return;
          if (!target.searchParams.get("lang")) {
            e.preventDefault();
            target.searchParams.set("lang", currentLang);
            window.location.href = target.pathname + target.search + target.hash;
          }
        } catch (err) {
          /* ignore malformed URLs */
        }
      });
    });
  }

  function initToggle() {
    var toggle = document.getElementById("lang-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var next = currentLang === "es" ? "en" : "es";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (err) {
        /* ignore */
      }
      window.location.href = buildUrlWithLang(next);
    });
  }

  function init() {
    translations = readEmbeddedTranslations();
    currentLang = resolveLang();
    applyTranslations();
    initToggle();
    enhanceLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SiteI18n = {
    getLang: function () { return currentLang; },
    t: lookup,
    apply: applyTranslations
  };
})();
