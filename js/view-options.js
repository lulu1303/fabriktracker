/* =========================================================
   ANSICHT-OPTIONEN
   FabrikTracker

   Optionale Steuerung über der Teileliste:
   - "Nur verfügbare Teile" blendet als nicht mehr da
     markierte Teile aus.
   - Sortierung "Zuletzt gesehen" zeigt zuletzt bestätigte
     Teile zuerst (innerhalb ihrer Kategorie).

   Beides ist standardmäßig AUS. Die Auswahl wird im Browser
   gemerkt. Funktioniert mit der normalen Liste und der Suche,
   weil displayParts() umhüllt wird.
========================================================= */

(function () {

  var STORAGE_KEY = "fabriktracker_view_options";

  var options = { onlyAvailable: false, sort: "default" };
  var lastList = null;

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      options.onlyAvailable = saved.onlyAvailable === true;
      options.sort = saved.sort === "recent" ? "recent" : "default";
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch (error) { /* egal */ }
  }

  function time(part) {
    var t = Date.parse(part.last_seen_at || part.created_at || "");
    return isFinite(t) ? t : 0;
  }

  function apply(list) {

    if (!Array.isArray(list)) return list;

    var result = list;

    if (options.onlyAvailable) {
      result = result.filter(function (part) {
        return part.is_available !== false;
      });
    }

    if (options.sort === "recent") {
      /* Array.sort ist stabil: gleiche Zeiten behalten ihre Reihenfolge */
      result = result.slice().sort(function (a, b) {
        return time(b) - time(a);
      });
    }

    return result;
  }

  var originalDisplayParts = window.displayParts;

  if (typeof originalDisplayParts === "function") {

    window.displayParts = function (list) {

      lastList = list;

      var shown = apply(list);

      originalDisplayParts(shown);

      /* Hinweis, falls der Filter alles ausblendet */
      if (
        options.onlyAvailable &&
        Array.isArray(list) && list.length &&
        Array.isArray(shown) && !shown.length
      ) {
        var results = document.getElementById("results");
        if (results) {
          results.innerHTML =
            '<div class="card"><div class="empty">' +
            "Keine verfügbaren Teile gefunden. " +
            "Schalte „Nur verfügbare“ aus, um alle zu sehen." +
            "</div></div>";
        }
      }
    };

    /* displayParts() wird anderswo direkt aufgerufen (globale Funktion) */
    try { displayParts = window.displayParts; } catch (error) { /* egal */ }
  }

  function refresh() {
    if (typeof window.displayParts === "function" && lastList) {
      window.displayParts(lastList);
    }
  }

  function init() {

    var onlyBox = document.getElementById("optOnlyAvailable");
    var sortSelect = document.getElementById("optSort");

    if (onlyBox) {
      onlyBox.checked = options.onlyAvailable;
      onlyBox.addEventListener("change", function () {
        options.onlyAvailable = onlyBox.checked;
        save();
        refresh();
      });
    }

    if (sortSelect) {
      sortSelect.value = options.sort;
      sortSelect.addEventListener("change", function () {
        options.sort = sortSelect.value === "recent" ? "recent" : "default";
        save();
        refresh();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
