(function () {
  "use strict";

  var root = document.querySelector("[data-join-matcher]");
  var dataNode = document.getElementById("join-matcher-data");
  if (!root || !dataNode) return;

  var config;
  try {
    config = JSON.parse(dataNode.textContent || "{}");
  } catch (err) {
    console.warn("join-matcher: invalid JSON", err);
    return;
  }

  var levelButtons = root.querySelectorAll(".join-matcher-level");
  var skillInputs = root.querySelectorAll(".join-matcher-skill input");
  var resultsWrap = root.querySelector(".join-matcher-results");
  var resultsList = root.querySelector("[data-matcher-results]");
  var emptyNode = root.querySelector("[data-matcher-empty]");
  var emailBtn = root.querySelector("[data-matcher-email]");
  var selectedLevel = "";

  function t(key) {
    if (window.SiteI18n && typeof window.SiteI18n.t === "function") {
      return window.SiteI18n.t(key) || "";
    }
    return "";
  }

  function langBlock(obj) {
    var lang = window.SiteI18n && window.SiteI18n.getLang();
    if (lang === "es" && obj && obj.es) return obj.es;
    return (obj && obj.en) || "";
  }

  function selectedSkills() {
    return Array.prototype.filter.call(skillInputs, function (input) {
      return input.checked;
    }).map(function (input) {
      return input.value;
    });
  }

  function matchProjects() {
    if (!selectedLevel) return [];
    var skills = selectedSkills();
    return (config.projects || []).filter(function (project) {
      if (!project.levels || project.levels.indexOf(selectedLevel) === -1) return false;
      var needed = project.matcher_skills || [];
      if (!needed.length) return true;
      var overlap = needed.filter(function (id) {
        return skills.indexOf(id) !== -1;
      });
      var requiredOnProject = needed.filter(function (id) {
        var input = root.querySelector('.join-matcher-skill input[value="' + id + '"]');
        return input && input.getAttribute("data-required") === "true";
      });
      var hasRequired = requiredOnProject.every(function (id) {
        return skills.indexOf(id) !== -1;
      });
      return hasRequired && overlap.length >= Math.ceil(needed.length * 0.5);
    });
  }

  function updateEmail(matches) {
    if (!emailBtn) return;
    var subject = t("join.matcher_email_subject") || "Student research inquiry";
    var lines = [t("join.matcher_email_intro") || "Hello Miguel,"];
    if (selectedLevel) {
      lines.push((t("join.matcher_email_level") || "Level") + ": " + selectedLevel);
    }
    var skills = selectedSkills();
    if (skills.length) {
      lines.push((t("join.matcher_email_skills") || "Skills") + ": " + skills.join(", "));
    }
    if (matches.length) {
      lines.push("");
      lines.push(t("join.matcher_email_projects") || "Projects of interest:");
      matches.forEach(function (project) {
        lines.push("- " + langBlock(project.title));
      });
    }
    emailBtn.href = "mailto:" + encodeURIComponent(config.email || "") +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function render() {
    var matches = matchProjects();
    if (!selectedLevel) {
      resultsWrap.hidden = true;
      return;
    }
    resultsWrap.hidden = false;
    resultsList.innerHTML = "";
    if (!matches.length) {
      emptyNode.hidden = false;
    } else {
      emptyNode.hidden = true;
      matches.forEach(function (project) {
        var li = document.createElement("li");
        li.className = "join-matcher-result-item";
        li.innerHTML =
          "<strong>" + langBlock(project.title) + "</strong>" +
          "<p>" + langBlock(project.description) + "</p>";
        resultsList.appendChild(li);
      });
    }
    updateEmail(matches);
  }

  levelButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectedLevel = btn.getAttribute("data-level") || "";
      levelButtons.forEach(function (other) {
        other.classList.toggle("is-active", other === btn);
      });
      render();
    });
  });

  skillInputs.forEach(function (input) {
    input.addEventListener("change", render);
  });
})();
