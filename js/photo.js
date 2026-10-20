/* =========================================================
   FOTO-ERKENNUNG
   FabrikTracker

   Foto von einem Teil (oder einer Kiste mit gleichen Teilen)
   -> Vorschläge für das Teil + Farbvorschlag.

   - Erkennung: Supabase-Funktion "identify-part" (Brickognize)
   - Farbe: Hauptfarbe aus dem Foto, verglichen mit den Farben,
     die es für das gewählte Teil wirklich gibt.
   - Weiter geht es im normalen Meldeformular (Teil und Farbe
     sind dort schon ausgewählt, gemeldet wird erst per Tipp).
========================================================= */

(function () {

  var MAX_SIDE = 1024;
  var FUNCTION_URL = SUPABASE_URL + "/functions/v1/identify-part";

  var photoCanvas = null;   // verkleinertes Foto
  var photoBox = null;      // erkannter Bereich { l, t, r, b } in Canvas-Pixeln
  var photoRunId = 0;
  var matched = [];         // Vorschläge, die es in der Datenbank gibt
  var chosen = null;        // gewähltes Teil
  var chosenColors = [];    // Farben des gewählten Teils, nach Ähnlichkeit sortiert
  var chosenColorId = null;


  function box() { return document.getElementById("photoArea"); }

  function esc(text) {
    return typeof escapeHTML === "function"
      ? escapeHTML(String(text == null ? "" : text))
      : String(text == null ? "" : text);
  }


  /* -------------------------------------------------------
     FARBMATHE
  ------------------------------------------------------- */

  function toLab(r, g, b) {

    function lin(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    var R = lin(r), G = lin(g), B = lin(b);

    var x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    var y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
    var z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

    function f(t) {
      return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    }

    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  }

  function labDistance(a, b) {
    /* Helligkeit etwas weniger gewichten: Licht auf Fotos schwankt */
    var dl = (a[0] - b[0]) * 0.6;
    var da = a[1] - b[1];
    var db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  function parseHex(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length !== 6) return null;
    var n = parseInt(h, 16);
    if (!Number.isFinite(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }


  /* Häufigste Farbe im erkannten Bereich (ohne Rand und Spiegelungen) */
  function dominantColor() {

    if (!photoCanvas) return null;

    var w = photoCanvas.width;
    var h = photoCanvas.height;

    var l = 0.3 * w, t = 0.3 * h, r = 0.7 * w, b = 0.7 * h;

    if (photoBox) {
      var bw = photoBox.r - photoBox.l;
      var bh = photoBox.b - photoBox.t;
      l = photoBox.l + bw * 0.2;
      r = photoBox.r - bw * 0.2;
      t = photoBox.t + bh * 0.2;
      b = photoBox.b - bh * 0.2;
    }

    l = Math.max(0, Math.floor(l)); t = Math.max(0, Math.floor(t));
    r = Math.min(w, Math.ceil(r));  b = Math.min(h, Math.ceil(b));

    if (r - l < 4 || b - t < 4) return null;

    var data = photoCanvas.getContext("2d")
      .getImageData(l, t, r - l, b - t).data;

    var step = Math.max(1, Math.floor(Math.sqrt(((r - l) * (b - t)) / 6000)));
    var cols = r - l;
    var rows = b - t;

    var buckets = {};
    var pixels = [];

    for (var y = 0; y < rows; y += step) {
      for (var x = 0; x < cols; x += step) {

        var i = (y * cols + x) * 4;
        var R = data[i], G = data[i + 1], B = data[i + 2];

        pixels.push(R, G, B);

        var key = (R >> 4) * 256 + (G >> 4) * 16 + (B >> 4);
        buckets[key] = (buckets[key] || 0) + 1;
      }
    }

    var best = -1, bestCount = 0;

    Object.keys(buckets).forEach(function (k) {
      if (buckets[k] > bestCount) { bestCount = buckets[k]; best = Number(k); }
    });

    if (best < 0) return null;

    var center = [
      ((best >> 8) & 15) * 16 + 8,
      ((best >> 4) & 15) * 16 + 8,
      (best & 15) * 16 + 8
    ];

    var centerLab = toLab(center[0], center[1], center[2]);

    var sr = 0, sg = 0, sb = 0, n = 0;

    for (var p = 0; p < pixels.length; p += 3) {
      var lab = toLab(pixels[p], pixels[p + 1], pixels[p + 2]);
      if (labDistance(lab, centerLab) < 18) {
        sr += pixels[p]; sg += pixels[p + 1]; sb += pixels[p + 2]; n++;
      }
    }

    return n ? [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)] : center;
  }


  /* -------------------------------------------------------
     FOTO LADEN UND VERKLEINERN
  ------------------------------------------------------- */

  function loadImage(file) {

    return new Promise(function (resolve, reject) {

      var url = URL.createObjectURL(file);
      var img = new Image();

      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }

  function makeCanvas(img) {

    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, MAX_SIDE / Math.max(w, h));

    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  function canvasToBlob(canvas) {

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error("blob"));
      }, "image/jpeg", 0.85);
    });
  }


  /* -------------------------------------------------------
     ABLAUF
  ------------------------------------------------------- */

  function render(html) {
    var area = box();
    if (area) area.innerHTML = html;
  }

  function previewHTML() {

    if (!photoCanvas) return "";

    var preview = document.createElement("canvas");
    var scale = Math.min(1, 160 / Math.max(photoCanvas.width, photoCanvas.height));
    preview.width = Math.round(photoCanvas.width * scale);
    preview.height = Math.round(photoCanvas.height * scale);
    preview.getContext("2d").drawImage(photoCanvas, 0, 0, preview.width, preview.height);

    return '<img class="photo-preview" alt="Dein Foto" src="' +
      preview.toDataURL("image/jpeg", 0.7) + '">';
  }

  async function handleFile(file) {

    var runId = ++photoRunId;

    chosen = null;
    chosenColors = [];
    chosenColorId = null;
    matched = [];
    photoBox = null;

    render('<div class="photo-card"><div class="photo-status">📷 Foto wird vorbereitet…</div></div>');

    try {

      var img = await loadImage(file);
      photoCanvas = makeCanvas(img);

    } catch (error) {
      render('<div class="photo-card"><div class="photo-status photo-error">' +
        'Das Foto konnte nicht gelesen werden. Bitte ein anderes versuchen.</div></div>');
      return;
    }

    render('<div class="photo-card">' + previewHTML() +
      '<div class="photo-status">🔍 Teil wird erkannt…</div></div>');

    var result;

    try {

      var blob = await canvasToBlob(photoCanvas);

      var response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "apikey": SUPABASE_KEY
        },
        body: blob
      });

      if (!response.ok) {
        var err = {};
        try { err = await response.json(); } catch (e) { /* egal */ }
        throw new Error(err.error || ("http_" + response.status));
      }

      result = await response.json();

    } catch (error) {

      if (runId !== photoRunId) return;

      var message =
        navigator.onLine === false
          ? "Kein Netz. Zum Erkennen wird Internet gebraucht."
          : String(error.message) === "rate"
            ? "Zu viele Versuche kurz hintereinander. Bitte kurz warten."
            : "Die Erkennung ist gerade nicht erreichbar. Bitte später noch einmal versuchen oder das Teil über die Suche finden.";

      console.warn("Foto-Erkennung fehlgeschlagen:", error);

      render('<div class="photo-card">' + previewHTML() +
        '<div class="photo-status photo-error">' + esc(message) + '</div>' + retryHTML() + '</div>');
      return;
    }

    if (runId !== photoRunId) return;

    if (result.colors) console.info("Brickognize colors:", result.colors);

    var bb = result.bounding_box;

    if (bb && bb.image_width && bb.image_height) {
      var sx = photoCanvas.width / bb.image_width;
      var sy = photoCanvas.height / bb.image_height;
      photoBox = { l: bb.left * sx, t: bb.upper * sy, r: bb.right * sx, b: bb.lower * sy };
    }

    var items = (result.items || []).slice(0, 8);

    if (!items.length) {
      render('<div class="photo-card">' + previewHTML() +
        '<div class="photo-status">Kein Teil erkannt. Näher ran, besseres Licht oder nur ein Teil im Bild.</div>' +
        retryHTML() + '</div>');
      return;
    }

    /* Mit unserer Teiledatenbank abgleichen */
    var rows = [];

    try {

      var ids = items.map(function (i) { return '"' + String(i.id).replace(/"/g, "") + '"'; });

      rows = await req(
        SUPABASE_URL + "/rest/v1/lego_parts" +
        "?select=*&part_num=in." + encodeURIComponent("(" + ids.join(",") + ")")
      ) || [];

    } catch (error) {
      console.warn("Teile konnten nicht abgeglichen werden:", error);
    }

    if (runId !== photoRunId) return;

    var byNum = {};
    rows.forEach(function (row) { byNum[row.part_num] = row; });

    matched = items.map(function (item) {
      return { item: item, row: byNum[item.id] || null };
    });

    renderSuggestions();
  }

  function retryHTML() {
    return '<button type="button" class="secondary" data-photo="again">📷 Neues Foto</button>';
  }

  function renderSuggestions() {

    var html = '<div class="photo-card">' + previewHTML() +
      '<div class="photo-title">Welches Teil ist es?</div>' +
      '<div class="photo-list">';

    matched.forEach(function (entry, index) {

      var row = entry.row;
      var score = entry.item.score != null
        ? Math.round(entry.item.score * 100) + " %"
        : "";

      if (row) {
        html +=
          '<button type="button" class="photo-option" data-photo="pick" data-index="' + index + '">' +
            '<span class="photo-thumb">' +
              (row.image_url
                ? '<img alt="" loading="lazy" src="' + esc(row.image_url) + '">'
                : '<span class="brick-logo" aria-hidden="true"></span>') +
            '</span>' +
            '<span class="photo-text">' +
              '<span class="photo-num">LEGO ' + esc(row.part_num) + '</span>' +
              '<span class="photo-name">' + esc(row.name) + '</span>' +
            '</span>' +
            '<span class="photo-score">' + esc(score) + '</span>' +
          '</button>';
      } else {
        html +=
          '<button type="button" class="photo-option photo-unknown" data-photo="search" data-index="' + index + '">' +
            '<span class="photo-thumb"><span class="brick-logo" aria-hidden="true"></span></span>' +
            '<span class="photo-text">' +
              '<span class="photo-num">Nr. ' + esc(entry.item.id) + '</span>' +
              '<span class="photo-name">' + esc(entry.item.name) + ' · nicht in unserer Liste, tippen zum Suchen</span>' +
            '</span>' +
            '<span class="photo-score">' + esc(score) + '</span>' +
          '</button>';
      }
    });

    html += '</div>' + retryHTML() + '</div>';

    render(html);
  }


  /* -------------------------------------------------------
     TEIL GEWÄHLT -> FARBVORSCHLAG
  ------------------------------------------------------- */

  async function pickPart(index) {

    var entry = matched[index];
    if (!entry || !entry.row) return;

    var runId = photoRunId;

    chosen = entry.row;
    chosenColors = [];
    chosenColorId = null;

    render('<div class="photo-card">' + previewHTML() +
      '<div class="photo-status">🎨 Farbe wird geschätzt…</div></div>');

    try {

      var links = await req(
        SUPABASE_URL + "/rest/v1/lego_part_colors?select=color_id&part_num=eq." +
        encodeURIComponent(chosen.part_num)
      ) || [];

      var ids = Array.from(new Set(links.map(function (l) { return l.color_id; })
        .filter(function (id) { return id != null && Number(id) !== 9999; })));

      if (ids.length) {

        var colors = await req(
          SUPABASE_URL + "/rest/v1/lego_colors?select=id,name,rgb,is_trans&id=in." +
          encodeURIComponent("(" + ids.join(",") + ")")
        ) || [];

        var target = dominantColor();
        var targetLab = target ? toLab(target[0], target[1], target[2]) : null;

        chosenColors = colors.map(function (c) {

          var rgb = parseHex(c.rgb);
          var distance = (rgb && targetLab)
            ? labDistance(targetLab, toLab(rgb[0], rgb[1], rgb[2]))
            : 999;

          return { id: c.id, name: c.name, hex: String(c.rgb || "").replace("#", ""), distance: distance };

        }).sort(function (a, b) { return a.distance - b.distance; });

        if (chosenColors.length) chosenColorId = chosenColors[0].id;
      }

    } catch (error) {
      console.warn("Farben konnten nicht geladen werden:", error);
    }

    if (runId !== photoRunId) return;

    renderColorStep();
  }

  function renderColorStep() {

    var html = '<div class="photo-card">' + previewHTML() +
      '<div class="photo-chosen">' +
        '<span class="photo-thumb">' +
          (chosen.image_url
            ? '<img alt="" src="' + esc(chosen.image_url) + '">'
            : '<span class="brick-logo" aria-hidden="true"></span>') +
        '</span>' +
        '<span class="photo-text">' +
          '<span class="photo-num">LEGO ' + esc(chosen.part_num) + '</span>' +
          '<span class="photo-name">' + esc(chosen.name) + '</span>' +
        '</span>' +
      '</div>';

    if (chosenColors.length) {

      html += '<div class="photo-title">Farbe (automatisch geschätzt, bitte prüfen)</div>' +
        '<div class="photo-colors">';

      chosenColors.slice(0, 5).forEach(function (c, i) {
        html +=
          '<button type="button" class="photo-color' + (c.id === chosenColorId ? ' selected' : '') +
          '" data-photo="color" data-color="' + c.id + '">' +
            '<span class="photo-swatch" style="background:#' + esc(c.hex || "cccccc") + '"></span>' +
            esc(c.name) + (i === 0 ? ' · beste Übereinstimmung' : '') +
          '</button>';
      });

      html += '</div>' +
        '<div class="photo-hint">Andere Farbe? Im nächsten Schritt kann die Liste aller Farben genutzt werden.</div>';
    }

    html +=
      '<div class="photo-actions">' +
        '<button type="button" class="secondary" data-photo="back">Zurück</button>' +
        '<button type="button" class="primary" data-photo="continue">Weiter zum Melden</button>' +
      '</div></div>';

    render(html);
  }

  async function continueToReport() {

    if (!chosen) return;

    openReportForm();

    await selectLegoPart(chosen);

    var select = document.getElementById("colorSelect");
    var submit = document.getElementById("submitReportButton");

    if (select && chosenColorId != null) {

      var wanted = String(chosenColorId);

      if (Array.from(select.options).some(function (o) { return o.value === wanted; })) {
        select.value = wanted;
        if (submit) submit.disabled = false;
      }
    }

    var area = box();
    if (area) area.innerHTML = "";

    var form = document.getElementById("reportArea");
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function searchUnknown(index) {

    var entry = matched[index];
    if (!entry) return;

    var area = box();
    if (area) area.innerHTML = "";

    openReportForm();

    var input = document.getElementById("partSearchInput");

    if (input) {
      input.value = entry.item.id;
      if (typeof searchLegoParts === "function") searchLegoParts();
    }
  }


  /* -------------------------------------------------------
     KLICKS
  ------------------------------------------------------- */

  function openPicker() {
    var input = document.getElementById("photoInput");
    if (input) { input.value = ""; input.click(); }
  }

  document.addEventListener("click", function (event) {

    var target = event.target.closest && event.target.closest("[data-photo], #photoButton");

    if (!target) return;

    if (target.id === "photoButton") { openPicker(); return; }

    var action = target.getAttribute("data-photo");
    var index = Number(target.getAttribute("data-index"));

    if (action === "again") openPicker();
    else if (action === "pick") pickPart(index);
    else if (action === "search") searchUnknown(index);
    else if (action === "back") renderSuggestions();
    else if (action === "continue") continueToReport();
    else if (action === "color") {
      chosenColorId = Number(target.getAttribute("data-color"));
      renderColorStep();
    }
  });

  document.addEventListener("change", function (event) {

    if (event.target && event.target.id === "photoInput") {
      var file = event.target.files && event.target.files[0];
      if (file) handleFile(file);
    }
  });

})();
