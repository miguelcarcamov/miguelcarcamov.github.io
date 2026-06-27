(function () {
  "use strict";

  var root = document.getElementById("publication-explorer");
  var dataNode = document.getElementById("publications-index-data");
  var resultsNode = document.getElementById("publication-explorer-results");
  var fallbackNode = document.getElementById("publication-explorer-fallback");
  var countNode = document.getElementById("pub-explorer-count");
  var emptyNode = document.getElementById("pub-explorer-empty");
  var searchInput = document.getElementById("pub-explorer-search");
  var yearSelect = document.getElementById("pub-filter-year");
  var roleSelect = document.getElementById("pub-filter-role");
  var typeSelect = document.getElementById("pub-filter-type");
  var sortSelect = document.getElementById("pub-filter-sort");
  var oaCheckbox = document.getElementById("pub-filter-oa");

  if (!root || !dataNode || !resultsNode) return;

  var indexData = null;
  var publications = [];
  var expanded = {};
  var relatedByBibcode = {};
  var pubByBibcode = {};

  function t(key) {
    if (window.SiteI18n && typeof window.SiteI18n.t === "function") {
      return window.SiteI18n.t(key) || "";
    }
    return "";
  }

  function baseUrl() {
    var base = document.body && document.body.getAttribute("data-baseurl");
    return base ? String(base).replace(/\/$/, "") : "";
  }

  function withLang(url) {
    if (!url || url.charAt(0) !== "/") return url;
    var lang = window.SiteI18n && window.SiteI18n.getLang();
    if (lang === "es") {
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + "lang=es";
    }
    return url;
  }

  function parseIndex() {
    try {
      return JSON.parse(dataNode.textContent || "{}");
    } catch (err) {
      console.warn("publication-explorer: invalid index JSON", err);
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toBibTeX(pub) {
    var key = pub.bibcode || ("pub" + pub.year);
    var isConference = pub.publication_bucket === "conference";
    var type = isConference ? "inproceedings" : "article";
    var lines = ["@" + type + "{" + key + ","];
    lines.push("  author = {" + pub.authors + "},");
    lines.push("  title = {" + pub.title + "},");
    if (isConference) {
      lines.push("  booktitle = {" + pub.publication + "},");
    } else {
      lines.push("  journal = {" + pub.publication + "},");
    }
    if (pub.year) lines.push("  year = {" + pub.year + "},");
    if (pub.volume) lines.push("  volume = {" + pub.volume + "},");
    if (pub.issue) lines.push("  issue = {" + pub.issue + "},");
    if (pub.pages) lines.push("  pages = {" + pub.pages + "},");
    if (pub.doi) lines.push("  doi = {" + pub.doi + "},");
    lines.push("}");
    return lines.join("\n");
  }

  function toCitation(pub) {
    var parts = [];
    parts.push(pub.authors + ", \"" + pub.title + ",\"");
    parts.push("<em>" + escapeHtml(pub.publication) + "</em>");
    if (pub.volume) parts.push("vol. " + pub.volume);
    if (pub.issue) parts.push("no. " + pub.issue);
    if (pub.pages) parts.push("pp. " + pub.pages);
    parts.push(pub.date_label || pub.year);
    if (pub.doi) {
      parts.push('<a href="' + escapeHtml(pub.url) + '">DOI: ' + escapeHtml(pub.doi) + "</a>");
    }
    return parts.filter(Boolean).join(", ") + ".";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  function roleLabel(pub) {
    if (pub.is_first_author) return t("publications.badge_first_author") || "First author";
    if (pub.is_lead_author) return t("publications.badge_lead_author") || "Lead author";
    return t("publications.badge_coauthored") || "Co-authored";
  }

  function typeLabel(pub) {
    return pub.publication_bucket === "conference"
      ? (t("publications.badge_conference") || "Conference")
      : (t("publications.badge_journal") || "Journal");
  }

  function populateYears() {
    if (!yearSelect) return;
    var years = {};
    publications.forEach(function (pub) {
      if (pub.year) years[pub.year] = true;
    });
    Object.keys(years).sort(function (a, b) { return Number(b) - Number(a); }).forEach(function (year) {
      var opt = document.createElement("option");
      opt.value = year;
      opt.textContent = year;
      yearSelect.appendChild(opt);
    });
  }

  function filterPublications() {
    var query = (searchInput && searchInput.value || "").trim().toLowerCase();
    var year = yearSelect && yearSelect.value;
    var role = roleSelect && roleSelect.value;
    var type = typeSelect && typeSelect.value;
    var oaOnly = oaCheckbox && oaCheckbox.checked;
    var sort = (sortSelect && sortSelect.value) || "year-desc";

    var filtered = publications.filter(function (pub) {
      if (year && String(pub.year) !== year) return false;
      if (type && pub.publication_bucket !== type) return false;
      if (oaOnly && !pub.is_open_access) return false;
      if (role === "first" && !pub.is_first_author) return false;
      if (role === "lead" && !pub.is_lead_author) return false;
      if (role === "coauthored" && pub.author_group !== "coauthored") return false;
      if (!query) return true;
      var haystack = [
        pub.title,
        pub.authors,
        pub.publication,
        pub.doi,
        pub.bibcode,
        pub.year
      ].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    filtered.sort(function (a, b) {
      if (sort === "citations-desc") {
        return (b.citation_count || 0) - (a.citation_count || 0);
      }
      var ya = Number(a.year) || 0;
      var yb = Number(b.year) || 0;
      return sort === "year-asc" ? ya - yb : yb - ya;
    });

    return filtered;
  }

  function renderSoftwareBadges(pub) {
    if (!pub.software || !pub.software.length) return "";
    var label = t("publications.linked_software") || "Software";
    var badges = pub.software.map(function (sw) {
      var href = withLang(baseUrl() + sw.url);
      return '<a class="pub-asset-badge pub-asset-badge--software" href="' + escapeHtml(href) + '">' + escapeHtml(sw.name) + "</a>";
    }).join("");
    return '<div class="pub-asset-row"><span class="pub-asset-label">' + escapeHtml(label) + "</span>" + badges + "</div>";
  }

  function buildRelatedMap(pubs) {
    var bySoftware = {};
    pubs.forEach(function (pub) {
      (pub.software || []).forEach(function (sw) {
        var id = sw.id || sw.name;
        if (!bySoftware[id]) bySoftware[id] = [];
        bySoftware[id].push(pub.bibcode);
      });
    });

    relatedByBibcode = {};
    pubByBibcode = {};
    pubs.forEach(function (pub) {
      pubByBibcode[pub.bibcode] = pub;
      var related = {};
      (pub.software || []).forEach(function (sw) {
        var id = sw.id || sw.name;
        (bySoftware[id] || []).forEach(function (bibcode) {
          if (bibcode !== pub.bibcode) related[bibcode] = true;
        });
      });
      relatedByBibcode[pub.bibcode] = Object.keys(related).slice(0, 6);
    });
  }

  function renderImpactChain(pub) {
    var related = relatedByBibcode[pub.bibcode] || [];
    var hasSoftware = pub.software && pub.software.length;
    if (!hasSoftware && !related.length) return "";

    var heading = t("publications.impact_heading") || "Research impact chain";
    var relatedLabel = t("publications.related_papers") || "Related papers (shared software)";
    var statsLabel = t("publications.view_stats") || "Publication stats";
    var joinLabel = t("publications.join_link") || "Join the group";

    var parts = ['<div class="pub-impact-chain"><strong class="pub-impact-heading">' + escapeHtml(heading) + "</strong>"];

    if (related.length) {
      var links = related.map(function (bibcode) {
        var other = pubByBibcode[bibcode];
        if (!other) return "";
        var href = withLang(baseUrl() + "/publications/#pub-" + encodeURIComponent(bibcode));
        var title = other.title.length > 80 ? other.title.slice(0, 77) + "…" : other.title;
        return '<li><a href="' + escapeHtml(href) + '">' + escapeHtml(title) + " (" + escapeHtml(other.year) + ")</a></li>";
      }).join("");
      parts.push('<div class="pub-impact-block"><span class="pub-asset-label">' + escapeHtml(relatedLabel) + "</span><ul class="pub-impact-list">" + links + "</ul></div>");
    }

    parts.push(
      '<div class="pub-impact-links">' +
        '<a href="' + escapeHtml(withLang(baseUrl() + "/stats/")) + '">' + escapeHtml(statsLabel) + "</a>" +
        '<a href="' + escapeHtml(withLang(baseUrl() + "/join/")) + '">' + escapeHtml(joinLabel) + "</a>" +
      "</div></div>"
    );
    return parts.join("");
  }

  function renderDetails(pub) {
    var bibtex = toBibTeX(pub);
    var repro = "";
    if (pub.has_assets) {
      var reproTitle = t("publications.repro_heading") || "Reproducibility";
      var reproText = pub.repro_notes || (t("publications.repro_default") || "Linked software and data assets are available for this work.");
      repro = '<div class="pub-repro-callout"><strong>' + escapeHtml(reproTitle) + "</strong><p>" + escapeHtml(reproText) + "</p></div>";
    }

    return (
      '<div class="pub-explorer-details">' +
        renderSoftwareBadges(pub) +
        renderImpactChain(pub) +
        repro +
        '<div class="pub-explorer-actions">' +
          '<button type="button" class="btn pub-copy-btn" data-copy-citation="' + escapeHtml(pub.bibcode) + '">' + escapeHtml(t("publications.copy_citation") || "Copy citation") + "</button>" +
          '<button type="button" class="btn pub-copy-btn" data-copy-bibtex="' + escapeHtml(pub.bibcode) + '">' + escapeHtml(t("publications.copy_bibtex") || "Copy BibTeX") + "</button>" +
        "</div>" +
        '<pre class="pub-bibtex-preview" id="bibtex-' + escapeHtml(pub.bibcode) + '">' + escapeHtml(bibtex) + "</pre>" +
      "</div>"
    );
  }

  function renderList(list) {
    resultsNode.innerHTML = "";
    if (!list.length) {
      if (emptyNode) emptyNode.hidden = false;
      return;
    }
    if (emptyNode) emptyNode.hidden = true;

    list.forEach(function (pub, idx) {
      var li = document.createElement("li");
      li.className = "pub-explorer-item";
      li.id = "pub-" + pub.bibcode;

      var badges = "";
      badges += '<span class="pub-badge pub-badge--role">' + escapeHtml(roleLabel(pub)) + "</span>";
      badges += '<span class="pub-badge pub-badge--type">' + escapeHtml(typeLabel(pub)) + "</span>";
      if (pub.is_open_access) {
        badges += '<span class="pub-badge pub-badge--oa">' + escapeHtml(t("publications.badge_open_access") || "Open access") + "</span>";
      }
      if (pub.has_assets) {
        badges += '<span class="pub-badge pub-badge--assets">' + escapeHtml(t("publications.badge_has_assets") || "Code / data") + "</span>";
      }

      var meta = [pub.year, pub.publication].filter(Boolean).join(" · ");
      if (typeof pub.citation_count === "number") {
        meta += " · " + (t("publications.citations_label") || "Citations") + ": " + pub.citation_count;
      }

      var link = pub.doi
        ? '<a href="' + escapeHtml(pub.url) + '" target="_blank" rel="noopener noreferrer" class="pub-doi-link">DOI: ' + escapeHtml(pub.doi) + "</a>"
        : (pub.url ? '<a href="' + escapeHtml(pub.url) + '" target="_blank" rel="noopener noreferrer" class="pub-doi-link">NASA ADS</a>' : "");

      var isOpen = !!expanded[pub.bibcode];
      li.innerHTML =
        '<div class="pub-explorer-summary">' +
          '<button type="button" class="pub-expand-btn" aria-expanded="' + isOpen + '" aria-controls="pub-details-' + escapeHtml(pub.bibcode) + '" data-bibcode="' + escapeHtml(pub.bibcode) + '">' +
            '<span class="pub-expand-icon" aria-hidden="true">' + (isOpen ? "−" : "+") + "</span>" +
            '<span class="pub-explorer-title">' + escapeHtml(pub.title) + "</span>" +
          "</button>" +
          '<div class="pub-explorer-meta">' + escapeHtml(meta) + "</div>" +
          '<div class="pub-explorer-badges">' + badges + "</div>" +
          '<p class="pub-explorer-authors">' + escapeHtml(pub.authors) + "</p>" +
          (link ? '<p class="pub-explorer-link">' + link + "</p>" : "") +
        "</div>" +
        '<div class="pub-explorer-details-wrap" id="pub-details-' + escapeHtml(pub.bibcode) + '"' + (isOpen ? "" : " hidden") + ">" +
          renderDetails(pub) +
        "</div>";

      resultsNode.appendChild(li);
    });

    updateCount(list.length);
  }

  function updateCount(shown) {
    if (!countNode) return;
    var total = publications.length;
    var template = t("publications.count") || "Showing {shown} of {total} publications";
    countNode.textContent = template.replace("{shown}", String(shown)).replace("{total}", String(total));
  }

  function refresh() {
    renderList(filterPublications());
  }

  function bindEvents() {
    [searchInput, yearSelect, roleSelect, typeSelect, sortSelect, oaCheckbox].forEach(function (el) {
      if (!el) return;
      var eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(eventName, refresh);
    });

    resultsNode.addEventListener("click", function (e) {
      var expandBtn = e.target.closest(".pub-expand-btn");
      if (expandBtn) {
        var bibcode = expandBtn.getAttribute("data-bibcode");
        expanded[bibcode] = !expanded[bibcode];
        refresh();
        return;
      }

      var citeBtn = e.target.closest("[data-copy-citation]");
      if (citeBtn) {
        var citeBib = citeBtn.getAttribute("data-copy-citation");
        var pubCite = publications.find(function (p) { return p.bibcode === citeBib; });
        if (!pubCite) return;
        var html = toCitation(pubCite);
        var plain = citeBtn.closest(".pub-explorer-item").querySelector(".pub-explorer-authors").textContent + ". " + pubCite.title + ". " + pubCite.publication + ". " + (pubCite.date_label || pubCite.year) + ".";
        copyText(plain).then(function () {
          var copied = t("publications.copied") || "Copied!";
          citeBtn.textContent = copied;
          setTimeout(refresh, 1200);
        });
        return;
      }

      var bibBtn = e.target.closest("[data-copy-bibtex]");
      if (bibBtn) {
        var bibBib = bibBtn.getAttribute("data-copy-bibtex");
        var pubBib = publications.find(function (p) { return p.bibcode === bibBib; });
        if (!pubBib) return;
        copyText(toBibTeX(pubBib)).then(function () {
          var copied = t("publications.copied") || "Copied!";
          bibBtn.textContent = copied;
          setTimeout(refresh, 1200);
        });
      }
    });

    document.addEventListener("site:langchange", function () {
      refresh();
      if (window.SiteI18n && typeof window.SiteI18n.apply === "function") {
        window.SiteI18n.apply();
      }
    });
  }

  function init() {
    indexData = parseIndex();
    if (!indexData || !Array.isArray(indexData.publications)) return;

    publications = indexData.publications;
    buildRelatedMap(publications);
    populateYears();
    bindEvents();
    handleHash();
    window.addEventListener("hashchange", handleHash);
    refresh();

    root.hidden = false;
    if (fallbackNode) {
      fallbackNode.hidden = true;
      fallbackNode.setAttribute("aria-hidden", "true");
    }
  }

  function handleHash() {
    var hash = window.location.hash || "";
    if (hash.indexOf("#pub-") !== 0) return;
    var bibcode = decodeURIComponent(hash.slice(5));
    if (!bibcode) return;
    expanded[bibcode] = true;
    refresh();
    window.setTimeout(function () {
      var el = document.getElementById("pub-" + bibcode);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
