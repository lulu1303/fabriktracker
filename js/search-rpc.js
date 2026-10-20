/* =========================================================
   FABRIKTRACKER – SERVERSEITIGE TEILESUCHE

   Ersetzt fetchLegoPartSuggestions() aus search.js.
   Muss NACH search.js geladen werden.

   Die Suche läuft in Supabase (Funktion search_lego_parts):
   - Teilenummer (3010, 3010pr0042 ...)
   - Klartext: "1x4 brick", "brick 1 x 4", "2x2 plate", "1x4"
   - Standardteile zuerst (Brick 1 x 4 vor bedruckten Varianten)
========================================================= */

var legoSearchResults = [];
var legoSearchRequestId = 0;

/* Es werden zuerst 20 Teile gezeigt; beim Scrollen kommen
   jeweils 20 weitere dazu (bis maximal 200). */
var LEGO_PAGE_SIZE = 20;
var LEGO_MAX_RESULTS = 200;
var legoSearchQuery = "";
var legoSearchLimit = LEGO_PAGE_SIZE;
var legoSearchLoadingMore = false;

function legoSuggestionHTML(part, index) {

  const number = escapeHTML(part.part_num || "");
  const name = escapeHTML(part.name || "");
  const category =
    escapeHTML(getCategoryName(part.category_id, part.category || ""));

  return `
    <div
      class="suggestion"
      role="button"
      tabindex="0"
      onclick="selectLegoPartByIndex(${index})"
      onkeydown="
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectLegoPartByIndex(${index});
        }
      "
    >
      <div class="suggestion-thumb" data-part-num="${number}"><span class="brick-logo" aria-hidden="true"></span></div>
      <div class="suggestion-text">
        <div class="suggestion-number">LEGO ${number}</div>
        <div class="suggestion-name">${name} · ${category}</div>
      </div>
    </div>
  `;
}

function legoFetchRows(query, limit) {
  return supabaseRequest(
    SUPABASE_URL + "/rest/v1/rpc/search_lego_parts",
    {
      method: "POST",
      body: JSON.stringify({ q: query, max_results: limit })
    }
  );
}

async function fetchLegoPartSuggestions(query) {

  const suggestions =
    document.getElementById("partSuggestions");

  const errorBox =
    document.getElementById("partSearchError");

  if (!suggestions) return;

  const requestId = ++legoSearchRequestId;

  legoSearchQuery = query;
  legoSearchLimit = LEGO_PAGE_SIZE;
  legoSearchLoadingMore = false;

  suggestions.style.display = "block";
  suggestions.scrollTop = 0;

  suggestions.innerHTML = `
    <div class="suggestion">
      🔎 Suche Teile...
    </div>
  `;

  if (errorBox) errorBox.textContent = "";

  try {

    const results = await legoFetchRows(query, legoSearchLimit);

    /* Veraltete Antwort einer früheren Eingabe ignorieren */
    if (requestId !== legoSearchRequestId) return;

    legoSearchResults =
      Array.isArray(results) ? results : [];

    if (!legoSearchResults.length) {

      suggestions.innerHTML = `
        <div class="suggestion">
          ❌ Kein passendes LEGO Teil gefunden.
        </div>
      `;

      return;
    }

    suggestions.innerHTML =
      legoSearchResults.map(legoSuggestionHTML).join("");

    loadSuggestionThumbs(requestId);

    if (!suggestions.dataset.scrollBound) {
      suggestions.dataset.scrollBound = "1";
      suggestions.addEventListener("scroll", () => {
        if (
          suggestions.scrollTop + suggestions.clientHeight >=
          suggestions.scrollHeight - 60
        ) {
          loadMoreLegoSuggestions();
        }
      });
    }

  } catch (error) {

    console.error("LEGO-Teilesuche Fehler:", error);

    if (requestId !== legoSearchRequestId) return;

    legoSearchResults = [];
    suggestions.innerHTML = "";

    if (errorBox) {
      errorBox.textContent =
        "❌ Fehler bei der Teilesuche: " +
        (error.message || "Unbekannter Fehler");
    }
  }
}

/* Weitere Treffer nachladen, sobald man ans Ende der Liste scrollt */
async function loadMoreLegoSuggestions() {

  const suggestions =
    document.getElementById("partSuggestions");

  if (
    !suggestions ||
    legoSearchLoadingMore ||
    legoSearchResults.length < legoSearchLimit ||
    legoSearchLimit >= LEGO_MAX_RESULTS
  ) {
    return;
  }

  legoSearchLoadingMore = true;

  const requestId = legoSearchRequestId;
  const query = legoSearchQuery;
  const newLimit =
    Math.min(legoSearchLimit + LEGO_PAGE_SIZE, LEGO_MAX_RESULTS);

  try {

    const results = await legoFetchRows(query, newLimit);

    if (requestId !== legoSearchRequestId) return;

    const rows = Array.isArray(results) ? results : [];
    const oldCount = legoSearchResults.length;

    legoSearchLimit = newLimit;
    legoSearchResults = rows;

    if (rows.length > oldCount) {

      suggestions.insertAdjacentHTML(
        "beforeend",
        rows
          .slice(oldCount)
          .map((part, i) => legoSuggestionHTML(part, oldCount + i))
          .join("")
      );

      loadSuggestionThumbs(requestId);
    }

  } catch (error) {

    console.warn("Weitere Treffer konnten nicht geladen werden:", error);

  } finally {

    legoSearchLoadingMore = false;
  }
}


/* Kleine Teilebilder in den Vorschlägen von "Teil melden".
   Pro Teil wird fest (per Teilenummer) eine der Farben genommen, in der es
   das Teil gibt (Tabelle lego_part_colors). Hat ein Teil kein
   Farbbild, wird das allgemeine Bild aus lego_parts genutzt. */
async function loadSuggestionThumbs(requestId, root, isCurrent) {

  /* Standard: Vorschläge von "Teil melden". Die Suche im Bereich
     "Benachrichtigungen" übergibt ihre eigene Liste. */
  const container =
    root || document.getElementById("partSuggestions");

  const stillCurrent =
    typeof isCurrent === "function"
      ? isCurrent
      : () => requestId === legoSearchRequestId;

  if (!container) return;

  const pending = Array.from(
    container.querySelectorAll(".suggestion-thumb:not([data-done])")
  );

  pending.forEach(box => { box.dataset.done = "1"; });

  const nums = pending
    .map(box => box.dataset.partNum)
    .filter(Boolean);

  if (!nums.length) return;

  const urlsByPart = new Map();

  const addUrl = (num, url) => {
    if (!url) return;
    if (!urlsByPart.has(num)) urlsByPart.set(num, []);
    urlsByPart.get(num).push(url);
  };

  const inList = list =>
    encodeURIComponent(
      list.map(n => '"' + n.replace(/"/g, "") + '"').join(",")
    );

  try {

    /* Farbbilder in kleinen Gruppen laden (Zeilenlimit von Supabase) */
    const batches = [];

    for (let i = 0; i < nums.length; i += 8) {
      batches.push(nums.slice(i, i + 8));
    }

    await Promise.all([

      ...batches.map(async batch => {

        const rows = await supabaseRequest(
          SUPABASE_URL + "/rest/v1/lego_part_colors" +
          "?select=part_num,image_url" +
          "&image_url=not.is.null" +
          "&part_num=in.(" + inList(batch) + ")" +
          "&limit=1000"
        );

        (rows || []).forEach(row => addUrl(row.part_num, row.image_url));
      }),

      (async () => {

        const rows = await supabaseRequest(
          SUPABASE_URL + "/rest/v1/lego_parts" +
          "?select=part_num,image_url" +
          "&part_num=in.(" + inList(nums) + ")"
        );

        (rows || []).forEach(row => {
          if (row.image_url) addUrl("fallback:" + row.part_num, row.image_url);
        });
      })()

    ]);

    if (!stillCurrent()) return;

    pending
      .forEach(box => {

        const num = box.dataset.partNum;

        /* Pro Teil eine feste "zufällige" Farbe (aus der Teilenummer
           berechnet, daher immer dieselbe), danach Reserve-Bilder */
        const all = (urlsByPart.get(num) || []).slice().sort();

        let hash = 0;
        for (const ch of num) {
          hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        }

        const urls = [];
        for (let i = 0; i < Math.min(4, all.length); i++) {
          urls.push(all[(hash + i) % all.length]);
        }

        urls.push(...(urlsByPart.get("fallback:" + num) || []));

        const tryNext = () => {

          const url = urls.shift();
          if (!url) return;

          const img = new Image();
          img.alt = "";
          img.onload = () => { box.textContent = ""; box.appendChild(img); };
          img.onerror = tryNext;
          img.src = url;
        };

        tryNext();
      });

  } catch (error) {

    /* Bilder sind nur Zusatz – Fehler ignorieren */
    console.warn("Vorschaubilder konnten nicht geladen werden:", error);

  }
}


/* =========================================================
   HAUPTSUCHE (oben auf der Seite)

   Nutzt dieselbe Supabase-Funktion search_lego_parts wie
   die "Teil melden"-Suche und filtert damit die bereits
   gemeldeten Teile. Reihenfolge = Wichtigkeit:
   Standardteile zuerst, Duplo/Primo, Prints und Sticker
   nur bei ausdrücklicher Eingabe.

   Zusätzlich werden Farbe und Kategorie durchsucht.
========================================================= */

var mainSearchTimer = null;
var mainSearchRequestId = 0;

const searchPartsLocalFallback = window.searchParts;

window.searchParts = function () {

  clearTimeout(mainSearchTimer);

  const input =
    document.getElementById("searchInput");

  if (!input) return;

  const query = input.value.trim();

  if (!query) {
    mainSearchRequestId++;
    displayParts(parts);
    return;
  }

  mainSearchTimer = setTimeout(
    () => runMainSearch(query),
    200
  );
};

async function runMainSearch(query) {

  const requestId = ++mainSearchRequestId;

  try {

    const rows = await supabaseRequest(
      SUPABASE_URL + "/rest/v1/rpc/search_lego_parts",
      {
        method: "POST",
        body: JSON.stringify({
          q: query,
          max_results: 1000
        })
      }
    );

    /* Veraltete Antwort einer früheren Eingabe ignorieren */
    if (requestId !== mainSearchRequestId) return;

    const rank = new Map();

    (rows || []).forEach((row, index) => {

      const key =
        String(row.part_num || "").toLowerCase();

      if (!rank.has(key)) rank.set(key, index);
    });

    const q = query.toLowerCase();

    const wantDuplo   = /duplo|primo|quatro/.test(q);
    const wantPrint   = /print|pattern|decorat|(pr|pb)\d/.test(q);
    const wantSticker = /sticker/.test(q);

    const matched = [];
    const extra = [];

    (parts || []).forEach(part => {

      const key =
        String(part.part_number || "").toLowerCase();

      if (rank.has(key)) {
        matched.push({ part, rank: rank.get(key) });
        return;
      }

      /* Zusätzlich: Farbe oder Kategorie */
      const name =
        String(part.name || "");

      const isDuplo =
        /duplo|primo|quatro/i.test(name) ||
        Number(part.category_id) === 4;

      const isSticker =
        /sticker/i.test(name) ||
        Number(part.category_id) === 58;

      const isPrint =
        /(pr|pb)\d/i.test(part.part_number || "") ||
        /print|pattern|decorat/i.test(name);

      if (
        (isDuplo && !wantDuplo) ||
        (isSticker && !wantSticker) ||
        (isPrint && !wantPrint)
      ) {
        return;
      }

      const color =
        String(part.color_name || "").toLowerCase();

      const categoryName =
        String(
          getCategoryName(
            part.category_id,
            part.category || ""
          )
        ).toLowerCase();

      if (color.includes(q) || categoryName.includes(q)) {
        extra.push(part);
      }
    });

    matched.sort((a, b) => a.rank - b.rank);

    displayParts([
      ...matched.map(item => item.part),
      ...extra
    ]);

  } catch (error) {

    console.warn(
      "Serversuche fehlgeschlagen, nutze lokale Suche:",
      error
    );

    if (requestId !== mainSearchRequestId) return;

    searchPartsLocalFallback();
  }
}
