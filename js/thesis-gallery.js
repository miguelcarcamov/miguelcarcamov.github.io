(function () {
  "use strict";

  function initThesisGallery() {
    var grid = document.getElementById("thesis-gallery");
    var topicSelect = document.getElementById("thesis-filter-topic");
    var levelSelect = document.getElementById("thesis-filter-level");
    var emptyNode = document.getElementById("thesis-gallery-empty");
    if (!grid) return;

    function applyFilters() {
      var topic = topicSelect ? topicSelect.value : "";
      var level = levelSelect ? levelSelect.value : "";
      var visible = 0;
      grid.querySelectorAll(".thesis-card").forEach(function (card) {
        var cardTopics = (card.getAttribute("data-topics") || "").split(/\s+/);
        var cardLevel = card.getAttribute("data-level") || "";
        var topicMatch = !topic || cardTopics.indexOf(topic) >= 0;
        var levelMatch = !level || cardLevel === level;
        var show = topicMatch && levelMatch;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (emptyNode) emptyNode.hidden = visible > 0;
    }

    if (topicSelect) topicSelect.addEventListener("change", applyFilters);
    if (levelSelect) levelSelect.addEventListener("change", applyFilters);
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThesisGallery);
  } else {
    initThesisGallery();
  }
})();
