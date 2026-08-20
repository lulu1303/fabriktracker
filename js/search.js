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

      if (dimension) {

        const dimensions =
          extractAllDimensions(name);

        if (
          !dimensions.includes(dimension)
        ) {

          return false;

        }

      }

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
   DIMENSION NORMALISIEREN
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
   DIMENSIONEN ALS ZAHLEN
========================================================= */

function getPartDimensions(name) {

  const normalized =
    normalizeDimensionQuery(name);

  const matches =
    normalized.match(
      /\d+\s*x\s*\d+/g
    );

  if (!matches) {
    return [];
  }

  return matches
    .map(value => {

      const numbers =
        value.match(/\d+/g);

      if (
        !numbers ||
        numbers.length < 2
      ) {

        return null;

      }

      return [
        Number(numbers[0]),
        Number(numbers[1])
      ];

    })
    .filter(Boolean);

}


/* =========================================================
   HAUPTDIMENSION
========================================================= */

function getPrimaryPartDimension(name) {

  const dimensions =
    getPartDimensions(name);

  if (
    dimensions.length === 0
  ) {

    return null;

  }

  return dimensions[0];

}


/* =========================================================
   GRÖSSENVERGLEICH
========================================================= */

function comparePartDimensions(
  nameA,
  nameB
) {

  const dimensionA =
    getPrimaryPartDimension(nameA);

  const dimensionB =
    getPrimaryPartDimension(nameB);


  if (
    !dimensionA &&
    !dimensionB
  ) {

    return 0;

  }


  if (!dimensionA) {

    return 1;

  }


  if (!dimensionB) {

    return -1;

  }


  const widthA =
    dimensionA[0];

  const depthA =
    dimensionA[1];

  const widthB =
    dimensionB[0];

  const depthB =
    dimensionB[1];


  /*
     1 x ...
     2 x ...
     3 x ...
  */

  if (
    widthA !== widthB
  ) {

    return widthA - widthB;

  }


  /*
     ... x 1
     ... x 2
     ... x 3
  */

  if (
    depthA !== depthB
  ) {

    return depthA - depthB;

  }


  return 0;

}


/* =========================================================
   STANDARD BRICK
========================================================= */

function isStandardBrickName(name) {

  return /^brick\s+\d+\s*x\s*\d+$/i.test(
    normalizeDimensionQuery(name)
  );

}


/* =========================================================
   STANDARD PLATE
========================================================= */

function isStandardPlateName(name) {

  return /^plate\s+\d+\s*x\s*\d+$/i.test(
    normalizeDimensionQuery(name)
  );

}


/* =========================================================
   STANDARD TILE
========================================================= */

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
   SONDERTEIL
========================================================= */

function isSpecialPartName(name) {

  const value =
    normalizeSearchText(name);

  return (

    value.includes("modified") ||
    value.includes("special") ||
    value.includes("assembly") ||
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
   LEGO TEILESUCHE
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

  if (
    query.length < 2
  ) {

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
   URL BUILDER
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
   RESULTS HINZUFÜGEN
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

async function fetchLegoPartSuggestions(query) {

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

  try {

    const search =
      String(query || "")
        .trim()
        .toLowerCase();

    if (!search) {

      legoSearchResults = [];

      suggestions.innerHTML = "";

      return;

    }


    const normalizedSearch =
      normalizeDimensionQuery(
        search
      );


    const dimension =
      extractDimension(
        normalizedSearch
      );


    const CATEGORY_BRICK = 11;
    const CATEGORY_PLATE = 14;
    const CATEGORY_TILE = 19;


    const isBrickSearch =
      normalizedSearch === "brick" ||
      normalizedSearch === "bricks";


    const isPlateSearch =
      normalizedSearch === "plate" ||
      normalizedSearch === "plates";


    const isTileSearch =
      normalizedSearch === "tile" ||
      normalizedSearch === "tiles";


    let results = [];


    /* =====================================================
       EXAKTE TEILENUMMER
    ===================================================== */

    const exactNumberUrl =
      LEGO_PARTS_URL +
      "?part_num=eq." +
      encodeURIComponent(search) +
      "&select=part_num,name,category_id,category" +
      "&limit=20";


    const exactNumberResults =
      await supabaseRequest(
        exactNumberUrl
      );


    if (
      Array.isArray(
        exactNumberResults
      )
    ) {

      results =
        results.concat(
          exactNumberResults
        );

    }


    /* =====================================================
       BRICKS
    ===================================================== */

    if (
      isBrickSearch
    ) {

      const brickUrl =
        LEGO_PARTS_URL +
        "?category_id=eq." +
        CATEGORY_BRICK +
        "&select=part_num,name,category_id,category" +
        "&limit=1000";


      const brickResults =
        await supabaseRequest(
          brickUrl
        );


      if (
        Array.isArray(
          brickResults
        )
      ) {

        results =
          results.concat(
            brickResults
          );

      }

    }


    /* =====================================================
       PLATES
    ===================================================== */

    if (
      isPlateSearch
    ) {

      const plateUrl =
        LEGO_PARTS_URL +
        "?category_id=eq." +
        CATEGORY_PLATE +
        "&select=part_num,name,category_id,category" +
        "&limit=1000";


      const plateResults =
        await supabaseRequest(
          plateUrl
        );


      if (
        Array.isArray(
          plateResults
        )
      ) {

        results =
          results.concat(
            plateResults
          );

      }

    }


    /* =====================================================
       TILES
    ===================================================== */

    if (
      isTileSearch
    ) {

      const tileUrl =
        LEGO_PARTS_URL +
        "?category_id=eq." +
        CATEGORY_TILE +
        "&select=part_num,name,category_id,category" +
        "&limit=1000";


      const tileResults =
        await supabaseRequest(
          tileUrl
        );


      if (
        Array.isArray(
          tileResults
        )
      ) {

        results =
          results.concat(
            tileResults
          );

      }

    }


    /* =====================================================
       TEILENUMMER TEILWEISE
    ===================================================== */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );


    if (
      looksLikePartNumber
    ) {

      const numberUrl =
        LEGO_PARTS_URL +
        "?part_num=ilike." +
        encodeURIComponent(
          "%" +
          search +
          "%"
        ) +
        "&select=part_num,name,category_id,category" +
        "&limit=200";


      const numberResults =
        await supabaseRequest(
          numberUrl
        );


      if (
        Array.isArray(
          numberResults
        )
      ) {

        results =
          results.concat(
            numberResults
          );

      }

    }


    /* =====================================================
       NAMEN
    ===================================================== */

    if (
      !isBrickSearch &&
      !isPlateSearch &&
      !isTileSearch
    ) {

      const nameUrl =
        LEGO_PARTS_URL +
        "?name=ilike." +
        encodeURIComponent(
          "%" +
          normalizedSearch +
          "%"
        ) +
        "&select=part_num,name,category_id,category" +
        "&limit=500";


      const nameResults =
        await supabaseRequest(
          nameUrl
        );


      if (
        Array.isArray(
          nameResults
        )
      ) {

        results =
          results.concat(
            nameResults
          );

      }

    }


    /* =====================================================
       DIMENSIONSSUCHE
    ===================================================== */

    if (
      dimension
    ) {

      const compactDimension =
        dimension.replace(
          /\s*x\s*/gi,
          "x"
        );


      const dimensionUrl =
        LEGO_PARTS_URL +
        "?name=ilike." +
        encodeURIComponent(
          "%" +
          compactDimension +
          "%"
        ) +
        "&select=part_num,name,category_id,category" +
        "&limit=500";


      const dimensionResults =
        await supabaseRequest(
          dimensionUrl
        );


      if (
        Array.isArray(
          dimensionResults
        )
      ) {

        results =
          results.concat(
            dimensionResults
          );

      }

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
        String(
          part.part_num || ""
        )
          .toLowerCase()
          .trim();


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
       KATEGORIEN
    ===================================================== */

    if (
      isBrickSearch
    ) {

      results =
        results.filter(
          part =>
            Number(
              part.category_id
            ) === CATEGORY_BRICK
        );

    }


    if (
      isPlateSearch
    ) {

      results =
        results.filter(
          part =>
            Number(
              part.category_id
            ) === CATEGORY_PLATE
        );

    }


    if (
      isTileSearch
    ) {

      results =
        results.filter(
          part =>
            Number(
              part.category_id
            ) === CATEGORY_TILE
        );


      /*
         WICHTIG:

         Bei "Tile" wollen wir nur
         Varianten mit Groove.

         Dadurch verschwinden:

         Tile 2 x 2 without Groove
         Printed Tiles
         Pattern Tiles
         Clipboard Tiles usw.

         Übrig bleiben nur Namen,
         die ausdrücklich "with Groove"
         enthalten.
      */

      results =
        results.filter(
          part => {

            const name =
              normalizeSearchText(
                part.name
              );

            return (
              name.includes(
                "with groove"
              )
            );

          }
        );

    }


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
       SUCHRELEVANZ
    ===================================================== */

    function getPartPriority(part) {

      const number =
        normalizeSearchText(
          part.part_num
        );

      const name =
        normalizeSearchText(
          part.name
        );

      let priority = 0;


      /* ================================================
         EXAKTE TEILENUMMER
      ================================================ */

      if (
        number === search
      ) {

        priority -= 100000;

      }


      /* ================================================
         PASSENDE DIMENSION
      ================================================ */

      if (
        dimension
      ) {

        const dimensions =
          extractAllDimensions(
            name
          );

        if (
          dimensions.includes(
            dimension
          )
        ) {

          priority -= 20000;

        }

      }


      /* ================================================
         EXAKTER NAME
      ================================================ */

      if (
        normalizeDimensionQuery(
          name
        ) === normalizedSearch
      ) {

        priority -= 15000;

      }


      /* ================================================
         NAME BEGINNT MIT SUCHE
      ================================================ */

      if (
        name.startsWith(
          search + " "
        )
      ) {

        priority -= 5000;

      }


      /* ================================================
         TEILENUMMER BEGINNT MIT SUCHE
      ================================================ */

      if (
        number.startsWith(
          search
        )
      ) {

        priority -= 3000;

      }


      /* ================================================
         NAME ENTHÄLT SUCHE
      ================================================ */

      if (
        name.includes(search)
      ) {

        priority -= 1000;

      }


      return priority;

    }


    /* =====================================================
       SORTIERUNG
       -----------------------------------------------------
       DIESE REIHENFOLGE IST ENTSCHEIDEND:

       1. Suchrelevanz
       2. Dimension
       3. Normal / Sonderteil
       4. Name
       5. Teilenummer

       Die Teilenummer bestimmt NICHT
       mehr die eigentliche Reihenfolge.
    ===================================================== */

    results.sort(
      (
        a,
        b
      ) => {

        const priorityA =
          getPartPriority(a);

        const priorityB =
          getPartPriority(b);


        /* =========================================
           1. SUCHRELEVANZ
        ========================================= */

        if (
          priorityA !==
          priorityB
        ) {

          return (
            priorityA -
            priorityB
          );

        }


        const nameA =
          normalizeSearchText(
            a.name
          );

        const nameB =
          normalizeSearchText(
            b.name
          );


        /* =========================================
           2. GRÖSSE
        ========================================= */

        const dimensionResult =
          comparePartDimensions(
            nameA,
            nameB
          );


        if (
          dimensionResult !== 0
        ) {

          return dimensionResult;

        }


        /* =========================================
           3. STANDARDTEIL VOR SONDERTEIL
        ========================================= */

        const standardA =
          isStandardPartName(
            nameA
          );

        const standardB =
          isStandardPartName(
            nameB
          );


        if (
          standardA !==
          standardB
        ) {

          return standardA
            ? -1
            : 1;

        }


        /* =========================================
           4. SONDERTEILE NACH HINTEN
        ========================================= */

        const specialA =
          isSpecialPartName(
            nameA
          );

        const specialB =
          isSpecialPartName(
            nameB
          );


        if (
          specialA !==
          specialB
        ) {

          return specialA
            ? 1
            : -1;

        }


        /* =========================================
           5. NAME
        ========================================= */

        const nameCompare =
          nameA.localeCompare(
            nameB,
            undefined,
            {
              numeric: true,
              sensitivity: "base"
            }
          );


        if (
          nameCompare !== 0
        ) {

          return nameCompare;

        }


        /* =========================================
           6. TEILENUMMER
           ------------------------------------------------
           Nur noch als letzter Tie-Breaker.
        ========================================= */

        const numberA =
          normalizeSearchText(
            a.part_num
          );

        const numberB =
          normalizeSearchText(
            b.part_num
          );


        return numberA.localeCompare(
          numberB,
          undefined,
          {
            numeric: true,
            sensitivity: "base"
          }
        );

      }
    );


    /* =====================================================
       MAXIMAL 20 ERGEBNISSE
    ===================================================== */

    results =
      results.slice(
        0,
        20
      );


    legoSearchResults =
      results;


    /* =====================================================
       ANZEIGE
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


  } catch (
    error
  ) {

    console.error(
      "LEGO-Teilesuche Fehler:",
      error
    );


    legoSearchResults = [];


    suggestions.innerHTML = "";


    if (
      errorBox
    ) {

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
   WEITERE SUCHPRIORITÄT
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

  let priority = 100000;


  if (
    number === search
  ) {

    priority -= 300000;

  }


  if (
    dimension
  ) {

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


  if (
    normalizeDimensionQuery(
      name
    ) === normalizedSearch
  ) {

    priority -= 30000;

  }


  if (
    name.startsWith(
      search + " "
    )
  ) {

    priority -= 10000;

  }


  if (
    number.startsWith(
      search
    )
  ) {

    priority -= 5000;

  }


  if (
    name.includes(search)
  ) {

    priority -= 2000;

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
