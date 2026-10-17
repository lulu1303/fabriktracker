/* =========================================================
   EXTRAS
   FabrikTracker

   - Hinweis-Meldungen (Toast) mit optionalem "Rückgängig"
   - Favoriten (Stern), werden nur auf dem Gerät gespeichert
   - Teilebild vergrößern (Tipp aufs Bild)
========================================================= */

(function () {

  /* -------------------------------------------------------
     TOAST: kleine Meldung, verschwindet von selbst
  ------------------------------------------------------- */

  var toastTimer = null;

  function showToast(message, actionLabel, onAction, durationMs) {

    var old = document.getElementById("toast");
    if (old) old.remove();
    clearTimeout(toastTimer);

    var toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");

    var text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    if (actionLabel && typeof onAction === "function") {

      var button = document.createElement("button");
      button.type = "button";
      button.textContent = actionLabel;

      button.addEventListener("click", function () {
        toast.remove();
        clearTimeout(toastTimer);
        onAction();
      });

      toast.appendChild(button);
    }

    document.body.appendChild(toast);

    toastTimer = setTimeout(function () {
      toast.classList.add("toast-hide");
      setTimeout(function () { toast.remove(); }, 300);
    }, durationMs || 6000);
  }

  window.showToast = showToast;


  /* -------------------------------------------------------
     FAVORITEN (nur auf diesem Gerät)
  ------------------------------------------------------- */

  var FAV_KEY = "fabriktracker_favorites";
  var favorites = {};

  try {
    var saved = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    if (Array.isArray(saved)) {
      saved.forEach(function (n) { favorites[String(n)] = true; });
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function saveFavorites() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Object.keys(favorites)));
    } catch (error) { /* egal */ }
  }

  window.isFavorite = function (partNumber) {
    return favorites[String(partNumber)] === true;
  };

  window.getFavoriteCount = function () {
    return Object.keys(favorites).length;
  };

  function toggleFavorite(partNumber) {

    var key = String(partNumber);

    if (favorites[key]) {
      delete favorites[key];
    } else {
      favorites[key] = true;
    }

    saveFavorites();

    var now = favorites[key] === true;

    document
      .querySelectorAll('.fav-star[data-fav="' + key.replace(/"/g, "") + '"]')
      .forEach(function (star) {
        star.textContent = now ? "★" : "☆";
        star.classList.toggle("active", now);
        star.setAttribute(
          "aria-label",
          now ? "Favorit entfernen" : "Als Favorit merken"
        );
      });

    if (typeof window.onFavoritesChanged === "function") {
      window.onFavoritesChanged();
    }
  }


  /* -------------------------------------------------------
     BILD VERGRÖSSERN
  ------------------------------------------------------- */

  function closeLightbox() {
    var box = document.getElementById("imageLightbox");
    if (box) box.remove();
  }

  function copyText(text, done) {

    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (error) { /* egal */ }
      area.remove();
      done();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function openLightbox(img) {

    closeLightbox();

    var folder = img.closest(".part-number-folder");
    var number = folder ? folder.dataset.partNumber || "" : "";

    var nameEl = folder
      ? folder.querySelector(".part-number-name")
      : null;

    var name = nameEl ? nameEl.textContent.trim() : "";

    var box = document.createElement("div");
    box.id = "imageLightbox";
    box.className = "lightbox";

    var card = document.createElement("div");
    card.className = "lightbox-card";

    var big = document.createElement("img");
    big.src = img.currentSrc || img.src;
    big.alt = "LEGO " + number;
    card.appendChild(big);

    var title = document.createElement("div");
    title.className = "lightbox-title";
    title.textContent = "LEGO " + number;
    card.appendChild(title);

    if (name) {
      var sub = document.createElement("div");
      sub.className = "lightbox-name";
      sub.textContent = name;
      card.appendChild(sub);
    }

    var actions = document.createElement("div");
    actions.className = "lightbox-actions";

    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "secondary";
    copy.textContent = "Nummer kopieren";
    copy.addEventListener("click", function (event) {
      event.stopPropagation();
      copyText(number, function () {
        copy.textContent = "✅ Kopiert";
        setTimeout(function () { copy.textContent = "Nummer kopieren"; }, 1500);
      });
    });
    actions.appendChild(copy);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "primary";
    close.textContent = "Schließen";
    close.addEventListener("click", closeLightbox);
    actions.appendChild(close);

    card.appendChild(actions);
    box.appendChild(card);

    box.addEventListener("click", function (event) {
      if (event.target === box) closeLightbox();
    });

    document.body.appendChild(box);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLightbox();
  });


  /* -------------------------------------------------------
     KLICKS (vor den Ordner-Knöpfen abfangen)
  ------------------------------------------------------- */

  document.addEventListener(
    "click",
    function (event) {

      var star = event.target.closest && event.target.closest(".fav-star");

      if (star) {
        event.stopPropagation();
        event.preventDefault();
        toggleFavorite(star.dataset.fav);
        return;
      }

      var image = event.target.closest &&
        event.target.closest(".part-number-image, .part-image");

      if (image && image.tagName === "IMG") {
        event.stopPropagation();
        event.preventDefault();
        openLightbox(image);
      }
    },
    true
  );

})();
