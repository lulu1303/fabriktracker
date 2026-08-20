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
   ---------------------------------------------------------
   NEUE VERSION

   Kategorien:
   Brick  = category_id 11
   Plate  = category_id 14
   Tile   = category_id 19

   Brickslot = category_id 16
   -> wird bei "Brick" NICHT mehr als normaler Brick behandelt.
========================================================= */

async function fetchLegoPartSuggestions(query) {

  const suggestions =
    document.getElementById("partSuggestions");

  const errorBox =
    document.getElementById("partSearchError");


  if (!suggestions) {
    return;
  }


  suggestions.style.display = "block";

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


    /* =====================================================
       NORMALISIEREN
    ===================================================== */

    const normalizedSearch =
      normalizeDimensionQuery(search);


    const dimension =
      extractDimension(
        normalizedSearch
      );


    /* =====================================================
       KATEGORIEN
       
       Diese IDs stammen direkt aus deiner Datenbank.
       ===================================================== */

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


    /* =====================================================
       ERGEBNISSE
    ===================================================== */

    let results = [];


    /* =====================================================
       1. EXAKTE TEILENUMMER
       
       Beispiel:
       3001
       3020
       3068a
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
      Array.isArray(exactNumberResults)
    ) {

      results =
        results.concat(
          exactNumberResults
        );

    }


    /* =====================================================
       2. SPEZIELLE KATEGORIE-SUCHE
       
       DAS IST DER WICHTIGSTE FIX.
       
       Wir benutzen category_id und NICHT mehr:
       
       category=ilike.%brick%
       
       ===================================================== */

    if (isBrickSearch) {

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
        Array.isArray(brickResults)
      ) {

        results =
          results.concat(
            brickResults
          );

      }

    }


    if (isPlateSearch) {

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
        Array.isArray(plateResults)
      ) {

        results =
          results.concat(
            plateResults
          );

      }

    }


    if (isTileSearch) {

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
        Array.isArray(tileResults)
      ) {

        results =
          results.concat(
            tileResults
          );

      }

    }


    /* =====================================================
       3. TEILENUMMER TEILWEISE
       
       Beispiel:
       300
       -> 3001, 3002, ...
       
       NICHT bei "brick", "plate", "tile".
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
        Array.isArray(numberResults)
      ) {

        results =
          results.concat(
            numberResults
          );

      }

    }


    /* =====================================================
       4. NAMENSSUCHE
       
       Nur wenn es KEINE reine Basiskategorie-Suche ist.
       
       Dadurch holen wir bei "Brick" nicht wieder
       brickslot0001 über den Namen.
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
        Array.isArray(nameResults)
      ) {

        results =
          results.concat(
            nameResults
          );

      }

    }


    /* =====================================================
       5. DIMENSIONSSUCHE
       
       Beispiel:
       Brick 2 x 4
       Plate 2 x 4
       Tile 2 x 2
       ===================================================== */

    if (dimension) {

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
        Array.isArray(dimensionResults)
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
       BEI BASISKATEGORIEN:
       NUR DIE RICHTIGE KATEGORIE
       
       Sicherheitsfilter.
       
       Selbst wenn später irgendwo eine weitere Abfrage
       Ergebnisse hineinliefert, werden falsche Kategorien
       hier endgültig entfernt.
    ===================================================== */

    if (isBrickSearch) {

      results =
        results.filter(
          part =>
            Number(part.category_id) ===
            CATEGORY_BRICK
        );

    }


    if (isPlateSearch) {

      results =
        results.filter(
          part =>
            Number(part.category_id) ===
            CATEGORY_PLATE
        );

    }


    if (isTileSearch) {

      results =
        results.filter(
          part =>
            Number(part.category_id) ===
            CATEGORY_TILE
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
       PRIORITÄT
    ===================================================== */

    function getPartPriority(part) {

      const number =
        String(
          part.part_num || ""
        )
          .toLowerCase()
          .trim();


      const name =
        String(
          part.name || ""
        )
          .toLowerCase()
          .replace(
            /\s+/g,
            " "
          )
          .trim();


      const categoryId =
        Number(
          part.category_id
        );


      let priority = 10000;


      /* ===============================================
         EXAKTE TEILENUMMER
      =============================================== */

      if (
        number === search
      ) {

        priority -= 100000;

      }


      /* ===============================================
         TEILENUMMER BEGINNT MIT SUCHE
      =============================================== */

      if (
        number.startsWith(search)
      ) {

        priority -= 10000;

      }


      /* ===============================================
         TEILENUMMER ENTHÄLT SUCHE
      =============================================== */

      if (
        number.includes(search)
      ) {

        priority -= 3000;

      }


      /* ===============================================
         EXAKTE DIMENSION
      =============================================== */

      if (
        dimension
      ) {

        const partDimension =
          extractDimension(
            normalizeDimensionQuery(
              name
            )
          );


        if (
          partDimension === dimension
        ) {

          priority -= 30000;

        }

      }


      /* ===============================================
         RICHTIGE BASISKATEGORIE
      =============================================== */

      if (
        isBrickSearch &&
        categoryId === CATEGORY_BRICK
      ) {

        priority -= 50000;

      }


      if (
        isPlateSearch &&
        categoryId === CATEGORY_PLATE
      ) {

        priority -= 50000;

      }


      if (
        isTileSearch &&
        categoryId === CATEGORY_TILE
      ) {

        priority -= 50000;

      }


      /* ===============================================
         STANDARD BRICK
         
         Jetzt funktioniert auch:
         Brick 2 x 4
      =============================================== */

      const standardBrick =
        /^brick\s+\d+\s*x\s*\d+$/i.test(
          name
        );


      if (
        isBrickSearch &&
        standardBrick
      ) {

        priority -= 50000;

      }


      /* ===============================================
         STANDARD PLATE
      =============================================== */

      const standardPlate =
        /^plate\s+\d+\s*x\s*\d+$/i.test(
          name
        );


      if (
        isPlateSearch &&
        standardPlate
      ) {

        priority -= 50000;

      }


      /* ===============================================
         STANDARD TILE
         
         "without Groove" und "with Groove"
         sind normale Tile-Varianten und bleiben
         deshalb weit oben.
      =============================================== */

      const standardTile =
        /^tile\s+\d+\s*x\s*\d+(?:\s+(?:with|without)\s+groove)?$/i.test(
          name
        );


      if (
        isTileSearch &&
        standardTile
      ) {

        priority -= 50000;

      }


      /* ===============================================
         EXAKTER NAME
      =============================================== */

      if (
        normalizeDimensionQuery(name) ===
        normalizedSearch
      ) {

        priority -= 20000;

      }


      /* ===============================================
         NAME BEGINNT MIT SUCHE
      =============================================== */

      if (
        name.startsWith(
          search + " "
        )
      ) {

        priority -= 5000;

      }


      /* ===============================================
         NAME ENTHÄLT SUCHE
      =============================================== */

      if (
        name.includes(search)
      ) {

        priority -= 1500;

      }


      /* ===============================================
         MODIFIED
      =============================================== */

      if (
        name.includes("modified")
      ) {

        priority += 12000;

      }


      /* ===============================================
         SPECIAL
      =============================================== */

      if (
        name.includes("special")
      ) {

        priority += 12000;

      }


      /* ===============================================
         ASSEMBLY
      =============================================== */

      if (
        name.includes("assembly")
      ) {

        priority += 12000;

      }


      /* ===============================================
         WITH
         
         Bei Tile "with Groove" soll es NICHT
         komplett nach hinten fallen.
         
         Bei anderen Sonderteilen schon.
      =============================================== */

      if (
        name.includes("with ") &&
        !(
          isTileSearch &&
          name.includes("groove")
        )
      ) {

        priority += 9000;

      }


      /* ===============================================
         OHNE / WITHOUT
      =============================================== */

      if (
        name.includes("without ") &&
        !(
          isTileSearch &&
          name.includes("groove")
        )
      ) {

        priority += 7000;

      }


      /* ===============================================
         PRINT / PATTERN
      =============================================== */

      if (
        name.includes("printed") ||
        name.includes("print") ||
        name.includes("pattern") ||
        name.includes("decorated") ||
        name.includes("decoration")
      ) {

        priority += 20000;

      }


      /* ===============================================
         DUPLO
      =============================================== */

      if (
        name.includes("duplo")
      ) {

        priority += 30000;

      }


      /* ===============================================
         MODULEX
      =============================================== */

      if (
        name.includes("modulex")
      ) {

        priority += 30000;

      }


      /* ===============================================
         EDUCATION
      =============================================== */

      if (
        name.includes("education")
      ) {

        priority += 25000;

      }


      return priority;

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
          getPartPriority(a);


        const priorityB =
          getPartPriority(b);


        if (
          priorityA !==
          priorityB
        ) {

          return (
            priorityA -
            priorityB
          );

        }


        /* ===============================================
           NUMERISCHE TEILENUMMERN
        =============================================== */

        const numberA =
          String(
            a.part_num || ""
          )
            .toLowerCase()
            .trim();


        const numberB =
          String(
            b.part_num || ""
          )
            .toLowerCase()
            .trim();


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
