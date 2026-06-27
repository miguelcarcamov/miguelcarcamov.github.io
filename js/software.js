(function () {
  "use strict";

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

  function initCopyButtons() {
    document.querySelectorAll(".software-copy-bibtex, .software-copy-cite-stack").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var targetId = btn.getAttribute("data-bibtex-target");
        var pre = targetId ? document.getElementById(targetId) : null;
        if (!pre) return;
        var originalKey = btn.classList.contains("software-copy-cite-stack")
          ? "software.copied_stack"
          : "software.copied";
        var original = btn.textContent;
        copyText(pre.textContent || "")
          .then(function () {
            var copied = (window.SiteI18n && window.SiteI18n.t(originalKey))
              || (window.SiteI18n && window.SiteI18n.t("software.copied"))
              || "Copied!";
            btn.textContent = copied;
            setTimeout(function () {
              if (window.SiteI18n && typeof window.SiteI18n.apply === "function") {
                window.SiteI18n.apply();
              } else {
                btn.textContent = original;
              }
            }, 1800);
          })
          .catch(function () {
            /* silent */
          });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCopyButtons);
  } else {
    initCopyButtons();
  }
})();
