/* =========================================================
   FOTO-ERKENNUNG
   FabrikTracker

   Ein oder mehrere Fotos -> Vorschläge für das Teil + Farbvorschlag.

   - Erkennung: Supabase-Funktion "identify-part" (Brickognize).
     Mehrere Fotos werden nacheinander erkannt, während man das
     erste schon bestätigt.
   - Farbe: Hauptfarbe aus dem Foto, verglichen mit den Farben,
     die es für das gewählte Teil wirklich gibt.
   - Ein Foto: weiter im normalen Meldeformular.
     Mehrere Fotos: "Melden & weiter" direkt pro Foto.
========================================================= */

(function () {

  var MAX_SIDE = 1024;
  var MAX_PHOTOS = 20;
  var FUNCTION_URL = SUPABASE_URL + "/functions/v1/identify-part";

  var queue = [];     // [{ canvas, thumb, box, status, matched, chosen, colors, colorId, result, message, sending }]
  var idx = 0;        // aktuelles Foto
  var session = 0;    // erhöht sich bei jeder neuen Auswahl (alte Läufe brechen ab)
  var finished = false;


  function area() { return document.getElementById("photoArea"); }

  function esc(text) {
    return typeof escapeHTML === "function"
      ? escapeHTML(String(text == null ? "" : text))
      : String(text == null ? "" : text);
  }

  function isBatch() { return queue.length > 1; }

  function current() { return queue[idx] || null; }


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
  function dominantColor(photoCanvas, photoBox) {

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

  function smallDataURL(canvas, side, quality) {

    var c = document.createElement("canvas");
    var scale = Math.min(1, side / Math.max(canvas.width, canvas.height));
    c.width = Math.max(1, Math.round(canvas.width * scale));
    c.height = Math.max(1, Math.round(canvas.height * scale));
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);

    return c.toDataURL("image/jpeg", quality);
  }


  /* -------------------------------------------------------
     ERKENNUNG (nacheinander, im Hintergrund)
  ------------------------------------------------------- */

  async function recognize(item) {

    item.status = "busy";
    item.error = "";

    try {

      var blob = await canvasToBlob(item.canvas);

      var response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg", "apikey": SUPABASE_KEY },
        body: blob
      });

      if (!response.ok) {
        var err = {};
        try { err = await response.json(); } catch (e) { /* egal */ }
        throw new Error(err.error || ("http_" + response.status));
      }

      var result = await response.json();

      if (result.colors) console.info("Brickognize colors:", result.colors);

      var bb = result.bounding_box;

      if (bb && bb.image_width && bb.image_height) {
        var sx = item.canvas.width / bb.image_width;
        var sy = item.canvas.height / bb.image_height;
        item.box = { l: bb.left * sx, t: bb.upper * sy, r: bb.right * sx, b: bb.lower * sy };
      }

      var items = (result.items || []).slice(0, 8);

      if (!items.length) { item.status = "empty"; return; }

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

      var byNum = {};
      rows.forEach(function (row) { byNum[row.part_num] = row; });

      item.matched = items.map(function (it) {
        return { item: it, row: byNum[it.id] || null };
      });

      item.status = "ready";

    } catch (error) {

      console.warn("Foto-Erkennung fehlgeschlagen:", error);

      item.status = "error";
      item.error =
        navigator.onLine === false
          ? "Kein Netz. Zum Erkennen wird Internet gebraucht."
          : String(error.message) === "rate"
            ? "Zu viele Versuche kurz hintereinander. Bitte kurz warten und noch einmal versuchen."
            : "Die Erkennung ist gerade nicht erreichbar. Später noch einmal versuchen oder das Teil über die Suche finden.";
    }
  }

  async function worker(mySession, files) {

    /* Fotos nacheinander laden und erkennen */
    for (var i = 0; i < files.length; i++) {

      if (mySession !== session) return;

      var item = queue[i];

      try {
        var img = await loadImage(files[i]);
        item.canvas = makeCanvas(img);
        item.thumb = smallDataURL(item.canvas, 160, 0.7);
      } catch (error) {
        item.status = "error";
        item.error = "Das Foto konnte nicht gelesen werden.";
        item.unreadable = true;
        if (mySession === session) draw();
        continue;
      }

      if (mySession !== session) return;
      if (queue[i] !== item) return;

      /* Schon übersprungen? Dann nicht mehr erkennen */
      if (!item.result) {
        if (mySession === session) draw();
        await recognize(item);
      }

      if (mySession !== session) return;

      draw();
    }
  }

  function startFiles(fileList) {

    var files = Array.prototype.slice.call(fileList || []).slice(0, MAX_PHOTOS);

    if (!files.length) return;

    session++;
    finished = false;
    idx = 0;

    queue = files.map(function () {
      return {
        canvas: null, thumb: "", box: null, status: "queued", error: "",
        matched: [], chosen: null, colors: [], colorId: null,
        result: null, message: "", sending: false, step: "pick"
      };
    });

    draw();

    worker(session, files);
  }

  function retryItem(item) {

    if (!item || !item.canvas) return;

    var mySession = session;

    item.status = "queued";
    draw();

    recognize(item).then(function () {
      if (mySession === session) draw();
    });
  }


  /* -------------------------------------------------------
     ANZEIGE
  ------------------------------------------------------- */

  function stripHTML() {

    if (!isBatch()) return "";

    var done = queue.filter(function (q) { return q.result; }).length;

    var html = '<div class="photo-progress">Foto ' + Math.min(idx + 1, queue.length) +
      ' von ' + queue.length + ' · ' + done + ' erledigt</div><div class="photo-strip">';

    queue.forEach(function (q, i) {

      var mark = q.result === "reported" ? "✅" : q.result === "skipped" ? "⏭" : "";

      html += '<span class="photo-strip-item' + (i === idx && !finished ? ' current' : '') + '">' +
        (q.thumb ? '<img alt="" src="' + q.thumb + '">' : '<span class="photo-strip-empty"></span>') +
        (mark ? '<span class="photo-strip-mark">' + mark + '</span>' : '') +
        '</span>';
    });

    return html + '</div>';
  }

  function previewHTML(item) {

    if (!item || !item.thumb) return "";

    return '<img class="photo-preview" alt="Dein Foto" src="' + item.thumb + '">';
  }

  function againHTML() {
    return '<button type="button" class="secondary" data-photo="again">📷 Neue Fotos</button>';
  }

  function skipHTML() {
    return isBatch()
      ? '<button type="button" class="secondary" data-photo="skip">Überspringen</button>'
      : "";
  }

  function draw() {

    var el = area();

    if (!el) return;

    if (!queue.length) { el.innerHTML = ""; return; }

    if (finished) { el.innerHTML = summaryHTML(); return; }

    var item = current();

    if (!item) { finish(); return; }

    var html = '<div class="photo-card">' + stripHTML() + previewHTML(item);

    if (item.status === "queued" || item.status === "busy") {

      html += '<div class="photo-status">' +
        (item.status === "busy" || !item.canvas ? '🔍 Teil wird erkannt…' : '⏳ Wartet…') +
        '</div>' + (isBatch() ? '<div class="photo-actions">' + skipHTML() + '</div>' : '');

    } else if (item.status === "error") {

      html += '<div class="photo-status photo-error">' + esc(item.error) + '</div>' +
        '<div class="photo-actions">' +
          (item.unreadable ? "" : '<button type="button" class="secondary" data-photo="retry">Noch einmal</button>') +
          skipHTML() + againHTML() +
        '</div>';

    } else if (item.status === "empty") {

      html += '<div class="photo-status">Kein Teil erkannt. Näher ran, besseres Licht oder nur ein Teil im Bild.</div>' +
        '<div class="photo-actions">' + skipHTML() + againHTML() + '</div>';

    } else if (item.chosen && item.step === "color") {

      html += colorStepHTML(item);

    } else {

      html += suggestionsHTML(item);
    }

    el.innerHTML = html + '</div>';
  }

  function suggestionsHTML(item) {

    var html = '<div class="photo-title">Welches Teil ist es?</div><div class="photo-list">';

    item.matched.forEach(function (entry, index) {

      var row = entry.row;
      var score = entry.item.score != null ? Math.round(entry.item.score * 100) + " %" : "";

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

    return html + '</div><div class="photo-actions">' + skipHTML() + againHTML() + '</div>';
  }

  function colorStepHTML(item) {

    var chosen = item.chosen;

    var html =
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

    if (item.colors.length) {

      html += '<div class="photo-title">Farbe (automatisch geschätzt, bitte prüfen)</div><div class="photo-colors">';

      item.colors.slice(0, 5).forEach(function (c, i) {
        html +=
          '<button type="button" class="photo-color' + (c.id === item.colorId ? ' selected' : '') +
          '" data-photo="color" data-color="' + c.id + '">' +
            '<span class="photo-swatch" style="background:#' + esc(c.hex || "cccccc") + '"></span>' +
            esc(c.name) + (i === 0 ? ' · beste Übereinstimmung' : '') +
          '</button>';
      });

      html += '</div>';

      if (!isBatch()) {
        html += '<div class="photo-hint">Andere Farbe? Im nächsten Schritt kann die Liste aller Farben genutzt werden.</div>';
      }
    } else {
      html += '<div class="photo-status photo-error">Für dieses Teil sind keine Farben hinterlegt.</div>';
    }

    if (item.message) {
      html += '<div class="photo-status photo-error">' + esc(item.message) + '</div>';
    }

    if (isBatch()) {

      html += '<div class="photo-actions">' +
        '<button type="button" class="secondary" data-photo="back">Zurück</button>' +
        skipHTML() +
        '<button type="button" class="primary" data-photo="submit"' +
          (item.sending || item.colorId == null ? ' disabled' : '') + '>' +
          (item.sending ? 'Wird gespeichert…' : 'Melden & weiter') +
        '</button></div>';

    } else {

      html += '<div class="photo-actions">' +
        '<button type="button" class="secondary" data-photo="back">Zurück</button>' +
        '<button type="button" class="primary" data-photo="continue">Weiter zum Melden</button>' +
        '</div>';
    }

    return html;
  }

  function summaryHTML() {

    var reported = queue.filter(function (q) { return q.result === "reported"; });
    var skipped = queue.filter(function (q) { return q.result === "skipped"; }).length;

    var html = '<div class="photo-card"><div class="photo-title">Fertig 🎉</div>' +
      '<div class="photo-status">✅ ' + reported.length + ' gemeldet' +
      (skipped ? ' · ⏭ ' + skipped + ' übersprungen' : '') + '</div>';

    if (reported.length) {
      html += '<ul class="photo-done-list">';
      reported.forEach(function (q) {
        var color = q.colors.filter(function (c) { return c.id === q.colorId; })[0];
        html += '<li>LEGO ' + esc(q.chosen.part_num) + ' – ' + esc(q.chosen.name) +
          (color ? ' (' + esc(color.name) + ')' : '') + '</li>';
      });
      html += '</ul>';
    }

    return html + '<div class="photo-actions">' +
      '<button type="button" class="primary" data-photo="close">Fertig</button>' + againHTML() +
      '</div></div>';
  }


  /* -------------------------------------------------------
     ABLAUF DER FOTOS
  ------------------------------------------------------- */

  function next() {

    idx++;

    while (queue[idx] && queue[idx].result) idx++;

    if (idx >= queue.length) {

      /* Noch nicht erledigte weiter vorne? */
      var open = -1;
      for (var i = 0; i < queue.length; i++) {
        if (!queue[i].result) { open = i; break; }
      }

      if (open >= 0) { idx = open; draw(); return; }

      finish();
      return;
    }

    draw();
  }

  function finish() {

    finished = true;
    draw();

    if (queue.some(function (q) { return q.result === "reported"; }) &&
        typeof window.loadParts === "function") {
      window.loadParts();
    }
  }

  async function pickPart(index) {

    var item = current();
    var entry = item && item.matched[index];

    if (!entry || !entry.row) return;

    var mySession = session;

    item.chosen = entry.row;
    item.colors = [];
    item.colorId = null;
    item.message = "";
    item.status = "colors";   // nur Anzeige: Farben werden geladen

    var el = area();
    if (el) {
      el.innerHTML = '<div class="photo-card">' + stripHTML() + previewHTML(item) +
        '<div class="photo-status">🎨 Farbe wird geschätzt…</div></div>';
    }

    try {

      var links = await req(
        SUPABASE_URL + "/rest/v1/lego_part_colors?select=color_id&part_num=eq." +
        encodeURIComponent(item.chosen.part_num)
      ) || [];

      var ids = Array.from(new Set(links.map(function (l) { return l.color_id; })
        .filter(function (id) { return id != null && Number(id) !== 9999; })));

      if (ids.length) {

        var colors = await req(
          SUPABASE_URL + "/rest/v1/lego_colors?select=id,name,rgb,is_trans&id=in." +
          encodeURIComponent("(" + ids.join(",") + ")")
        ) || [];

        var target = dominantColor(item.canvas, item.box);
        var targetLab = target ? toLab(target[0], target[1], target[2]) : null;

        item.colors = colors.map(function (c) {

          var rgb = parseHex(c.rgb);
          var distance = (rgb && targetLab)
            ? labDistance(targetLab, toLab(rgb[0], rgb[1], rgb[2]))
            : 999;

          return { id: c.id, name: c.name, hex: String(c.rgb || "").replace("#", ""), distance: distance };

        }).sort(function (a, b) { return a.distance - b.distance; });

        if (item.colors.length) item.colorId = item.colors[0].id;
      }

    } catch (error) {
      console.warn("Farben konnten nicht geladen werden:", error);
    }

    item.status = "ready";
    item.step = "color";

    if (mySession !== session) return;

    draw();
  }

  /* Direkt melden (nur bei mehreren Fotos): gleiche Regeln wie das Formular */
  async function reportDirect(part, colorId) {

    var now = new Date().toISOString();

    async function findExisting() {
      var rows = await req(
        PARTS_URL + "?part_number=eq." + encodeURIComponent(part.part_num) +
        "&color_id=eq." + colorId + "&select=id,is_available&limit=1"
      );
      return (Array.isArray(rows) && rows.length) ? rows[0] : null;
    }

    async function confirmExisting(existing) {
      await req(
        PARTS_URL + "?id=eq." + encodeURIComponent(existing.id),
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ is_available: true, last_seen_at: now })
        }
      );
    }

    var existing = await findExisting();

    if (existing) { await confirmExisting(existing); return; }

    try {

      await req(
        PARTS_URL,
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            part_number: part.part_num,
            name: part.name,
            category: part.category || "",
            color_id: colorId,
            is_available: true,
            last_seen_at: now
          })
        }
      );

    } catch (insertError) {

      if (String(insertError.code) !== "23505") throw insertError;

      var again = await findExisting();

      if (!again) throw insertError;

      await confirmExisting(again);
    }
  }

  async function submitItem() {

    var item = current();

    if (!item || item.sending || !item.chosen || item.colorId == null) return;

    var mySession = session;

    item.sending = true;
    item.message = "";
    draw();

    try {

      await reportDirect(item.chosen, Number(item.colorId));

      try { localStorage.setItem("fabriktracker_last_color", String(item.colorId)); } catch (e) { /* egal */ }

      item.result = "reported";
      item.sending = false;

      if (mySession !== session) return;

      next();

    } catch (error) {

      item.sending = false;
      item.message = "Konnte nicht gespeichert werden. " +
        (typeof friendlyError === "function" ? friendlyError(error) : "");

      if (mySession === session) draw();
    }
  }

  async function continueToReport() {

    var item = current();

    if (!item || !item.chosen) return;

    var part = item.chosen;
    var colorId = item.colorId;

    openReportForm();

    await selectLegoPart(part);

    var select = document.getElementById("colorSelect");
    var submit = document.getElementById("submitReportButton");

    if (select && colorId != null) {

      var wanted = String(colorId);

      if (Array.from(select.options).some(function (o) { return o.value === wanted; })) {
        select.value = wanted;
        if (submit) submit.disabled = false;
      }
    }

    clearAll();

    var form = document.getElementById("reportArea");
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function searchUnknown(index) {

    var item = current();
    var entry = item && item.matched[index];

    if (!entry) return;

    var code = entry.item.id;

    clearAll();

    openReportForm();

    var input = document.getElementById("partSearchInput");

    if (input) {
      input.value = code;
      if (typeof searchLegoParts === "function") searchLegoParts();
    }
  }

  function clearAll() {
    session++;
    queue = [];
    idx = 0;
    finished = false;
    var el = area();
    if (el) el.innerHTML = "";
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
    var item = current();

    if (action === "again") openPicker();
    else if (action === "pick") pickPart(index);
    else if (action === "search") searchUnknown(index);
    else if (action === "back") { if (item) { item.step = "pick"; item.chosen = null; item.message = ""; draw(); } }
    else if (action === "continue") continueToReport();
    else if (action === "submit") submitItem();
    else if (action === "retry") retryItem(item);
    else if (action === "close") clearAll();
    else if (action === "skip") {
      if (item) { item.result = "skipped"; next(); }
    }
    else if (action === "color") {
      if (item) { item.colorId = Number(target.getAttribute("data-color")); draw(); }
    }
  });

  document.addEventListener("change", function (event) {

    if (event.target && event.target.id === "photoInput") {
      startFiles(event.target.files);
    }
  });

})();
