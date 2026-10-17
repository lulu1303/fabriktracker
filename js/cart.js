/* =========================================================
   EINKAUFSLISTE
   FabrikTracker

   - 🛒 bei jedem Teil (in seiner Farbe) legt es auf die Liste
   - Schwebender Knopf unten rechts zeigt Anzahl und Preis
   - Liste mit Menge, Abhaken, Gewicht und Preis (normal und
     mit den aktuellen Rabatten)
   - Wird nur auf diesem Gerät gespeichert
========================================================= */

(function () {

  var KEY = "fabriktracker_cart";
  var MAX_ITEMS = 100;

  /* { "3010|5": { n: 2, w: 0.66, name, color, img, done } } */
  var cart = {};

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      cart = saved;
    }
  } catch (error) { /* Storage nicht verfügbar – egal */ }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch (error) { /* egal */ }
  }

  function esc(value) {
    return typeof escapeHTML === "function"
      ? escapeHTML(String(value == null ? "" : value))
      : String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
  }

  function keyOf(num, colorId) {
    return String(num) + "|" + (Number(colorId) || 0);
  }

  function toast(message, label, action) {
    if (typeof window.showToast === "function") {
      window.showToast(message, label, action, 5000);
    }
  }

  window.isInCart = function (num, colorId) {
    return Object.prototype.hasOwnProperty.call(cart, keyOf(num, colorId));
  };


  /* -------------------------------------------------------
     TEIL IN DER GEMELDETEN LISTE FINDEN
  ------------------------------------------------------- */

  function findPart(key) {

    if (typeof parts === "undefined" || !Array.isArray(parts)) return null;

    var pair = key.split("|");

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (
        String(p.part_number) === pair[0] &&
        (Number(p.color_id) || 0) === Number(pair[1])
      ) {
        return p;
      }
    }

    return null;
  }

  function statusOf(key) {

    var p = findPart(key);

    if (!p) return "⚪ Noch nicht gemeldet";
    if (p.is_available === false) return "🔴 Nicht verfügbar";

    var staleDays = typeof STALE_DAYS !== "undefined" ? STALE_DAYS : 7;
    var seen = new Date(p.last_seen_at || p.created_at || 0).getTime();

    if (seen && (Date.now() - seen) / 86400000 >= staleDays) {
      return "🟡 Evtl. nicht mehr da";
    }

    return "🟢 Verfügbar";
  }


  /* -------------------------------------------------------
     PREISE
  ------------------------------------------------------- */

  function perGram() {
    return typeof PRICE_PER_GRAM !== "undefined" ? PRICE_PER_GRAM : 0.11;
  }

  function discounts() {
    return typeof DISCOUNTS !== "undefined" && Array.isArray(DISCOUNTS)
      ? DISCOUNTS
      : [];
  }

  function euro(value) {
    return value.toFixed(2).replace(".", ",") + " €";
  }

  function cents(value) {
    return (value * 100).toFixed(1).replace(".", ",") + " ct";
  }

  function totals() {

    var pieces = 0;
    var grams = 0;
    var unknown = 0;

    Object.keys(cart).forEach(function (key) {

      var item = cart[key];
      var n = Number(item.n) || 1;
      var w = Number(item.w);

      pieces += n;

      if (Number.isFinite(w) && w > 0) grams += w * n;
      else unknown += n;
    });

    return {
      pieces: pieces,
      grams: grams,
      unknown: unknown,
      normal: grams * perGram()
    };
  }


  /* -------------------------------------------------------
     ÄNDERN
  ------------------------------------------------------- */

  function refreshIcons() {

    document.querySelectorAll(".cart-add[data-cart]").forEach(function (icon) {

      var on = Object.prototype.hasOwnProperty.call(cart, icon.dataset.cart);

      icon.classList.toggle("active", on);
      icon.setAttribute(
        "aria-label",
        on ? "Einkaufsliste öffnen" : "Auf die Einkaufsliste"
      );
    });
  }

  function addToCart(key) {

    var p = findPart(key);

    if (!p) return false;

    if (Object.keys(cart).length >= MAX_ITEMS) {
      toast("Die Liste ist voll (höchstens " + MAX_ITEMS + " Teile).");
      return false;
    }

    cart[key] = {
      n: 1,
      w: Number(p.weight_grams) > 0 ? Number(p.weight_grams) : 0,
      name: p.name || "",
      color: p.color_name || "",
      img: p.image_url || "",
      done: false
    };

    save();
    update();

    return true;
  }

  function update() {
    refreshIcons();
    renderFab();
    if (isOpen()) renderPanel();
  }


  /* -------------------------------------------------------
     SCHWEBENDER KNOPF
  ------------------------------------------------------- */

  function renderFab() {

    var fab = document.getElementById("cartFab");

    if (!fab) {
      fab = document.createElement("button");
      fab.id = "cartFab";
      fab.type = "button";
      fab.className = "cart-fab";
      fab.addEventListener("click", openPanel);
      document.body.appendChild(fab);
    }

    var count = Object.keys(cart).length;

    if (!count) {
      fab.hidden = true;
      return;
    }

    var t = totals();

    fab.hidden = false;
    fab.textContent =
      "🛒 " + t.pieces + (t.pieces === 1 ? " Teil" : " Teile") +
      (t.grams > 0 ? " · " + euro(t.normal) : "");
  }


  /* -------------------------------------------------------
     LISTE (Fenster von unten)
  ------------------------------------------------------- */

  function isOpen() {
    var box = document.getElementById("cartOverlay");
    return !!box && !box.hidden;
  }

  function closePanel() {
    var box = document.getElementById("cartOverlay");
    if (box) box.hidden = true;
    document.body.classList.remove("cart-open");
  }

  function openPanel() {

    var box = document.getElementById("cartOverlay");

    if (!box) {

      box = document.createElement("div");
      box.id = "cartOverlay";
      box.className = "cart-overlay";
      box.hidden = true;

      box.addEventListener("click", onPanelClick);
      document.body.appendChild(box);
    }

    box.hidden = false;
    document.body.classList.add("cart-open");

    renderPanel();
  }

  function renderPanel() {

    var box = document.getElementById("cartOverlay");
    if (!box) return;

    var keys = Object.keys(cart);

    /* Gewicht und Bild aus der aktuellen Teileliste auffrischen */
    keys.forEach(function (key) {
      var p = findPart(key);
      if (!p) return;
      if (Number(p.weight_grams) > 0) cart[key].w = Number(p.weight_grams);
      if (p.image_url) cart[key].img = p.image_url;
    });

    var rows = keys.map(function (key) {

      var item = cart[key];
      var num = key.split("|")[0];
      var n = Number(item.n) || 1;
      var w = Number(item.w);
      var hasW = Number.isFinite(w) && w > 0;
      var each = hasW ? w * perGram() : 0;

      return (
        '<div class="cart-row' + (item.done ? " done" : "") + '" data-key="' + esc(key) + '">' +
          '<label class="cart-check">' +
            '<input type="checkbox" data-act="done"' + (item.done ? " checked" : "") + '>' +
          '</label>' +
          '<div class="cart-thumb">' +
            (item.img
              ? '<img src="' + esc(item.img) + '" alt="" onerror="this.style.display=\'none\'">'
              : '<span class="brick-logo" aria-hidden="true"></span>') +
          '</div>' +
          '<div class="cart-text">' +
            '<div class="cart-title">LEGO ' + esc(num) +
              (item.color ? " · " + esc(item.color) : "") + '</div>' +
            (item.name ? '<div class="cart-name">' + esc(item.name) + '</div>' : "") +
            '<div class="cart-status">' + esc(statusOf(key)) + '</div>' +
            '<div class="cart-price">' +
              (hasW
                ? esc(cents(each)) + " pro Stück" +
                  (n > 1 ? " · " + esc(cents(each * n)) + " gesamt" : "")
                : "Gewicht unbekannt") +
            '</div>' +
          '</div>' +
          '<div class="cart-qty">' +
            '<button type="button" data-act="minus" aria-label="Weniger">−</button>' +
            '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3"' +
              ' class="cart-qty-input" data-act="qty" aria-label="Menge" value="' + n + '">' +
            '<button type="button" data-act="plus" aria-label="Mehr">+</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    var t = totals();

    var discountLines = discounts().map(function (d) {
      return (
        '<div class="cart-total-line">' +
          '<span>' + esc(d.emoji || "") + " −" + Math.round(d.rate * 100) + " %" +
            (d.title ? " (" + esc(d.title) + ")" : "") + '</span>' +
          '<strong>' + euro(t.normal * (1 - d.rate)) + '</strong>' +
        '</div>'
      );
    }).join("");

    var oldSheet = box.querySelector(".cart-sheet");
    var scrollTop = oldSheet ? oldSheet.scrollTop : 0;

    box.innerHTML =
      '<div class="cart-sheet" role="dialog" aria-label="Einkaufsliste">' +
        '<div class="cart-head">' +
          '<h2>🛒 Einkaufsliste</h2>' +
          '<button type="button" class="cart-close" data-act="close" aria-label="Schließen">✕</button>' +
        '</div>' +
        (keys.length
          ? '<div class="cart-items">' + rows + '</div>' +
            '<div class="cart-totals">' +
              '<div class="cart-total-line"><span>' + t.pieces +
                (t.pieces === 1 ? " Teil" : " Teile") + " · " +
                t.grams.toFixed(2).replace(".", ",") + ' g</span><span></span></div>' +
              '<div class="cart-total-line main"><span>Normalpreis</span><strong>' +
                euro(t.normal) + '</strong></div>' +
              discountLines +
              (t.unknown
                ? '<div class="cart-note">Für ' + t.unknown +
                  (t.unknown === 1 ? " Teil" : " Teile") +
                  ' ist das Gewicht unbekannt, es fehlt in der Summe.</div>'
                : "") +
              '<div class="cart-note">Richtwert nach Gewicht. Der echte Preis wird an der Kasse gewogen.</div>' +
            '</div>' +
            '<div class="cart-actions">' +
              '<button type="button" class="secondary" data-act="clear-done">Abgehakte entfernen</button>' +
              '<button type="button" class="secondary" data-act="clear-all">Liste leeren</button>' +
            '</div>'
          : '<div class="cart-empty">Noch nichts auf der Liste. Tippe bei einem Teil auf 🛒.</div>') +
      '</div>';

    var newSheet = box.querySelector(".cart-sheet");
    if (newSheet) newSheet.scrollTop = scrollTop;
  }

  function onPanelClick(event) {

    /* Tipp neben das Fenster schließt */
    if (event.target.id === "cartOverlay") {
      closePanel();
      return;
    }

    var target = event.target.closest("[data-act]");
    if (!target) return;

    var act = target.dataset.act;

    /* Tipp ins Mengenfeld: nichts neu zeichnen, sonst verliert das
       Feld sofort den Fokus und die Tastatur verschwindet. */
    if (act === "qty") return;

    var row = target.closest(".cart-row");
    var key = row ? row.dataset.key : "";

    if (act === "close") {
      closePanel();
      return;
    }

    if (act === "plus" && cart[key]) {
      cart[key].n = Math.min(999, (Number(cart[key].n) || 1) + 1);
    }

    if (act === "minus" && cart[key]) {
      var next = (Number(cart[key].n) || 1) - 1;
      if (next < 1) delete cart[key];
      else cart[key].n = next;
    }

    if (act === "done" && cart[key]) {
      cart[key].done = !!target.checked;
    }

    if (act === "clear-done") {
      Object.keys(cart).forEach(function (k) {
        if (cart[k].done) delete cart[k];
      });
    }

    if (act === "clear-all") {
      if (!window.confirm("Die ganze Einkaufsliste leeren?")) return;
      cart = {};
    }

    save();
    update();
  }

  /* Menge direkt eintippen */
  function commitQuantity(input) {

    var row = input.closest(".cart-row");
    var key = row ? row.dataset.key : "";

    if (!cart[key]) return;

    var value = parseInt(String(input.value).replace(/[^0-9]/g, ""), 10);

    if (!Number.isFinite(value) || value < 1) value = 1;
    if (value > 999) value = 999;

    cart[key].n = value;

    save();
    update();
  }

  document.addEventListener("change", function (event) {
    var input = event.target;
    if (input && input.matches && input.matches(".cart-qty-input")) {
      commitQuantity(input);
    }
  });

  document.addEventListener("focusin", function (event) {
    var input = event.target;
    if (input && input.matches && input.matches(".cart-qty-input")) {
      /* Alles markieren, damit man gleich die neue Zahl tippen kann */
      setTimeout(function () { try { input.select(); } catch (e) { /* egal */ } }, 0);
    }
  });

  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") closePanel();

    if (
      event.key === "Enter" &&
      event.target && event.target.matches &&
      event.target.matches(".cart-qty-input")
    ) {
      event.target.blur();
    }
  });


  /* -------------------------------------------------------
     KLICK AUF DAS 🛒 BEI EINEM TEIL
  ------------------------------------------------------- */

  document.addEventListener(
    "click",
    function (event) {

      var icon = event.target.closest && event.target.closest(".cart-add");

      if (!icon) return;

      event.stopPropagation();
      event.preventDefault();

      var key = icon.dataset.cart;

      if (cart[key]) {
        openPanel();
        return;
      }

      if (addToCart(key)) {
        toast("🛒 Auf die Liste gelegt.", "Ansehen", openPanel);
      }
    },
    true
  );


  /* Preise/Status ändern sich, wenn Teile oder Rabatte neu geladen werden */
  var displayPartsBefore = window.displayParts;

  if (typeof displayPartsBefore === "function") {

    window.displayParts = function (list) {

      displayPartsBefore(list);

      try {
        refreshIcons();
        renderFab();
        if (isOpen()) renderPanel();
      } catch (error) {
        console.warn("Einkaufsliste konnte nicht aktualisiert werden:", error);
      }
    };
  }

  function start() {
    renderFab();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

})();
