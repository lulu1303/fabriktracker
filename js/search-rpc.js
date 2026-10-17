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
              <div class="suggestion-number">
                LEGO ${number}
              </div>
              <div class="suggestion-name">
                ${name} · ${category}
              </div>
            </div>
          `;
        })
        .join("");

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
