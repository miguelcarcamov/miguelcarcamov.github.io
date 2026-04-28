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

  function buildTopList(containerId, items, scoreKey) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!items || !items.length) {
      container.innerHTML = "<p style='color:#999;'>No data available.</p>";
      return;
    }
    var html = "<ol class='stats-top-list'>";
    items.forEach(function (item) {
      var value = scoreKey ? item[scoreKey] : item.citation_count;
      var label = scoreKey ? "score" : "citations";
      html += "<li class='stats-top-item'>" +
        "<a href='" + (item.url || "#") + "' target='_blank' rel='noopener'>" + item.title + "</a>" +
        " <span class='stats-top-meta'>(" + (item.year || "") + ", " + (item.publication || "Unknown venue") + ")</span>" +
        " <strong class='stats-top-count'>" + value + " " + label + "</strong>" +
        "</li>";
    });
    html += "</ol>";
    container.innerHTML = html;
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

  var dataNode = document.getElementById("publication-stats-data");
  if (!dataNode) return;

  var stats;
  try {
    stats = JSON.parse(dataNode.textContent);
  } catch (err) {
    return;
  }

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
  );

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
  );

  createChart(
    document.getElementById("top-cited-chart"),
    {
      type: "bar",
      data: {
        labels: (stats.top_cited || []).map(function (item) {
          var maxChars = window.innerWidth < 768 ? 30 : 50;
          return wrapLabel(((item.year || "") + " - " + item.title), maxChars);
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
        scales: commonScales,
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
  );

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
  );

  createChart(
    document.getElementById("author-position-chart"),
    {
      type: "pie",
      data: {
        labels: Object.keys(stats.author_position_distribution),
        datasets: [{
          data: Object.values(stats.author_position_distribution),
          backgroundColor: [
            colors.primary, colors.secondary, colors.accent, "#7c73e6",
            "#8c85ec", "#a29cf2", "#b9b5f7", colors.muted
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: colors.text } }
        }
      }
    }
  );

  buildTopList("fondecyt-top-list", (stats.fondecyt && stats.fondecyt.top_contributors) || [], "s_i");

  var lastUpdatedNode = document.getElementById("stats-last-updated");
  if (lastUpdatedNode) {
    var utc = lastUpdatedNode.getAttribute("data-utc");
    if (utc) {
      lastUpdatedNode.textContent = toLocalDateString(utc);
    }
  }
})();
