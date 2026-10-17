/* =========================================================
   FABRIKTRACKER – SUCHE (Grundfunktionen)

   Die eigentliche Teilesuche läuft serverseitig in Supabase
   (Funktion search_lego_parts) und steckt in search-rpc.js.
   Diese Datei enthält nur noch:

   - searchParts():  einfache lokale Ersatzsuche, falls die
                     Serversuche nicht erreichbar ist
   - searchLegoParts(): Eingabe bei "Teil melden" (Verzögerung)
   - selectLegoPartByIndex() / selectLegoPart(): Teil auswählen

   Abhängigkeiten: parts, displayParts(), escapeHTML(),
   loadColorsForPart(), legoSearchResults (search-rpc.js),
   searchTimer, selectedPart (state.js)
========================================================= */


/* =========================================================
   VORSCHLÄGE AUSBLENDEN
========================================================= */

function hideSuggestions() {

  const suggestions =
    document.getElementById("partSuggestions");

  if (suggestions) {

    suggestions.style.display = "none";
    suggestions.innerHTML = "";

  }

}


/* =========================================================
   EINFACHE LOKALE SUCHE (Ersatz)

   Wird von search-rpc.js nur benutzt, wenn die
   Serversuche fehlschlägt.
========================================================= */

function searchParts() {

  const input =
    document.getElementById("searchInput");

  if (!input) return;

  const tokens =
    input.value
      .toLowerCase()
      .replace(/[×,]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  if (!tokens.length) {

    displayParts(parts);

    return;

  }

  displayParts(
    parts.filter(part => {

      const haystack = [
        part.part_number,
        part.name,
        part.color_name,
        part.category
      ]
        .join(" ")
        .toLowerCase()
        .replace(/×/g, "x");

      return tokens.every(
        token => haystack.includes(token)
      );

    })
  );

}


/* =========================================================
   EINGABE BEI "TEIL MELDEN"
========================================================= */

function searchLegoParts() {

  clearTimeout(
    searchTimer
  );


  const input =
    document.getElementById(
      "partSearchInput"
    );


  if (!input) {

    return;

  }


  const query =
    input.value.trim();


  selectedPart =
    null;


  const selected =
    document.getElementById(
      "selectedPart"
    );


  const colorSelect =
    document.getElementById(
      "colorSelect"
    );


  const submitButton =
    document.getElementById(
      "submitReportButton"
    );


  if (selected) {

    selected.innerHTML =
      "";

  }


  if (colorSelect) {

    colorSelect.disabled =
      true;

    colorSelect.innerHTML = `
      <option value="">
        Erst Teil auswählen...
      </option>
    `;

  }


  if (submitButton) {

    submitButton.disabled =
      true;

  }


  if (
    query.length < 2
  ) {

    legoSearchResults =
      [];

    hideSuggestions();

    return;

  }


  searchTimer =
    setTimeout(
      () =>
        fetchLegoPartSuggestions(
          query
        ),
      250
    );

}


/* =========================================================
   TEIL ÜBER INDEX AUSWÄHLEN
========================================================= */

function selectLegoPartByIndex(
  index
) {

  const part =
    legoSearchResults[
      Number(index)
    ];


  if (!part) {

    console.error(
      "LEGO-Suchergebnis nicht gefunden:",
      index,
      legoSearchResults
    );

    return;

  }


  selectLegoPart(
    part
  );

}


/* =========================================================
   TEIL AUSWÄHLEN
========================================================= */

async function selectLegoPart(
  part
) {

  if (!part) {

    return;

  }


  selectedPart =
    part;


  const input =
    document.getElementById(
      "partSearchInput"
    );


  const suggestions =
    document.getElementById(
      "partSuggestions"
    );


  const selected =
    document.getElementById(
      "selectedPart"
    );


  const errorBox =
    document.getElementById(
      "partSearchError"
    );


  if (input) {

    input.value =
      part.part_num +
      " – " +
      part.name;

  }


  if (suggestions) {

    suggestions.style.display =
      "none";

  }


  if (errorBox) {

    errorBox.textContent =
      "";

  }


  if (selected) {

    selected.innerHTML = `

      <div class="selected-part">

        ✅ LEGO ${escapeHTML(
          part.part_num
        )}

        –

        ${escapeHTML(
          part.name
        )}

      </div>

    `;

  }


  await loadColorsForPart(
    part.part_num
  );

}
