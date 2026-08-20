/* =========================================================
   HAUPTSUCHE
========================================================= */

function searchParts() {

  const input =
    document.getElementById("searchInput");

  if (!input) {
    return;
  }

  const query =
    normalizeSearchText(input.value);

  if (!query) {

    displayParts(parts);

    return;
  }

  const normalizedQuery =
    normalizeDimensionQuery(query);

  const dimension =
    extractDimension(normalizedQuery);

  const filtered =
    parts.filter(part => {

      const number =
        normalizeSearchText(
          part.part_number
        );

      const name =
        normalizeSearchText(
          part.name
        );

      const category =
        normalizeSearchText(
          part.category
        );

      const color =
        normalizeSearchText(
          part.color_name
        );

      const categoryName =
        normalizeSearchText(
          getCategoryName(
            part.category_id,
            part.category || ""
          )
        );

      /* ---------------------------------------------
         DIMENSION
      --------------------------------------------- */

      if (dimension) {

        const partDimensions =
          extractAllDimensions(name);

        if (
          !partDimensions.includes(
            dimension
          )
        ) {

          return false;

        }

      }

      /* ---------------------------------------------
         NORMALE SUCHE
      --------------------------------------------- */

      const normalizedName =
        normalizeDimensionQuery(name);

      const normalizedQueryForName =
        normalizeDimensionQuery(query);

      const compactName =
        normalizedName.replace(
          /\s+/g,
          ""
        );

      const compactQuery =
        normalizedQueryForName.replace(
          /\s+/g,
          ""
        );

      return (

        number.includes(query) ||

        name.includes(query) ||

        category.includes(query) ||

        categoryName.includes(query) ||

        color.includes(query) ||

        normalizedName.includes(
          normalizedQueryForName
        ) ||

        compactName.includes(
          compactQuery
        )

      );

    });

  filtered.sort(
    (a, b) =>
      getMainSearchPriority(
        a,
        query,
        dimension
      )
      -
      getMainSearchPriority(
        b,
        query,
        dimension
      )
  );

  displayParts(filtered);
}


/* =========================================================
   TEXT NORMALISIEREN
========================================================= */

function normalizeSearchText(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================================================
   DIMENSIONS-SUCHE
========================================================= */

function normalizeDimensionQuery(value) {

  return String(value || "")

    .toLowerCase()

    .replace(/×/g, "x")

    .replace(
      /(\d)\s*x\s*(\d)/g,
      "$1 x $2"
    )

    .replace(/\s+/g, " ")

    .trim();

}


/* =========================================================
   ERSTE DIMENSION
========================================================= */

function extractDimension(value) {

  const normalized =
    normalizeDimensionQuery(value);

  const match =
    normalized.match(
      /(^|[^0-9])(\d+)\s*x\s*(\d+)([^0-9]|$)/
    );

  if (!match) {
    return null;
  }

  return (
    match[2] +
    "x" +
    match[3]
  );

}


/* =========================================================
   ALLE DIMENSIONEN
========================================================= */

function extractAllDimensions(value) {

  const normalized =
    normalizeDimensionQuery(value);

  const matches =
    normalized.match(
      /\d+\s*x\s*\d+/g
    );

  if (!matches) {
    return [];
  }

  return matches.map(
    dimension =>
      dimension.replace(
        /\s*x\s*/g,
        "x"
      )
  );

}


/* =========================================================
   STANDARDTEILE ERKENNEN
========================================================= */

function isStandardBrickName(name) {

  return /^brick\s+\d+\s*x\s*\d+$/i.test(
    normalizeDimensionQuery(name)
  );

}


function isStandardPlateName(name) {

  return /^plate\s+\d+\s*x\s*\d+$/i.test(
    normalizeDimensionQuery(name)
  );

}


function isStandardTileName(name) {

  return /^tile\s+\d+\s*x\s*\d+$/i.test(
    normalizeDimensionQuery(name)
  );

}


/* =========================================================
   STANDARDTEIL
========================================================= */

function isStandardPartName(name) {

  return (
    isStandardBrickName(name) ||
    isStandardPlateName(name) ||
    isStandardTileName(name)
  );

}


/* =========================================================
   SPEZIALTEIL
========================================================= */

function isSpecialPartName(name) {

  const value =
    normalizeSearchText(name);

  return (

    value.includes("modified") ||

    value.includes("special") ||

    value.includes("assembly") ||

    value.includes("with ") ||

    value.includes("without ") ||

    value.includes("printed") ||

    value.includes("print") ||

    value.includes("pattern") ||

    value.includes("decorated") ||

    value.includes("decoration") ||

    value.includes("legoland") ||

    value.includes("resort") ||

    value.includes("fabrik") ||

    value.includes("duplo") ||

    value.includes("education")

  );

}


/* =========================================================
   HAUPTSUCHE PRIORITÄT
========================================================= */

function getMainSearchPriority(
  part,
  query,
  dimension
) {

  const number =
    normalizeSearchText(
      part.part_number
    );

  const name =
    normalizeSearchText(
      part.name
    );

  const category =
    normalizeSearchText(
      part.category
    );

  const categoryName =
    normalizeSearchText(
      getCategoryName(
        part.category_id,
        part.category || ""
      )
    );

  let score = 100000;

  /* ---------------------------------------------
     EXAKTE TEILENUMMER
  --------------------------------------------- */

  if (number === query) {
    score -= 200000;
  }

  /* ---------------------------------------------
     STANDARDTEILE
  --------------------------------------------- */

  if (isStandardPartName(name)) {
    score -= 50000;
  }

  /* ---------------------------------------------
     DIMENSION
  --------------------------------------------- */

  if (dimension) {

    const dimensions =
      extractAllDimensions(name);

    if (
      dimensions.includes(
        dimension
      )
    ) {

      score -= 30000;

    }

  }

  /* ---------------------------------------------
     EXAKTER NAME
  --------------------------------------------- */

  if (
    normalizeDimensionQuery(name) ===
    normalizeDimensionQuery(query)
  ) {

    score -= 25000;

  }

  /* ---------------------------------------------
     NAME BEGINNT MIT SUCHE
  --------------------------------------------- */

  if (
    name.startsWith(
      query + " "
    )
  ) {

    score -= 10000;

  }

  /* ---------------------------------------------
     TEILENUMMER BEGINNT MIT SUCHE
  --------------------------------------------- */

  if (
    number.startsWith(query)
  ) {

    score -= 8000;

  }

  /* ---------------------------------------------
     NAME ENTHÄLT SUCHE
  --------------------------------------------- */

  if (
    name.includes(query)
  ) {

    score -= 3000;

  }

  /* ---------------------------------------------
     KATEGORIE
  --------------------------------------------- */

  if (
    category.includes(query)
  ) {

    score -= 1000;

  }

  if (
    categoryName.includes(query)
  ) {

    score -= 1000;

  }

  /* ---------------------------------------------
     BASIC / STANDARD
  --------------------------------------------- */

  if (
    name.includes("basic") ||
    name.includes("standard")
  ) {

    score -= 500;

  }

  /* ---------------------------------------------
     BRICKSLOT GANZ NACH HINTEN
  --------------------------------------------- */

  if (
    number.startsWith("brickslot") ||
    name.startsWith("brickslot")
  ) {

    score += 500000;

  }

  /* ---------------------------------------------
     SPEZIALTEILE
  --------------------------------------------- */

  if (
    isSpecialPartName(name)
  ) {

    score += 30000;

  }

  /* ---------------------------------------------
     DUPLO
  --------------------------------------------- */

  if (
    name.includes("duplo") ||
    category.includes("duplo") ||
    categoryName.includes("duplo")
  ) {

    score += 50000;

  }

  /* ---------------------------------------------
     EDUCATION
  --------------------------------------------- */

  if (
    name.includes("education") ||
    category.includes("education") ||
    categoryName.includes("education")
  ) {

    score += 40000;

  }

  return score;

}


/* =========================================================
   LEGO TEILESUCHE STARTEN
========================================================= */

function searchLegoParts() {

  clearTimeout(searchTimer);

  const input =
    document.getElementById(
      "partSearchInput"
    );

  if (!input) {
    return;
  }

  const query =
    input.value.trim();

  selectedPart = null;

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
    selected.innerHTML = "";
  }

  if (colorSelect) {

    colorSelect.disabled = true;

    colorSelect.innerHTML = `
      <option value="">
        Erst Teil auswählen...
      </option>
    `;

  }

  if (submitButton) {
    submitButton.disabled = true;
  }

  if (query.length < 2) {

    legoSearchResults = [];

    hideSuggestions();

    return;

  }

  searchTimer =
    setTimeout(
      () =>
        fetchLegoPartSuggestions(query),
      250
    );

}


/* =========================================================
   URL FÜR SUPABASE
========================================================= */

function buildPartSearchUrl(
  filter
) {

  return (
    LEGO_PARTS_URL +
    "?" +
    filter +
    "&select=part_num,name,category_id,category" +
    "&limit=1000"
  );

}


/* =========================================================
   ERGEBNISSE HINZUFÜGEN
========================================================= */

function addPartResults(
  target,
  results
) {

  if (
    !Array.isArray(results)
  ) {

    return;

  }

  for (
    const part of results
  ) {

    target.push(part);

  }

}


/* =========================================================
   LEGO TEILE SUCHEN
========================================================= */

async function fetchLegoPartSuggestions(
  query
) {

  const suggestions =
    document.getElementById(
      "partSuggestions"
    );

  const errorBox =
    document.getElementById(
      "partSearchError"
    );

  if (!suggestions) {
    return;
  }

  suggestions.style.display =
    "block";

  suggestions.innerHTML = `
    <div class="suggestion">
      🔎 Suche Teile...
    </div>
  `;

  if (errorBox) {
    errorBox.textContent = "";
  }

  /*
   * Verhindert, dass eine ältere Anfrage
   * eine neuere Suche überschreibt.
   */

  const requestId =
    (window.__legoSearchRequestId || 0) + 1;

  window.__legoSearchRequestId =
    requestId;

  try {

    const search =
      normalizeSearchText(query);

    if (!search) {

      legoSearchResults = [];

      suggestions.innerHTML = "";

      return;

    }

    const normalizedSearch =
      normalizeDimensionQuery(search);

    const dimension =
      extractDimension(
        normalizedSearch
      );

    let results = [];


    /* =====================================================
       1. EXAKTE TEILENUMMER
       
       3001 → 3001
    ===================================================== */

    const exactNumberUrl =
      buildPartSearchUrl(
        "part_num=eq." +
        encodeURIComponent(search)
      );

    addPartResults(
      results,
      await supabaseRequest(
        exactNumberUrl
      )
    );


    /* =====================================================
       2. TEILENUMMER TEILWEISE
       
       300 → 3001, 3002 ...
    ===================================================== */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );

    if (
      looksLikePartNumber
    ) {

      const numberUrl =
        buildPartSearchUrl(
          "part_num=ilike." +
          encodeURIComponent(
            "%" +
            search +
            "%"
          )
        );

      addPartResults(
        results,
        await supabaseRequest(
          numberUrl
        )
      );

    }


    /* =====================================================
       3. WICHTIG:
       
       BRICK / PLATE / TILE GEZIELT SUCHEN
       
       NICHT einfach nur die Kategorie holen.
       
       Dadurch werden brickslot0001 usw. nicht mehr
       zum Hauptbestandteil der ersten Ergebnisse.
    ===================================================== */

    const baseSearch =
      search === "brick" ||
      search === "bricks" ||
      search === "plate" ||
      search === "plates" ||
      search === "tile" ||
      search === "tiles";


    if (baseSearch) {

      let prefix = search;

      if (
        search === "bricks"
      ) {
        prefix = "brick";
      }

      if (
        search === "plates"
      ) {
        prefix = "plate";
      }

      if (
        search === "tiles"
      ) {
        prefix = "tile";
      }


      /*
       * DAS IST DER ENTSCHEIDENDE FIX:
       *
       * "brick %" findet:
       *
       * Brick 2 x 4
       * Brick 2 x 3
       * Brick 1 x 2
       *
       * aber NICHT:
       *
       * brickslot0001
       * brickslot0002
       */

      const standardPrefixUrl =
        buildPartSearchUrl(
          "name=ilike." +
          encodeURIComponent(
            prefix + " %"
          )
        );

      addPartResults(
        results,
        await supabaseRequest(
          standardPrefixUrl
        )
      );


      /*
       * Zusätzlich Kategorie laden,
       * damit auch eventuell anders benannte
       * Standardteile gefunden werden.
       */

      const categoryUrl =
        buildPartSearchUrl(
          "category=ilike." +
          encodeURIComponent(
            "%" +
            prefix +
            "%"
          )
        );

      addPartResults(
        results,
        await supabaseRequest(
          categoryUrl
        )
      );

    }


    /* =====================================================
       4. NORMALE NAME-SUCHE
       
       Beispiel:
       Door
       Window
       Plant
       Slope
       Brick 2 x 4
    ===================================================== */

    const nameUrl =
      buildPartSearchUrl(
        "name=ilike." +
        encodeURIComponent(
          "%" +
          normalizedSearch +
          "%"
        )
      );

    addPartResults(
      results,
      await supabaseRequest(
        nameUrl
      )
    );


    /* =====================================================
       5. KATEGORIE-SUCHE
    ===================================================== */

    const categoryUrl =
      buildPartSearchUrl(
        "category=ilike." +
        encodeURIComponent(
          "%" +
          search +
          "%"
        )
      );

    addPartResults(
      results,
      await supabaseRequest(
        categoryUrl
      )
    );


    /* =====================================================
       6. DIMENSIONS-SUCHE
       
       Brick 2x4
       Brick 2 x 4
       Brick 2×4
    ===================================================== */

    if (dimension) {

      /*
       * Wir holen die Grundkategorie erneut gezielt,
       * wenn es sich um Brick / Plate / Tile handelt.
       *
       * Danach entscheidet die lokale Sortierung.
       */

      const firstWord =
        normalizedSearch.split(" ")[0];

      const dimensionCategories = [
        "brick",
        "bricks",
        "plate",
        "plates",
        "tile",
        "tiles"
      ];

      if (
        dimensionCategories.includes(
          firstWord
        )
      ) {

        const dimensionCategoryUrl =
          buildPartSearchUrl(
            "category=ilike." +
            encodeURIComponent(
              "%" +
              firstWord.replace(
                /s$/,
                ""
              ) +
              "%"
            )
          );

        addPartResults(
          results,
          await supabaseRequest(
            dimensionCategoryUrl
          )
        );

      }

    }


    /* =====================================================
       ANFRAGE VERALTET?
    ===================================================== */

    if (
      requestId !==
      window.__legoSearchRequestId
    ) {

      return;

    }


    /* =====================================================
       DUPLIKATE ENTFERNEN
    ===================================================== */

    const uniqueParts =
      new Map();

    for (
      const part of results
    ) {

      const key =
        normalizeSearchText(
          part.part_num
        );

      if (
        key &&
        !uniqueParts.has(key)
      ) {

        uniqueParts.set(
          key,
          part
        );

      }

    }

    results =
      Array.from(
        uniqueParts.values()
      );


    /* =====================================================
       KEINE ERGEBNISSE
    ===================================================== */

    if (
      results.length === 0
    ) {

      legoSearchResults = [];

      suggestions.innerHTML = `
        <div class="suggestion">
          ❌ Kein passendes LEGO Teil gefunden.
        </div>
      `;

      return;

    }


    /* =====================================================
       SORTIEREN
    ===================================================== */

    results.sort(
      (
        a,
        b
      ) => {

        const priorityA =
          getLegoSearchPriority(
            a,
            search,
            normalizedSearch,
            dimension,
            baseSearch
          );

        const priorityB =
          getLegoSearchPriority(
            b,
            search,
            normalizedSearch,
            dimension,
            baseSearch
          );


        if (
          priorityA !==
          priorityB
        ) {

          return (
            priorityA -
            priorityB
          );

        }


        /*
         * Bei gleichem Rang:
         * numerische Teilenummern zuerst
         */

        const numberA =
          normalizeSearchText(
            a.part_num
          );

        const numberB =
          normalizeSearchText(
            b.part_num
          );

        const numericA =
          /^\d+$/.test(
            numberA
          );

        const numericB =
          /^\d+$/.test(
            numberB
          );


        if (
          numericA &&
          numericB
        ) {

          return (
            Number(numberA) -
            Number(numberB)
          );

        }


        if (
          numericA !==
          numericB
        ) {

          return numericA
            ? -1
            : 1;

        }


        return numberA.localeCompare(
          numberB
        );

      }
    );


    /* =====================================================
       MAXIMAL 20 TREFFER
    ===================================================== */

    results =
      results.slice(
        0,
        20
      );


    /* =====================================================
       GLOBAL SPEICHERN
    ===================================================== */

    legoSearchResults =
      results;


    /* =====================================================
       ANZEIGEN
    ===================================================== */

    suggestions.innerHTML =
      results
        .map(
          (
            part,
            index
          ) => {

            const number =
              escapeHTML(
                part.part_num || ""
              );

            const name =
              escapeHTML(
                part.name || ""
              );

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
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault();
                    selectLegoPartByIndex(${index});
                  }
                "
              >

                <div class="suggestion-number">
                  LEGO ${number}
                </div>

                <div class="suggestion-name">
                  ${name}
                  ·
                  ${category}
                </div>

              </div>
            `;

          }
        )
        .join("");


  } catch (error) {

    console.error(
      "LEGO-Teilesuche Fehler:",
      error
    );

    legoSearchResults = [];

    suggestions.innerHTML = "";

    if (errorBox) {

      errorBox.textContent =
        "❌ Fehler bei der Teilesuche: " +
        (
          error.message ||
          "Unbekannter Fehler"
        );

    }

  }

}


/* =========================================================
   LEGO SUCHPRIORITÄT
========================================================= */

function getLegoSearchPriority(
  part,
  search,
  normalizedSearch,
  dimension,
  baseSearch
) {

  const number =
    normalizeSearchText(
      part.part_num
    );

  const name =
    normalizeSearchText(
      part.name
    );

  const normalizedName =
    normalizeDimensionQuery(
      name
    );

  const category =
    normalizeSearchText(
      part.category
    );

  const categoryName =
    normalizeSearchText(
      getCategoryName(
        part.category_id,
        part.category || ""
      )
    );


  let priority = 100000;


  /* =====================================================
     1. EXAKTE TEILENUMMER
     ===================================================== */

  if (
    number === search
  ) {

    priority -= 300000;

  }


  /* =====================================================
     2. STANDARD-BRICK
     ===================================================== */

  const standardBrick =
    isStandardBrickName(name);


  /* =====================================================
     3. STANDARD-PLATE
     ===================================================== */

  const standardPlate =
    isStandardPlateName(name);


  /* =====================================================
     4. STANDARD-TILE
     ===================================================== */

  const standardTile =
    isStandardTileName(name);


  const standardPart =
    standardBrick ||
    standardPlate ||
    standardTile;


  /*
   * Bei einer direkten Suche nach Brick / Plate / Tile
   * haben echte Standardteile absolute Priorität.
   */

  if (
    baseSearch &&
    standardPart
  ) {

    priority -= 150000;

  }


  /* =====================================================
     5. EXAKTER NAME
     ===================================================== */

  if (
    normalizedName ===
    normalizedSearch
  ) {

    priority -= 80000;

  }


  /* =====================================================
     6. DIMENSION
     ===================================================== */

  if (dimension) {

    const dimensions =
      extractAllDimensions(
        name
      );

    if (
      dimensions.includes(
        dimension
      )
    ) {

      priority -= 50000;

    }

  }


  /* =====================================================
     7. NAME BEGINNT MIT SUCHBEGRIFF
     ===================================================== */

  if (
    name.startsWith(
      search + " "
    )
  ) {

    priority -= 15000;

  }


  /* =====================================================
     8. TEILENUMMER BEGINNT MIT SUCHBEGRIFF
     ===================================================== */

  if (
    number.startsWith(search)
  ) {

    priority -= 10000;

  }


  /* =====================================================
     9. NAME ENTHÄLT SUCHBEGRIFF
     ===================================================== */

  if (
    name.includes(search)
  ) {

    priority -= 5000;

  }


  /* =====================================================
     10. KATEGORIE
     ===================================================== */

  if (
    category.includes(search)
  ) {

    priority -= 2000;

  }

  if (
    categoryName.includes(search)
  ) {

    priority -= 2000;

  }


  /* =====================================================
     11. BRICKSLOT
     
     GANZ NACH HINTEN
     ===================================================== */

  if (
    number.startsWith(
      "brickslot"
    ) ||
    name.startsWith(
      "brickslot"
    )
  ) {

    priority += 500000;

  }


  /* =====================================================
     12. MODIFIED
     ===================================================== */

  if (
    name.includes("modified")
  ) {

    priority += 60000;

  }


  /* =====================================================
     13. SPECIAL
     ===================================================== */

  if (
    name.includes("special")
  ) {

    priority += 60000;

  }


  /* =====================================================
     14. ASSEMBLY
     ===================================================== */

  if (
    name.includes("assembly")
  ) {

    priority += 60000;

  }


  /* =====================================================
     15. WITH ...
     ===================================================== */

  if (
    name.includes("with ")
  ) {

    priority += 50000;

  }


  /* =====================================================
     16. WITHOUT ...
     ===================================================== */

  if (
    name.includes("without ") ||
    name.includes("ohne ")
  ) {

    priority += 45000;

  }


  /* =====================================================
     17. PRINT / PATTERN
     ===================================================== */

  if (
    name.includes("printed") ||
    name.includes("print") ||
    name.includes("pattern") ||
    name.includes("decorated") ||
    name.includes("decoration")
  ) {

    priority += 80000;

  }


  /* =====================================================
     18. LEGOLAND / RESORT / FABRIK
     ===================================================== */

  if (
    name.includes("legoland") ||
    name.includes("resort") ||
    name.includes("fabrik")
  ) {

    priority += 80000;

  }


  /* =====================================================
     19. DUPLO
     ===================================================== */

  if (
    name.includes("duplo") ||
    category.includes("duplo") ||
    categoryName.includes("duplo")
  ) {

    priority += 100000;

  }


  /* =====================================================
     20. EDUCATION
     ===================================================== */

  if (
    name.includes("education") ||
    category.includes("education") ||
    categoryName.includes("education")
  ) {

    priority += 90000;

  }


  return priority;

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


  /* =====================================================
     SUCHFELD
  ===================================================== */

  if (input) {

    input.value =
      part.part_num +
      " – " +
      part.name;

  }


  /* =====================================================
     VORSCHLÄGE SCHLIESSEN
  ===================================================== */

  if (suggestions) {

    suggestions.style.display =
      "none";

  }


  /* =====================================================
     FEHLER ENTFERNEN
  ===================================================== */

  if (errorBox) {

    errorBox.textContent =
      "";

  }


  /* =====================================================
     AUSGEWÄHLTES TEIL
  ===================================================== */

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


  /* =====================================================
     FARBEN LADEN
  ===================================================== */

  await loadColorsForPart(
    part.part_num
  );

}
