(function () {
  "use strict";

  var indexPromise = null;
  var lunrIndex = null;
  var documents = [];
  var activeSectionFilter = "";

  function baseUrl() {
    var base = document.body && document.body.getAttribute("data-baseurl");
    return base ? String(base).replace(/\/$/, "") : "";
  }

  function t(key) {
    if (window.SiteI18n && typeof window.SiteI18n.t === "function") {
      return window.SiteI18n.t(key) || "";
    }
    return "";
  }

  function sectionLabel(section) {
    var map = {
      Publications: "search.section_publications",
      Software: "search.section_software",
      Courses: "search.section_courses",
      Join: "search.section_join",
      Writing: "search.section_writing",
      Media: "search.section_media",
      Theses: "search.section_theses"
    };
    var label = t(map[section] || "");
    return label || section;
  }

  function loadDocuments() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(baseUrl() + "/search-index.json")
      .then(function (res) {
        if (!res.ok) throw new Error("search-index.json unavailable");
        return res.json();
      })
      .then(function (data) {
        documents = Array.isArray(data) ? data : [];
        return documents;
      });
    return indexPromise;
  }

  function ensureLunr() {
    return new Promise(function (resolve, reject) {
      if (window.lunr) {
        resolve(window.lunr);
        return;
      }
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js";
      script.async = true;
      script.onload = function () { resolve(window.lunr); };
      script.onerror = function () { reject(new Error("Failed to load lunr")); };
      document.head.appendChild(script);
    });
  }

  function buildIndex(docs) {
    return lunr(function () {
      this.ref("id");
      this.field("title", { boost: 10 });
      this.field("body");
      this.field("section");
      docs.forEach(function (doc) {
        this.add(doc);
      }, this);
    });
  }

  function getDocument(id) {
    for (var i = 0; i < documents.length; i += 1) {
      if (documents[i].id === id) return documents[i];
    }
    return null;
  }

  function renderResults(results) {
    var list = document.getElementById("site-search-results");
    if (!list) return;
    list.innerHTML = "";

    if (!results.length) {
      var empty = document.createElement("li");
      empty.className = "site-search-empty";
      empty.textContent = t("search.no_results") || "No results found.";
      list.appendChild(empty);
      return;
    }

    results.slice(0, 12).forEach(function (result) {
      var doc = getDocument(result.ref);
      if (!doc) return;
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = doc.url;
      link.className = "site-search-result";
      var title = document.createElement("span");
      title.className = "site-search-result-title";
      title.textContent = doc.title;
      var meta = document.createElement("span");
      meta.className = "site-search-result-meta";
      meta.textContent = sectionLabel(doc.section) + (doc.meta ? " · " + doc.meta : "");
      link.appendChild(title);
      link.appendChild(meta);
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  function runSearch(query) {
    if (!lunrIndex || !query || query.trim().length < 2) {
      renderResults([]);
      return;
    }
    try {
      var results = lunrIndex.search(query.trim() + "*");
      if (!results.length) {
        results = lunrIndex.search(query.trim());
      }
      if (activeSectionFilter) {
        results = results.filter(function (result) {
          var doc = getDocument(result.ref);
          return doc && doc.section === activeSectionFilter;
        });
      }
      renderResults(results);
    } catch (err) {
      renderResults([]);
    }
  }

  function ensureSectionFilter() {
    var panel = document.querySelector(".site-search-panel");
    if (!panel || document.getElementById("site-search-section-filter")) return;

    var wrap = document.createElement("div");
    wrap.className = "site-search-filter-wrap";
    wrap.innerHTML =
      '<label class="site-search-filter-label" for="site-search-section-filter">' +
      (t("search.filter_label") || "Filter") +
      "</label>";

    var select = document.createElement("select");
    select.id = "site-search-section-filter";
    select.className = "site-search-section-filter";

    var sections = [];
    documents.forEach(function (doc) {
      if (doc.section && sections.indexOf(doc.section) < 0) {
        sections.push(doc.section);
      }
    });
    sections.sort();

    var allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = t("search.filter_all") || "All sections";
    select.appendChild(allOption);

    sections.forEach(function (section) {
      var option = document.createElement("option");
      option.value = section;
      option.textContent = sectionLabel(section);
      select.appendChild(option);
    });

    select.addEventListener("change", function () {
      activeSectionFilter = select.value;
      var input = document.getElementById("site-search-input");
      if (input && input.value) runSearch(input.value);
    });

    wrap.appendChild(select);
    var input = document.getElementById("site-search-input");
    if (input && input.parentNode) {
      input.parentNode.insertBefore(wrap, input.nextSibling);
    }
  }

  function openModal() {
    var modal = document.getElementById("site-search-modal");
    var input = document.getElementById("site-search-input");
    if (!modal || !input) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("site-search-open");
    input.value = "";
    renderResults([]);
    setTimeout(function () { input.focus(); }, 50);
  }

  function closeModal() {
    var modal = document.getElementById("site-search-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("site-search-open");
  }

  function bindModal() {
    var openBtn = document.getElementById("site-search-open");
    var modal = document.getElementById("site-search-modal");
    var backdrop = document.getElementById("site-search-backdrop");
    var input = document.getElementById("site-search-input");
    var closeBtn = document.getElementById("site-search-close");

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (input) {
      input.addEventListener("input", function () {
        runSearch(input.value);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.hidden) closeModal();
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (modal && modal.hidden) openModal();
        else closeModal();
      }
    });
  }

  function init() {
    bindModal();
    Promise.all([loadDocuments(), ensureLunr()])
      .then(function (parts) {
        documents = parts[0];
        lunrIndex = buildIndex(documents);
        ensureSectionFilter();
      })
      .catch(function (err) {
        console.warn("Site search unavailable:", err);
      });

    document.addEventListener("site:langchange", function () {
      var input = document.getElementById("site-search-input");
      var select = document.getElementById("site-search-section-filter");
      if (select) {
        Array.prototype.forEach.call(select.options, function (opt) {
          if (!opt.value) {
            opt.textContent = t("search.filter_all") || "All sections";
          } else {
            opt.textContent = sectionLabel(opt.value);
          }
        });
      }
      if (input && input.value) runSearch(input.value);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
