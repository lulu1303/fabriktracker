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

async function fetchLegoPartSuggestions(query) {

  const suggestions =
    document.getElementById("partSuggestions");

  const errorBox =
    document.getElementById("partSearchError");

  if (!suggestions) return;

  const requestId = ++legoSearchRequestId;

  suggestions.style.display = "block";

  suggestions.innerHTML = `
    <div class="suggestion">
      🔎 Suche Teile...
    </div>
  `;

  if (errorBox) errorBox.textContent = "";

  try {

    const results = await supabaseRequest(
      SUPABASE_URL + "/rest/v1/rpc/search_lego_parts",
      {
        method: "POST",
        body: JSON.stringify({
          q: query,
          max_results: 30
        })
      }
    );

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
      legoSearchResults
        .map((part, index) => {

          const number =
            escapeHTML(part.part_num || "");

          const name =
            escapeHTML(part.name || "");

          const category =
            escapeHTML(
              getCategoryName(
                part.category_id,
                part.category || ""
              )
            );

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
              <div class="suggestion-thumb" data-part-num="${number}">🧱</div>
              <div class="suggestion-text">
                <div class="suggestion-number">
                  LEGO ${number}
                </div>
                <div class="suggestion-name">
                  ${name} · ${category}
                </div>
              </div>
            </div>
          `;
        })
        .join("");

    loadSuggestionThumbs(requestId);

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


/* Kleine Teilebilder in den Vorschlägen von "Teil melden" */
async function loadSuggestionThumbs(requestId) {

  const nums = legoSearchResults
    .map(part => String(part.part_num || ""))
    .filter(Boolean);

  if (!nums.length) return;

  try {

    const list = nums
      .map(n => '"' + n.replace(/"/g, "") + '"')
      .join(",");

    const rows = await supabaseRequest(
      SUPABASE_URL + "/rest/v1/lego_parts" +
      "?select=part_num,image_url" +
      "&part_num=in.(" + encodeURIComponent(list) + ")"
    );

    if (requestId !== legoSearchRequestId) return;

    const images = new Map();

    (rows || []).forEach(row => {
      if (row.image_url) images.set(row.part_num, row.image_url);
    });

    document
      .querySelectorAll("#partSuggestions .suggestion-thumb")
      .forEach(box => {

        const url = images.get(box.dataset.partNum);
        if (!url) return;

        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = "";
        img.src = url;
        img.onload = () => { box.textContent = ""; box.appendChild(img); };

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
