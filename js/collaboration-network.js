(function () {
  "use strict";

  var dataNode = document.getElementById("collaboration-network-data");
  var container = document.getElementById("collab-network");
  var sectionNode = document.getElementById("publication-stats");
  var filtersNode = document.getElementById("collab-network-filters");
  if (!dataNode || !container || !sectionNode) return;

  var network;
  try {
    network = JSON.parse(dataNode.textContent || "{}");
  } catch (err) {
    return;
  }

  var allNodes = Array.isArray(network.nodes) ? network.nodes.slice() : [];
  var allLinks = Array.isArray(network.links) ? network.links.slice() : [];
  if (!allNodes.length) return;

  var selfId = "miguel-carcamo";
  var yearMin = Number(network.year_min) || 0;
  var yearMax = Number(network.year_max) || new Date().getFullYear();
  var filterYearFrom = yearMin;
  var filterYearTo = yearMax;
  var filterFirstAuthorOnly = false;

  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "collab-network-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("data-i18n-aria", "stats.collab_graph_aria");
  container.appendChild(svg);

  var edgesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgesLayer.setAttribute("class", "collab-network-edges");
  svg.appendChild(edgesLayer);

  var nodesLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodesLayer.setAttribute("class", "collab-network-nodes");
  svg.appendChild(nodesLayer);

  var labelsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  labelsLayer.setAttribute("class", "collab-network-labels");
  svg.appendChild(labelsLayer);

  var info = document.createElement("p");
  info.className = "collab-network-info stats-map-note";
  info.setAttribute("aria-live", "polite");
  container.appendChild(info);

  var jointPanel = document.createElement("div");
  jointPanel.className = "collab-joint-papers";
  jointPanel.setAttribute("hidden", "");
  container.appendChild(jointPanel);

  var layoutNodes = [];
  var visibleNodes = [];
  var visibleEdges = [];
  var selectedId = null;
  var layoutWidth = 0;
  var layoutHeight = 0;
  var renderTimer = null;
  var retryCount = 0;
  var CANVAS_HEIGHT = 540;
  var LABEL_PAPER_THRESHOLD = 5;
  var MAX_RETRIES = 30;

  function t(key, fallback) {
    if (window.SiteI18n && typeof window.SiteI18n.t === "function") {
      var value = window.SiteI18n.t(key);
      if (value) return value;
    }
    return fallback || key;
  }

  function isSectionActive() {
    return sectionNode.classList.contains("active");
  }

  function paperKey(link) {
    return link.bibcode || link.url || link.title;
  }

  function getFilteredLinks() {
    return allLinks.filter(function (link) {
      var year = Number(link.year) || 0;
      if (year > 0) {
        if (year < filterYearFrom || year > filterYearTo) return false;
      }
      if (filterFirstAuthorOnly && !link.first_author) return false;
      return true;
    });
  }

  function buildVisibleGraph() {
    var links = getFilteredLinks();
    var counts = {};
    var papersByKey = {};

    links.forEach(function (link) {
      var key = link.coauthor_key;
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
      if (!papersByKey[key]) papersByKey[key] = {};
      papersByKey[key][paperKey(link)] = link;
    });

    var uniquePapers = {};
    links.forEach(function (link) {
      uniquePapers[paperKey(link)] = true;
    });
    var selfPaperCount = Object.keys(uniquePapers).length;

    visibleNodes = allNodes.filter(function (node) {
      if (node.is_self) return true;
      return (counts[node.key] || 0) > 0;
    }).map(function (node) {
      if (node.is_self) {
        return Object.assign({}, node, { papers: selfPaperCount || node.papers });
      }
      return Object.assign({}, node, { papers: counts[node.key] || 0 });
    });

    visibleEdges = visibleNodes
      .filter(function (node) { return !node.is_self; })
      .map(function (node) {
        return {
          source: selfId,
          target: node.id,
          weight: node.papers || 1
        };
      });

    return papersByKey;
  }

  var papersByKey = buildVisibleGraph();

  function initFilters() {
    if (!filtersNode) return;
    var fromInput = document.getElementById("collab-filter-year-from");
    var toInput = document.getElementById("collab-filter-year-to");
    var firstAuthorInput = document.getElementById("collab-filter-first-author");

    if (fromInput) {
      fromInput.min = String(yearMin);
      fromInput.max = String(yearMax);
      fromInput.value = String(filterYearFrom);
      fromInput.addEventListener("change", function () {
        filterYearFrom = Number(fromInput.value) || yearMin;
        if (filterYearFrom > filterYearTo) filterYearTo = filterYearFrom;
        if (toInput) toInput.value = String(filterYearTo);
        onFiltersChanged();
      });
    }

    if (toInput) {
      toInput.min = String(yearMin);
      toInput.max = String(yearMax);
      toInput.value = String(filterYearTo);
      toInput.addEventListener("change", function () {
        filterYearTo = Number(toInput.value) || yearMax;
        if (filterYearTo < filterYearFrom) filterYearFrom = filterYearTo;
        if (fromInput) fromInput.value = String(filterYearFrom);
        onFiltersChanged();
      });
    }

    if (firstAuthorInput) {
      firstAuthorInput.addEventListener("change", function () {
        filterFirstAuthorOnly = firstAuthorInput.checked;
        onFiltersChanged();
      });
    }
  }

  function onFiltersChanged() {
    selectedId = null;
    papersByKey = buildVisibleGraph();
    layoutWidth = 0;
    clearJointPanel();
    setInfoForNode(null);
    scheduleRender();
  }

  function radiusFor(node) {
    if (node.is_self) return 20;
    return 7 + Math.min(10, Math.sqrt(node.papers || 1) * 1.8);
  }

  function containerWidth() {
    var rect = container.getBoundingClientRect();
    var width = rect.width || container.clientWidth || 0;
    if (width < 50) {
      var card = container.closest(".stats-chart-card");
      if (card) {
        width = card.getBoundingClientRect().width || card.clientWidth || 0;
      }
    }
    return width;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shortLabel(label) {
    var text = String(label || "").trim();
    if (!text) return "";
    return text.split(",")[0].trim();
  }

  function compareByPapers(a, b) {
    return (b.papers || 0) - (a.papers || 0);
  }

  function buildTiers(others) {
    return [
      { nodes: others.slice(0, 6), radiusFactor: 0.22 },
      { nodes: others.slice(6, 14), radiusFactor: 0.34 },
      { nodes: others.slice(14), radiusFactor: 0.44 }
    ].filter(function (tier) { return tier.nodes.length > 0; });
  }

  function relaxCollisions(width, height, iterations) {
    var padding = 28;
    var i;
    var j;
    var iter;
    var a;
    var b;
    var dx;
    var dy;
    var dist;
    var minDist;
    var push;
    var fx;
    var fy;

    for (iter = 0; iter < iterations; iter += 1) {
      for (i = 0; i < layoutNodes.length; i += 1) {
        for (j = i + 1; j < layoutNodes.length; j += 1) {
          a = layoutNodes[i];
          b = layoutNodes[j];
          if (a.is_self || b.is_self) continue;
          dx = b.x - a.x;
          dy = b.y - a.y;
          dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          minDist = a.r + b.r + 10;
          if (dist < minDist) {
            push = (minDist - dist) * 0.55;
            fx = (dx / dist) * push;
            fy = (dy / dist) * push;
            a.x -= fx;
            a.y -= fy;
            b.x += fx;
            b.y += fy;
          }
        }
      }

      layoutNodes.forEach(function (node) {
        if (node.is_self) {
          node.x = width / 2;
          node.y = height / 2;
          return;
        }
        node.x = clamp(node.x, padding + node.r, width - padding - node.r);
        node.y = clamp(node.y, padding + node.r, height - padding - node.r);
      });
    }
  }

  function computeLayout(width, height) {
    var centerX = width / 2;
    var centerY = height / 2;
    var selfNode = visibleNodes.find(function (node) { return node.is_self; });
    var others = visibleNodes.filter(function (node) { return !node.is_self; }).sort(compareByPapers);
    var tiers = buildTiers(others);
    var tierIndex;
    var tier;
    var ringRadius;
    var angle;
    var nodeIndex;

    layoutNodes = [];

    if (selfNode) {
      layoutNodes.push({
        id: selfNode.id,
        key: selfNode.key,
        label: selfNode.label,
        papers: selfNode.papers || 0,
        is_self: true,
        x: centerX,
        y: centerY,
        r: radiusFor(selfNode)
      });
    }

    for (tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
      tier = tiers[tierIndex];
      ringRadius = Math.min(width, height) * tier.radiusFactor;
      for (nodeIndex = 0; nodeIndex < tier.nodes.length; nodeIndex += 1) {
        angle = (nodeIndex / tier.nodes.length) * Math.PI * 2 - Math.PI / 2 + tierIndex * 0.22;
        layoutNodes.push({
          id: tier.nodes[nodeIndex].id,
          key: tier.nodes[nodeIndex].key,
          label: tier.nodes[nodeIndex].label,
          papers: tier.nodes[nodeIndex].papers || 0,
          is_self: false,
          x: centerX + Math.cos(angle) * ringRadius,
          y: centerY + Math.sin(angle) * ringRadius,
          r: radiusFor(tier.nodes[nodeIndex])
        });
      }
    }

    relaxCollisions(width, height, 140);
    layoutWidth = width;
    layoutHeight = height;
  }

  function shouldShowLabel(node) {
    if (node.is_self) return false;
    if (node.id === selectedId) return true;
    return (node.papers || 0) >= LABEL_PAPER_THRESHOLD;
  }

  function labelPosition(node) {
    var angle = Math.atan2(node.y - layoutHeight / 2, node.x - layoutWidth / 2);
    return {
      x: node.x + Math.cos(angle) * (node.r + 14),
      y: node.y + Math.sin(angle) * (node.r + 14)
    };
  }

  function nodeStateClass(node) {
    if (node.is_self) return "collab-node--self";
    if (selectedId === node.id) return "collab-node--selected";
    return "collab-node--default";
  }

  function sharedPaperLabel(count) {
    var template = count === 1
      ? t("stats.collab_shared_paper_one", "{count} shared paper")
      : t("stats.collab_shared_paper_many", "{count} shared papers");
    return template.replace("{count}", String(count));
  }

  function setInfoForNode(node) {
    if (!node) {
      info.textContent = "";
      return;
    }
    if (node.is_self) {
      info.textContent = t("stats.collab_self_hint", "Miguel Cárcamo · center node");
      return;
    }
    info.textContent = node.label + " · " + sharedPaperLabel(node.papers || 0);
  }

  function clearJointPanel() {
    jointPanel.innerHTML = "";
    jointPanel.setAttribute("hidden", "");
  }

  function renderJointPapers(node) {
    if (!node || node.is_self) {
      clearJointPanel();
      return;
    }

    var bucket = papersByKey[node.key] || {};
    var papers = Object.keys(bucket).map(function (key) { return bucket[key]; });
    papers.sort(function (a, b) {
      return (Number(b.year) || 0) - (Number(a.year) || 0);
    });

    clearJointPanel();
    if (!papers.length) return;

    var heading = document.createElement("h5");
    heading.className = "collab-joint-heading";
    heading.textContent = t("stats.collab_joint_heading", "Joint publications");
    jointPanel.appendChild(heading);

    var list = document.createElement("ul");
    list.className = "collab-joint-list";
    papers.forEach(function (paper) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = paper.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = (paper.year ? paper.year + " · " : "") + (paper.title || "Untitled");
      item.appendChild(link);
      list.appendChild(item);
    });
    jointPanel.appendChild(list);
    jointPanel.removeAttribute("hidden");
  }

  function clearLayer(layer) {
    while (layer.firstChild) {
      layer.removeChild(layer.firstChild);
    }
  }

  function render() {
    var width = containerWidth();
    if (width < 50) {
      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        window.setTimeout(scheduleRender, 120);
      }
      return;
    }

    retryCount = 0;
    if (width !== layoutWidth || layoutHeight !== CANVAS_HEIGHT || !layoutNodes.length) {
      computeLayout(width, CANVAS_HEIGHT);
    }

    svg.setAttribute("viewBox", "0 0 " + width + " " + CANVAS_HEIGHT);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(CANVAS_HEIGHT));
    svg.setAttribute("aria-label", t("stats.collab_graph_aria", "Collaboration network graph"));

    clearLayer(edgesLayer);
    clearLayer(nodesLayer);
    clearLayer(labelsLayer);

    visibleEdges.forEach(function (edge) {
      var a;
      var b;
      var line;
      if (edge.source !== selfId && edge.target !== selfId) return;
      a = layoutNodes.find(function (n) { return n.id === edge.source; });
      b = layoutNodes.find(function (n) { return n.id === edge.target; });
      if (!a || !b) return;

      line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      line.setAttribute("class", "collab-edge");
      line.setAttribute("stroke-width", String(Math.min(2.5, 0.8 + (edge.weight || 1) * 0.25)));
      edgesLayer.appendChild(line);
    });

    layoutNodes.forEach(function (node) {
      var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      var hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      var text;
      var label;
      var pos;

      group.setAttribute("class", "collab-node " + nodeStateClass(node));
      group.setAttribute("data-node-id", node.id);

      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", node.r);
      circle.setAttribute("class", "collab-node-shape");
      group.appendChild(circle);

      hit.setAttribute("cx", node.x);
      hit.setAttribute("cy", node.y);
      hit.setAttribute("r", node.r + 12);
      hit.setAttribute("class", "collab-node-hit");
      group.appendChild(hit);

      if (node.is_self) {
        text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.x);
        text.setAttribute("y", node.y);
        text.setAttribute("class", "collab-node-self-label");
        text.textContent = "MC";
        group.appendChild(text);
      }

      hit.addEventListener("mouseenter", function () {
        if (!selectedId) setInfoForNode(node);
      });

      hit.addEventListener("mouseleave", function () {
        if (!selectedId) setInfoForNode(null);
      });

      hit.addEventListener("click", function () {
        if (node.is_self) {
          selectedId = null;
          setInfoForNode(null);
          clearJointPanel();
        } else {
          selectedId = selectedId === node.id ? null : node.id;
          setInfoForNode(selectedId ? node : null);
          renderJointPapers(selectedId ? node : null);
        }
        render();
      });

      nodesLayer.appendChild(group);

      if (shouldShowLabel(node)) {
        label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        pos = labelPosition(node);
        label.setAttribute("x", pos.x);
        label.setAttribute("y", pos.y);
        label.setAttribute("class", "collab-node-label" + (selectedId === node.id ? " collab-node-label--selected" : ""));
        label.textContent = shortLabel(node.label);
        labelsLayer.appendChild(label);
      }
    });
  }

  function scheduleRender() {
    if (renderTimer) {
      window.clearTimeout(renderTimer);
    }
    renderTimer = window.setTimeout(function () {
      renderTimer = null;
      if (!isSectionActive()) return;
      window.requestAnimationFrame(render);
    }, 60);
  }

  function onLangChange() {
    if (selectedId) {
      var node = layoutNodes.find(function (n) { return n.id === selectedId; });
      if (node) {
        setInfoForNode(node);
        renderJointPapers(node);
      }
    }
    if (window.SiteI18n && typeof window.SiteI18n.apply === "function") {
      window.SiteI18n.apply();
    }
    scheduleRender();
  }

  initFilters();

  var observer = new MutationObserver(function () {
    if (!isSectionActive()) return;
    layoutWidth = 0;
    retryCount = 0;
    scheduleRender();
  });
  observer.observe(sectionNode, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("resize", function () {
    if (!isSectionActive()) return;
    layoutWidth = 0;
    scheduleRender();
  });

  document.addEventListener("site:langchange", onLangChange);

  window.renderCollaborationNetwork = scheduleRender;
  scheduleRender();
})();
