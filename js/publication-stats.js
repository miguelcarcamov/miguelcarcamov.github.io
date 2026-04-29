(function () {
  "use strict";

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
    if (!ctx || typeof Chart === "undefined") return;
    return new Chart(ctx, config);
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
      script.onerror = reject;
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

    var darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
        mapNode.textContent = "No affiliation-country signal available yet.";
        if (colorbarMinNode) colorbarMinNode.textContent = "0%";
        if (colorbarMaxNode) colorbarMaxNode.textContent = "0%";
        return;
      }

      var shares = countryRows.map(function (item) { return Number(item.share_percent || 0); });
      var minShare = Math.min.apply(null, shares);
      var maxShare = Math.max.apply(null, shares);
      if (colorbarMinNode) colorbarMinNode.textContent = minShare.toFixed(1) + "%";
      if (colorbarMaxNode) colorbarMaxNode.textContent = maxShare.toFixed(1) + "%";

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
          colorAxis: { colors: [colors.accent, colors.primary] },
          legend: "none",
          tooltip: { textStyle: { color: "#222" } }
        });
      }).catch(function () {
        mapNode.textContent = "Could not load map renderer.";
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
              label: "Papers",
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
                label: "Annual citations",
                data: stats.yearly.citations_per_year,
                backgroundColor: colors.secondary,
                yAxisID: "y"
              },
              {
                type: "line",
                label: "Cumulative citations",
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
              label: "Papers",
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
              label: "Citations",
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
                    return "Citations: " + context.parsed.x;
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
              label: "Shared papers",
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
              label: "s_i score",
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

    initialized = true;
  }

  function ensureStatsRendering() {
    if (!isStatsSectionActive()) return;
    if (!initialized) {
      renderStatsCharts();
    } else {
      resizeCharts();
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
})();
