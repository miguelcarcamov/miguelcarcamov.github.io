(function () {
  "use strict";

  function t(key, fallback) {
    if (window.SiteI18n && typeof window.SiteI18n.t === "function") {
      var value = window.SiteI18n.t(key);
      if (value) return value;
    }
    return fallback || key;
  }

  function updateMomentumNote() {
    var node = document.getElementById("stats-momentum-note");
    if (!node) return;
    var pct = node.getAttribute("data-percent") || "N/A";
    var display = pct === "N/A" ? pct : pct + "%";
    var template = t("stats.momentum_note", "In the last 5 years, recent work contributes {percent} of total citation impact.");
    node.textContent = template.replace("{percent}", display);
  }

  function toLocalDateString(iso) {
    var dt = new Date(iso);
    if (isNaN(dt.getTime())) return iso;
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    });
  }

  function createChart(ctx, config) {
    if (!ctx || typeof Chart === "undefined") return null;
    var chart = new Chart(ctx, config);
    if (ctx.id) {
      chartRegistry[ctx.id] = chart;
    }
    return chart;
  }

  function isDarkTheme() {
    if (window.SiteTheme && typeof window.SiteTheme.get === "function") {
      return window.SiteTheme.get() === "dark";
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function filterYearIndices(years, range) {
    if (!years || !years.length) return [];
    if (range === "all") {
      return years.map(function (_, index) { return index; });
    }
    var cutoff = new Date().getFullYear() - parseInt(range, 10);
    return years.map(function (year, index) {
      return year >= cutoff ? index : -1;
    }).filter(function (index) { return index >= 0; });
  }

  function pickByIndices(values, indices) {
    return indices.map(function (index) { return values[index]; });
  }

  function applyYearRangeToCharts(range) {
    activeYearRange = range || "all";
    if (!stats || !stats.yearly) return;

    var years = stats.yearly.years || [];
    var indices = filterYearIndices(years, activeYearRange);

    var papersChart = chartRegistry["papers-per-year-chart"];
    if (papersChart) {
      papersChart.data.labels = pickByIndices(years, indices);
      papersChart.data.datasets[0].data = pickByIndices(stats.yearly.papers_per_year || [], indices);
      papersChart.update("active");
    }

    var comboChart = chartRegistry["citations-combo-chart"];
    if (comboChart) {
      comboChart.data.labels = pickByIndices(years, indices);
      comboChart.data.datasets[0].data = pickByIndices(stats.yearly.citations_per_year || [], indices);
      comboChart.data.datasets[1].data = pickByIndices(stats.yearly.cumulative_citations || [], indices);
      comboChart.update("active");
    }

    var roleData = (stats.leadership && stats.leadership.yearly_by_role) || {};
    var roleYears = roleData.years || [];
    var roleIndices = filterYearIndices(roleYears, activeYearRange);
    var roleChart = chartRegistry["papers-by-role-chart"];
    if (roleChart) {
      roleChart.data.labels = pickByIndices(roleYears, roleIndices);
      roleChart.data.datasets[0].data = pickByIndices(roleData.first_author || [], roleIndices);
      roleChart.data.datasets[1].data = pickByIndices(roleData.lead_coauthor || [], roleIndices);
      roleChart.data.datasets[2].data = pickByIndices(roleData.supporting || [], roleIndices);
      roleChart.update("active");
    }
  }

  function bindYearRangeFilters() {
    var bar = document.getElementById("stats-year-filter");
    if (!bar) return;
    bar.querySelectorAll(".stats-year-filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        bar.querySelectorAll(".stats-year-filter-btn").forEach(function (item) {
          item.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        applyYearRangeToCharts(btn.getAttribute("data-years") || "all");
      });
    });
  }

  function wrapLabel(text, maxCharsPerLine) {
    if (!text) return "";
    var words = String(text).split(" ");
    var lines = [];
    var current = "";
    words.forEach(function (word) {
      var tentative = current ? (current + " " + word) : word;
      if (tentative.length <= maxCharsPerLine) {
        current = tentative;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function truncateLabel(text, maxChars) {
    var value = String(text || "");
    if (value.length <= maxChars) return value;
    return value.slice(0, Math.max(0, maxChars - 1)) + "…";
  }

  var googleChartsPromise = null;
  function ensureGoogleCharts() {
    if (window.google && window.google.charts && window.google.visualization) {
      return Promise.resolve();
    }
    if (googleChartsPromise) return googleChartsPromise;
    googleChartsPromise = new Promise(function (resolve, reject) {
      var existing = document.getElementById("google-charts-loader");
      var onReady = function () {
        window.google.charts.load("current", { packages: ["geochart"] });
        window.google.charts.setOnLoadCallback(resolve);
      };

      if (existing) {
        if (window.google && window.google.charts) onReady();
        return;
      }

      var script = document.createElement("script");
      script.id = "google-charts-loader";
      script.src = "https://www.gstatic.com/charts/loader.js";
      script.async = true;
      script.onload = onReady;
      script.onerror = function () {
        reject(new Error("Failed to load Google Charts loader.js from gstatic."));
      };
      document.head.appendChild(script);
    });
    return googleChartsPromise;
  }

  var dataNode = document.getElementById("publication-stats-data");
  if (!dataNode) return;
  var sectionNode = document.getElementById("publication-stats");
  if (!sectionNode) return;

  var stats;
  try {
    stats = JSON.parse(dataNode.textContent);
  } catch (err) {
    return;
  }

  var charts = [];
  var chartRegistry = {};
  var activeYearRange = "all";
  var initialized = false;
  var redrawCountryMap = null;

  function isStatsSectionActive() {
    return sectionNode.classList.contains("active");
  }

  function resizeCharts() {
    charts.forEach(function (chart) {
      if (chart && typeof chart.resize === "function") {
        chart.resize();
      }
    });
    if (typeof redrawCountryMap === "function") redrawCountryMap();
  }

  function renderStatsCharts() {
    if (initialized) return;

    var colors = (stats && stats.chart_palette) || {
      primary: "#362cb1",
      secondary: "#493fc8",
      accent: "#6b5ce7",
      muted: "#9ea0a5",
      grid: "#e9e9ef",
      text: "#4d4f57"
    };

    var darkMode = isDarkTheme();
    if (darkMode) {
      colors.grid = "#3f3f46";
      colors.text = "#f0f0f3";
      colors.muted = "#c8c9cf";
    }

    var commonScales = {
      x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      y: { ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true }
    };

    function drawCountryMap() {
      var mapNode = document.getElementById("country-collab-map");
      var colorbarMinNode = document.getElementById("country-colorbar-min");
      var colorbarMaxNode = document.getElementById("country-colorbar-max");
      if (!mapNode) return;
      var countryRows = (((stats.country_collaboration || {}).top_countries) || []);
      if (!countryRows.length) {
        mapNode.textContent = t("stats.map_no_data", "No affiliation-country signal available yet.");
        if (colorbarMinNode) colorbarMinNode.textContent = "0%";
        if (colorbarMaxNode) colorbarMaxNode.textContent = "0%";
        var emptyGradient = document.querySelector(".stats-colorbar-gradient");
        if (emptyGradient) {
          emptyGradient.style.background = "linear-gradient(to top, #e8e4fa 0%, #362cb1 100%)";
        }
        return;
      }

      var shares = countryRows.map(function (item) { return Number(item.share_percent || 0); });
      var minShare = Math.min.apply(null, shares);
      var maxShare = Math.max.apply(null, shares);
      var colorbarGradientNode = document.querySelector(".stats-colorbar-gradient");
      var mapLowColor = darkMode ? "#c8c0f0" : "#e8e4fa";
      var mapHighColor = darkMode ? "#493fc8" : "#362cb1";

      if (colorbarMinNode) colorbarMinNode.textContent = minShare.toFixed(1) + "%";
      if (colorbarMaxNode) colorbarMaxNode.textContent = maxShare.toFixed(1) + "%";
      if (colorbarGradientNode) {
        colorbarGradientNode.style.background =
          "linear-gradient(to top, " + mapLowColor + " 0%, " + mapHighColor + " 100%)";
      }

      ensureGoogleCharts().then(function () {
        var dataArray = [["Country", "Paper share (%)", "Papers"]];
        countryRows.forEach(function (item) {
          dataArray.push([item.country, Number(item.share_percent || 0), Number(item.papers || 0)]);
        });
        var dataTable = window.google.visualization.arrayToDataTable(dataArray);
        var chart = new window.google.visualization.GeoChart(mapNode);
        chart.draw(dataTable, {
          backgroundColor: "transparent",
          datalessRegionColor: darkMode ? "#2c2d33" : "#f3f3f8",
          defaultColor: darkMode ? "#434556" : "#e3e4f2",
          colorAxis: {
            colors: [mapLowColor, mapHighColor],
            minValue: minShare,
            maxValue: maxShare
          },
          legend: "none",
          tooltip: { textStyle: { color: "#222" } }
        });
      }).catch(function (err) {
        // Keep a visible hint in the UI so CSP/network issues are easy to diagnose.
        mapNode.textContent = t("stats.map_load_error", "Could not load map renderer. Check browser console for CSP details.");
        if (window.console && typeof window.console.error === "function") {
          window.console.error("GeoChart load failed:", err);
        }
      });
    }

    redrawCountryMap = drawCountryMap;
    drawCountryMap();

    charts.push(
      createChart(
        document.getElementById("papers-per-year-chart"),
        {
          type: "bar",
          data: {
            labels: stats.yearly.years,
            datasets: [{
              label: t("stats.chart_label_papers", "Papers"),
              data: stats.yearly.papers_per_year,
              backgroundColor: colors.primary
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: commonScales,
            plugins: { legend: { labels: { color: colors.text } } }
          }
        }
      )
    );

    charts.push(
      createChart(
        document.getElementById("citations-combo-chart"),
        {
          type: "bar",
          data: {
            labels: stats.yearly.years,
            datasets: [
              {
                type: "bar",
                label: t("stats.chart_label_annual_citations", "Annual citations"),
                data: stats.yearly.citations_per_year,
                backgroundColor: colors.secondary,
                yAxisID: "y"
              },
              {
                type: "line",
                label: t("stats.chart_label_cumulative_citations", "Cumulative citations"),
                data: stats.yearly.cumulative_citations,
                borderColor: colors.accent,
                backgroundColor: colors.accent,
                tension: 0.25,
                fill: false,
                yAxisID: "y1"
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: commonScales.x,
              y: commonScales.y,
              y1: {
                beginAtZero: true,
                position: "right",
                ticks: { color: colors.text },
                grid: { drawOnChartArea: false }
              }
            },
            plugins: { legend: { labels: { color: colors.text } } }
          }
        }
      )
    );

    charts.push(
      createChart(
        document.getElementById("citation-histogram-chart"),
        {
          type: "bar",
          data: {
            labels: Object.keys(stats.histogram),
            datasets: [{
              label: t("stats.chart_label_papers", "Papers"),
              data: Object.values(stats.histogram),
              backgroundColor: colors.primary
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: commonScales,
            plugins: { legend: { labels: { color: colors.text } } }
          }
        }
      )
    );

    charts.push(
      createChart(
        document.getElementById("top-cited-chart"),
        {
          type: "bar",
          data: {
            labels: (stats.top_cited || []).map(function (item) {
          var maxChars = window.innerWidth < 768 ? 28 : 44;
          return truncateLabel(((item.year || "") + " - " + item.title), maxChars);
            }),
            datasets: [{
              label: t("stats.chart_label_citations", "Citations"),
              data: (stats.top_cited || []).map(function (item) { return item.citation_count || 0; }),
              backgroundColor: colors.secondary
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: { color: colors.text },
                grid: { color: colors.grid },
                beginAtZero: true
              },
              y: {
                ticks: {
                  color: colors.text,
                  autoSkip: false,
                  font: { size: window.innerWidth < 768 ? 9 : 10 }
                },
                grid: { color: colors.grid }
              }
            },
            plugins: {
              legend: { labels: { color: colors.text } },
              tooltip: {
                callbacks: {
                  title: function (tooltipItems) {
                    var idx = tooltipItems[0].dataIndex;
                    var item = (stats.top_cited || [])[idx] || {};
                    return item.title || "";
                  },
                  label: function (context) {
                    return t("stats.chart_label_citations", "Citations") + ": " + context.parsed.x;
                  }
                }
              }
            }
          }
        }
      )
    );

    charts.push(
      createChart(
        document.getElementById("top-collaborators-chart"),
        {
          type: "bar",
          data: {
            labels: ((stats.collaboration && stats.collaboration.top_collaborators) || []).map(function (item) {
              return truncateLabel(item.name || "", window.innerWidth < 768 ? 22 : 34);
            }),
            datasets: [{
              label: t("stats.chart_label_shared_papers", "Shared papers"),
              data: ((stats.collaboration && stats.collaboration.top_collaborators) || []).map(function (item) {
                return item.papers_together || 0;
              }),
              backgroundColor: colors.primary
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: { color: colors.text },
                grid: { color: colors.grid },
                beginAtZero: true
              },
              y: {
                ticks: { color: colors.text, autoSkip: false, font: { size: window.innerWidth < 768 ? 9 : 10 } },
                grid: { color: colors.grid }
              }
            },
            plugins: {
              legend: { labels: { color: colors.text } }
            }
          }
        }
      )
    );

    var roleChartColors = darkMode
      ? { first: "#6b5ce7", lead: "#4a3fd4", supporting: "#b8b0ef" }
      : { first: "#6b5ce7", lead: "#362cb1", supporting: "#d4cff5" };

    charts.push(
      createChart(
        document.getElementById("papers-by-role-chart"),
        {
          type: "bar",
          data: {
            labels: ((stats.leadership && stats.leadership.yearly_by_role) || {}).years || [],
            datasets: [
              {
                label: t("stats.chart_label_first_author", "First author"),
                data: ((stats.leadership && stats.leadership.yearly_by_role) || {}).first_author || [],
                backgroundColor: roleChartColors.first,
                stack: "role"
              },
              {
                label: t("stats.chart_label_lead_coauthor", "Lead co-author (pos. 2)"),
                data: ((stats.leadership && stats.leadership.yearly_by_role) || {}).lead_coauthor || [],
                backgroundColor: roleChartColors.lead,
                stack: "role"
              },
              {
                label: t("stats.chart_label_supporting", "Supporting (pos. 3+)"),
                data: ((stats.leadership && stats.leadership.yearly_by_role) || {}).supporting || [],
                backgroundColor: roleChartColors.supporting,
                stack: "role"
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, ticks: { color: colors.text }, grid: { color: colors.grid } },
              y: { stacked: true, ticks: { color: colors.text }, grid: { color: colors.grid }, beginAtZero: true }
            },
            plugins: { legend: { labels: { color: colors.text } } }
          }
        }
      )
    );

    (function () {
      var positionKeys = ["1", "2", "3", "4", "5", "6", "7+", "unknown"];
      var distribution = stats.author_position_distribution || {};
      charts.push(
        createChart(
          document.getElementById("author-position-chart"),
          {
            type: "bar",
            data: {
              labels: positionKeys.map(function (key) {
                return key === "unknown" ? "?" : key;
              }),
              datasets: [{
                label: t("stats.chart_label_papers", "Papers"),
                data: positionKeys.map(function (key) { return distribution[key] || 0; }),
                backgroundColor: colors.accent
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: commonScales,
              plugins: { legend: { labels: { color: colors.text } } }
            }
          }
        )
      );
    })();

    charts.push(
      createChart(
        document.getElementById("fondecyt-top-chart"),
        {
          type: "bar",
          data: {
            labels: ((stats.fondecyt && stats.fondecyt.top_contributors) || []).map(function (item) {
              var maxChars = window.innerWidth < 768 ? 28 : 44;
              return truncateLabel(((item.year || "") + " - " + item.title), maxChars);
            }),
            datasets: [{
              label: t("stats.chart_label_score", "s_i score"),
              data: ((stats.fondecyt && stats.fondecyt.top_contributors) || []).map(function (item) { return item.s_i || 0; }),
              backgroundColor: colors.accent
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                ticks: { color: colors.text },
                grid: { color: colors.grid },
                beginAtZero: true
              },
              y: {
                ticks: {
                  color: colors.text,
                  autoSkip: false,
                  font: { size: window.innerWidth < 768 ? 9 : 10 }
                },
                grid: { color: colors.grid }
              }
            },
            plugins: {
              legend: { labels: { color: colors.text } },
              tooltip: {
                callbacks: {
                  title: function (tooltipItems) {
                    var idx = tooltipItems[0].dataIndex;
                    var item = ((stats.fondecyt && stats.fondecyt.top_contributors) || [])[idx] || {};
                    return item.title || "";
                  },
                  label: function (context) {
                    var idx = context.dataIndex;
                    var item = ((stats.fondecyt && stats.fondecyt.top_contributors) || [])[idx] || {};
                    return "s_i: " + context.parsed.x + " (citations: " + (item.citations || 0) + ", position: " + (item.author_position || "?") + ")";
                  }
                }
              }
            }
          }
        }
      )
    );

    var lastUpdatedNode = document.getElementById("stats-last-updated");
    if (lastUpdatedNode) {
      var utc = lastUpdatedNode.getAttribute("data-utc");
      if (utc) {
        lastUpdatedNode.textContent = toLocalDateString(utc);
      }
    }

    updateMomentumNote();
    bindYearRangeFilters();
    applyYearRangeToCharts(activeYearRange);

    initialized = true;
  }

  function destroyCharts() {
    charts.forEach(function (chart) {
      if (chart && typeof chart.destroy === "function") {
        chart.destroy();
      }
    });
    charts = [];
    chartRegistry = {};
    initialized = false;
    redrawCountryMap = null;
  }

  function ensureStatsRendering() {
    if (!isStatsSectionActive()) return;
    if (!initialized) {
      renderStatsCharts();
    } else {
      resizeCharts();
    }
    if (typeof window.renderCollaborationNetwork === "function") {
      window.renderCollaborationNetwork();
    }
  }

  var observer = new MutationObserver(function () {
    setTimeout(ensureStatsRendering, 120);
  });
  observer.observe(sectionNode, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("resize", function () {
    if (isStatsSectionActive()) {
      setTimeout(resizeCharts, 120);
    }
  });

  // Initial attempt for direct links (#publication-stats).
  setTimeout(ensureStatsRendering, 180);

  document.addEventListener("site:langchange", function () {
    updateMomentumNote();
    if (!isStatsSectionActive()) return;
    destroyCharts();
    renderStatsCharts();
    if (typeof window.renderCollaborationNetwork === "function") {
      window.renderCollaborationNetwork();
    }
  });

  document.addEventListener("site:themechange", function () {
    if (!isStatsSectionActive()) return;
    destroyCharts();
    renderStatsCharts();
    if (typeof window.renderCollaborationNetwork === "function") {
      window.renderCollaborationNetwork();
    }
  });
})();
