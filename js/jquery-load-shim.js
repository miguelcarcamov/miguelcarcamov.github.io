/*!
 * jQuery 3 compatibility shim for legacy `.load(handler)` usage.
 * Keeps old plugins (e.g., Waypoints 2.x) working without jQuery Migrate.
 */
(function (window) {
  "use strict";

  var $ = window.jQuery;
  if (!$ || !$.fn) return;

  var originalLoad = $.fn.load;
  $.fn.load = function (url, params, callback) {
    if (typeof url === "function") {
      return this.on("load", url);
    }
    if (typeof params === "function") {
      return this.on("load", params);
    }
    if (typeof callback === "function") {
      return this.on("load", callback);
    }
    if (typeof originalLoad === "function") {
      return originalLoad.apply(this, arguments);
    }
    return this;
  };
})(window);
