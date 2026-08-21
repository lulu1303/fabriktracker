/* =========================================================
   FABRIKTRACKER – GEMEINSAME LEGO-SUCHLOGIK

   Diese Datei enthält die komplette Suchlogik für:

   1. Hauptsuche
   2. „Teil melden“-Suche

   WICHTIG:
   Die Supabase-Abfragen werden automatisch paginiert.
   Dadurch sind auch mehr als 1000 Treffer möglich.

   Abhängigkeiten aus der Hauptanwendung:
   - parts
   - displayParts()
   - getCategoryName()
   - supabaseRequest()
   - escapeHTML()
   - loadColorsForPart()
   - hideSuggestions()
   - LEGO_PARTS_URL
   - searchTimer
   - legoSearchResults
   - selectedPart
========================================================= */


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
      /(\d+)\s*[x,]\s*(\d+)/g,
      "$1x$2"
    )
    .replace(/\s+/g, " ")
    .trim();

}


/* =========================================================
   KOMPAKTE SUCHANFRAGE
========================================================= */

function compactSearchText(value) {

  return normalizeDimensionQuery(value)
    .replace(/\s+/g, "");

}


/* =========================================================
   ERSTE DIMENSION EXTRAHIEREN
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
   DIMENSION OHNE REIHENFOLGE

   1x2 == 2x1
========================================================= */

function normalizeDimensionOrder(
  dimension
) {

  if (!dimension) {

    return null;

  }

  const numbers =
    String(dimension)
      .match(/\d+/g);

  if (
    !numbers ||
    numbers.length < 2
  ) {

    return null;

  }

  const a =
    Number(numbers[0]);

  const b =
    Number(numbers[1]);

  return [
    Math.min(a, b),
    Math.max(a, b)
  ].join("x");

}


/* =========================================================
   DIMENSIONEN ALS ZAHLEN
========================================================= */

function getPartDimensions(name) {

  return extractAllDimensions(name)
    .map(
      dimension => {

        const numbers =
          dimension.match(
            /\d+/g
          );

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

      }
    )
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
   DIMENSION PASST ZUR SUCHE
========================================================= */

function partHasDimension(
  name,
  requestedDimension
) {

  if (!requestedDimension) {

    return false;

  }

  const wanted =
    normalizeDimensionOrder(
      requestedDimension
    );

  if (!wanted) {

    return false;

  }

  const dimensions =
    extractAllDimensions(name);

  return dimensions.some(
    dimension =>
      normalizeDimensionOrder(
        dimension
      ) === wanted
  );

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
    Math.min(
      dimensionA[0],
      dimensionA[1]
    );

  const depthA =
    Math.max(
      dimensionA[0],
      dimensionA[1]
    );


  const widthB =
    Math.min(
      dimensionB[0],
      dimensionB[1]
    );

  const depthB =
    Math.max(
      dimensionB[0],
      dimensionB[1]
    );


  if (
    widthA !== widthB
  ) {

    return widthA - widthB;

  }


  if (
    depthA !== depthB
  ) {

    return depthA - depthB;

  }


  return 0;

}


/* =========================================================
   KATEGORIE ERKENNEN
========================================================= */

function getSearchPartType(part) {

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


  const combined =
    (
      name +
      " " +
      category +
      " " +
      categoryName
    );


  if (
    combined.includes("brick")
  ) {

    return "brick";

  }


  if (
    combined.includes("plate")
  ) {

    return "plate";

  }


  if (
    combined.includes("tile")
  ) {

    return "tile";

  }


  return "other";

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
   GROOVE TILE ERKENNEN
========================================================= */

function isGroovedTileName(name) {

  const value =
    normalizeSearchText(name);

  return (
    value.includes("tile") &&
    value.includes("groove")
  );

}


/* =========================================================
   GROOVE TILE MIT NORMALER DIMENSION
========================================================= */

function isStandardGroovedTileName(name) {

  const normalized =
    normalizeDimensionQuery(name);

  return /^tile\s+\d+\s*x\s*\d+\s+with\s+groove\b/i.test(
    normalized
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
   STANDARD-/SONDERTEIL PRIORITÄT
========================================================= */

function getPartTypePriority(part) {

  const name =
    normalizeSearchText(
      part.name
    );


  if (
    isStandardGroovedTileName(name)
  ) {

    return 0;

  }


  if (
    isStandardPartName(name)
  ) {

    return 0;

  }


  if (
    isSpecialPartName(name)
  ) {

    return 2;

  }


  return 1;

}


/* =========================================================
   SUCHBEGRIFFE AUS QUERY
========================================================= */

function getSearchTokens(query) {

  return normalizeDimensionQuery(query)
    .replace(
      /(\d+)\s*x\s*(\d+)/g,
      " "
    )
    .replace(
      /(\d+)\s*,\s*(\d+)/g,
      " "
    )
    .split(/\s+/)
    .filter(Boolean);

}


/* =========================================================
   NAME SUCHTEXTE
========================================================= */

function partNameMatchesSearch(
  part,
  query
) {

  const name =
    normalizeSearchText(
      part.name
    );

  const normalizedName =
    normalizeDimensionQuery(
      name
    );

  const compactName =
    compactSearchText(
      name
    );

  const normalizedQuery =
    normalizeDimensionQuery(
      query
    );

  const compactQuery =
    compactSearchText(
      query
    );


  if (
    name.includes(
      query
    )
  ) {

    return true;

  }


  if (
    normalizedName.includes(
      normalizedQuery
    )
  ) {

    return true;

  }


  if (
    compactName.includes(
      compactQuery
    )
  ) {

    return true;

  }


  const tokens =
    getSearchTokens(query);


  if (
    tokens.length === 0
  ) {

    return false;

  }


  return tokens.every(
    token =>
      normalizedName.includes(
        token
      )
  );

}


/* =========================================================
   TEILWEISE DIMENSION
========================================================= */

function partMatchesPartialDimension(
  part,
  query
) {

  const normalized =
    normalizeDimensionQuery(
      query
    );

  const match =
    normalized.match(
      /(?:^|\s)(brick|plate|tile)?\s*(\d+)(?:\s*$)/
    );


  if (!match) {

    return false;

  }


  const requestedNumber =
    Number(
      match[2]
    );


  if (
    !Number.isFinite(
      requestedNumber
    )
  ) {

    return false;

  }


  const dimensions =
    getPartDimensions(
      part.name
    );


  return dimensions.some(
    dimension =>
      dimension[0] === requestedNumber ||
      dimension[1] === requestedNumber
  );

}


/* =========================================================
   SUCHRELEVANZ
========================================================= */

function getLegoSearchPriority(
  part,
  query
) {

  const search =
    normalizeSearchText(
      query
    );

  const normalizedSearch =
    normalizeDimensionQuery(
      search
    );

  const number =
    normalizeSearchText(
      part.part_num
    );

  const name =
    normalizeSearchText(
      part.name
    );

  const dimension =
    extractDimension(
      normalizedSearch
    );

  let priority = 0;


  if (
    isStandardGroovedTileName(name)
  ) {

    priority -= 30000;

  }


  if (
    isStandardPartName(name)
  ) {

    priority -= 30000;

  }


  if (
    dimension &&
    partHasDimension(
      name,
      dimension
    )
  ) {

    priority -= 20000;

  }


  if (
    normalizeDimensionQuery(name) ===
    normalizedSearch
  ) {

    priority -= 15000;

  }


  if (
    name.startsWith(
      search + " "
    )
  ) {

    priority -= 10000;

  }


  if (
    partNameMatchesSearch(
      part,
      search
    )
  ) {

    priority -= 5000;

  }


  if (
    partMatchesPartialDimension(
      part,
      search
    )
  ) {

    priority -= 4000;

  }


  if (
    number === search
  ) {

    priority -= 1000;

  }


  if (
    number.startsWith(search)
  ) {

    priority -= 100;

  }


  return priority;

}


/* =========================================================
   ALLGEMEINE TEILE SORTIERUNG

   WICHTIG:
   Die Sortierung für Brick / Plate / Tile wird
   explizit nach der tatsächlichen Dimension durchgeführt.

   Dadurch ist z.B.:

   Brick 1 x 1
   Brick 1 x 2
   Brick 1 x 3
   Brick 1 x 4
   Brick 1 x 6
   Brick 1 x 8
   Brick 1 x 10
   Brick 1 x 14
   Brick 2 x 2

   garantiert in dieser Reihenfolge, sofern
   diese Teile tatsächlich aus der Datenbank geladen wurden.
========================================================= */

function sortLegoParts(
  results,
  query
) {

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  const isBrickSearch =
    /^(brick|bricks)$/i.test(
      normalizedQuery
    );

  const isPlateSearch =
    /^(plate|plates)$/i.test(
      normalizedQuery
    );

  const isTileSearch =
    /^(tile|tiles)$/i.test(
      normalizedQuery
    );


  results.sort(
    (
      a,
      b
    ) => {

      /* ===================================================
         KATEGORIENSUCHE

         Bei Brick / Plate / Tile zählt zuerst:

         1. Dimension
         2. Standardteil
         3. Sonderteil
         4. Name
         5. Teilenummer
      =================================================== */

      if (
        isBrickSearch ||
        isPlateSearch ||
        isTileSearch
      ) {

        if (
          isTileSearch
        ) {

          const aGroove =
            isGroovedTileName(
              a.name
            );

          const bGroove =
            isGroovedTileName(
              b.name
            );


          if (
            aGroove !== bGroove
          ) {

            return aGroove
              ? -1
              : 1;

          }

        }


        const typePriorityA =
          getPartTypePriority(a);

        const typePriorityB =
          getPartTypePriority(b);


        if (
          typePriorityA !==
          typePriorityB
        ) {

          return (
            typePriorityA -
            typePriorityB
          );

        }


        const dimensionResult =
          comparePartDimensions(
            a.name,
            b.name
          );


        if (
          dimensionResult !== 0
        ) {

          return dimensionResult;

        }

      }


      /* ===================================================
         NORMALE SUCHPRIORITÄT
      =================================================== */

      const priorityA =
        getLegoSearchPriority(
          a,
          query
        );

      const priorityB =
        getLegoSearchPriority(
          b,
          query
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


      const typePriorityA =
        getPartTypePriority(a);

      const typePriorityB =
        getPartTypePriority(b);


      if (
        typePriorityA !==
        typePriorityB
      ) {

        return (
          typePriorityA -
          typePriorityB
        );

      }


      const dimensionResult =
        comparePartDimensions(
          a.name,
          b.name
        );


      if (
        dimensionResult !== 0
      ) {

        return dimensionResult;

      }


      const nameA =
        normalizeSearchText(
          a.name
        );

      const nameB =
        normalizeSearchText(
          b.name
        );


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


      return normalizeSearchText(
        a.part_num
      ).localeCompare(
        normalizeSearchText(
          b.part_num
        ),
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      );

    }
  );


  return results;

}


/* =========================================================
   HAUPTSUCHE
========================================================= */

function searchParts() {

  const input =
    document.getElementById(
      "searchInput"
    );


  if (!input) {

    return;

  }


  const query =
    normalizeSearchText(
      input.value
    );


  if (!query) {

    displayParts(parts);

    return;

  }


  const normalizedQuery =
    normalizeDimensionQuery(
      query
    );


  const dimension =
    extractDimension(
      normalizedQuery
    );


  const filtered =
    parts.filter(
      part => {

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


        if (
          dimension &&
          !partHasDimension(
            name,
            dimension
          )
        ) {

          return false;

        }


        if (
          partNameMatchesSearch(
            part,
            query
          )
        ) {

          return true;

        }


        if (
          partMatchesPartialDimension(
            part,
            query
          )
        ) {

          return true;

        }


        if (
          category.includes(query) ||
          categoryName.includes(query)
        ) {

          return true;

        }


        if (
          color.includes(query)
        ) {

          return true;

        }


        if (
          number.includes(query)
        ) {

          return true;

        }


        return false;

      }
    );


  sortLegoParts(
    filtered,
    query
  );


  displayParts(
    filtered
  );

}


/* =========================================================
   „TEIL MELDEN“-SUCHE
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
   PAGINIERTE SUPABASE-SUCHE

   DAS IST DER WICHTIGE TEIL.

   Supabase/PostgREST kann trotz eines hohen "limit"
   serverseitig auf z.B. 1000 Ergebnisse begrenzen.

   Deshalb:

   Seite 1 -> offset 0
   Seite 2 -> offset 1000
   Seite 3 -> offset 2000
   usw.

   Wir stoppen erst dann, wenn weniger als 1000
   Ergebnisse zurückkommen.

   Dadurch werden auch Datensätze hinter dem ersten
   1000er-Block gefunden.
========================================================= */

async function fetchPaginatedPartResults(
  filter,
  options = {}
) {

  const PAGE_SIZE =
    1000;

  const MAX_PAGES =
    Number.isFinite(
      options.maxPages
    )
      ? options.maxPages
      : 100;

  const select =
    options.select ||
    "part_num,name,category_id,category";


  const allResults = [];

  let offset = 0;


  for (
    let page = 0;
    page < MAX_PAGES;
    page++
  ) {

    const separator =
      filter
        ? "&"
        : "";


    const url =
      LEGO_PARTS_URL +
      "?" +
      filter +
      separator +
      "select=" +
      encodeURIComponent(
        select
      ) +
      "&limit=" +
      PAGE_SIZE +
      "&offset=" +
      offset;


    console.log(
      "LEGO Suche – Seite:",
      page + 1,
      "Offset:",
      offset
    );


    const pageResults =
      await supabaseRequest(
        url
      );


    if (
      !Array.isArray(
        pageResults
      )
    ) {

      break;

    }


    addPartResults(
      allResults,
      pageResults
    );


    /*
       Weniger als PAGE_SIZE bedeutet:
       Es gibt keine weitere vollständige Seite.
    */

    if (
      pageResults.length <
      PAGE_SIZE
    ) {

      break;

    }


    offset +=
      PAGE_SIZE;

  }


  console.log(
    "LEGO Suche – insgesamt geladen:",
    allResults.length
  );


  return allResults;

}


/* =========================================================
   URL BUILDER

   Wird weiterhin bereitgestellt.

   Die eigentlichen großen Suchabfragen benutzen
   inzwischen fetchPaginatedPartResults().
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

    if (
      part
    ) {

      target.push(
        part
      );

    }

  }

}


/* =========================================================
   KATEGORIE-ERGEBNISSE LADEN

   Jetzt PAGINIERT.
========================================================= */

async function fetchCategoryResults(
  categoryId,
  categoryWord
) {

  const results = [];


  /* -------------------------------------------------------
     1. Kategorie-ID
  ------------------------------------------------------- */

  const categoryResults =
    await fetchPaginatedPartResults(
      "category_id=eq." +
      categoryId
    );


  addPartResults(
    results,
    categoryResults
  );


  /* -------------------------------------------------------
     2. Zusätzlich über Namen
  ------------------------------------------------------- */

  const nameResults =
    await fetchPaginatedPartResults(
      "name=ilike." +
      encodeURIComponent(
        "%" +
        categoryWord +
        "%"
      )
    );


  addPartResults(
    results,
    nameResults
  );


  return results;

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

    errorBox.textContent =
      "";

  }


  try {

    /* =====================================================
       GRUNDWERTE
    ===================================================== */

    const search =
      normalizeSearchText(
        query
      );


    if (!search) {

      legoSearchResults =
        [];

      suggestions.innerHTML =
        "";

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


    /* =====================================================
       KATEGORIEN
    ===================================================== */

    const CATEGORY_BRICK =
      11;

    const CATEGORY_PLATE =
      14;

    const CATEGORY_TILE =
      19;


    const isBrickSearch =
      /^(brick|bricks)$/i.test(
        normalizedSearch
      );


    const isPlateSearch =
      /^(plate|plates)$/i.test(
        normalizedSearch
      );


    const isTileSearch =
      /^(tile|tiles)$/i.test(
        normalizedSearch
      );


    let results = [];


    /* =====================================================
       1. EXAKTE TEILENUMMER
    ===================================================== */

    const exactNumberUrl =
      LEGO_PARTS_URL +
      "?part_num=eq." +
      encodeURIComponent(
        search
      ) +
      "&select=part_num,name,category_id,category" +
      "&limit=20";


    const exactNumberResults =
      await supabaseRequest(
        exactNumberUrl
      );


    addPartResults(
      results,
      exactNumberResults
    );


    /* =====================================================
       2. BRICK / BRICKS
    ===================================================== */

    if (
      isBrickSearch
    ) {

      const brickResults =
        await fetchCategoryResults(
          CATEGORY_BRICK,
          "brick"
        );


      addPartResults(
        results,
        brickResults
      );

    }


    /* =====================================================
       3. PLATE / PLATES
    ===================================================== */

    if (
      isPlateSearch
    ) {

      const plateResults =
        await fetchCategoryResults(
          CATEGORY_PLATE,
          "plate"
        );


      addPartResults(
        results,
        plateResults
      );

    }


    /* =====================================================
       4. TILE / TILES
    ===================================================== */

    if (
      isTileSearch
    ) {

      const tileResults =
        await fetchCategoryResults(
          CATEGORY_TILE,
          "tile"
        );


      addPartResults(
        results,
        tileResults
      );

    }


    /* =====================================================
       5. TEILENUMMER TEILWEISE

       Diese Suche bleibt absichtlich auf 200.

       Das betrifft NUR Teilnummern-Suchen und hat
       nichts mit der Kategorie-Suche Brick/Plate/Tile
       zu tun.
    ===================================================== */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );


    if (
      looksLikePartNumber &&
      !search.includes(" ")
    ) {

      const numberResults =
        await fetchPaginatedPartResults(
          "part_num=ilike." +
          encodeURIComponent(
            "%" +
            search +
            "%"
          )
        );


      addPartResults(
        results,
        numberResults
      );

    }


    /* =====================================================
       6. NAMENSSUCHE

       PAGINIERT
    ===================================================== */

    const nameSearch =
      normalizedSearch;


    if (
      nameSearch
    ) {

      const nameResults =
        await fetchPaginatedPartResults(
          "name=ilike." +
          encodeURIComponent(
            "%" +
            nameSearch +
            "%"
          )
        );


      addPartResults(
        results,
        nameResults
      );

    }


    /* =====================================================
       7. ZUSÄTZLICHE NAMENSSUCHE FÜR DIMENSIONEN

       Ebenfalls PAGINIERT.
    ===================================================== */

    if (
      dimension
    ) {

      const dimensionParts =
        normalizeDimensionOrder(
          dimension
        );


      if (
        dimensionParts
      ) {

        const numbers =
          dimensionParts.split("x");


        const a =
          numbers[0];

        const b =
          numbers[1];


        const dimensionResultsA =
          await fetchPaginatedPartResults(
            "name=ilike." +
            encodeURIComponent(
              "%" +
              a +
              " x " +
              b +
              "%"
            )
          );


        addPartResults(
          results,
          dimensionResultsA
        );


        const dimensionResultsACompact =
          await fetchPaginatedPartResults(
            "name=ilike." +
            encodeURIComponent(
              "%" +
              a +
              "x" +
              b +
              "%"
            )
          );


        addPartResults(
          results,
          dimensionResultsACompact
        );


        if (
          a !== b
        ) {

          const dimensionResultsB =
            await fetchPaginatedPartResults(
              "name=ilike." +
              encodeURIComponent(
                "%" +
                b +
                " x " +
                a +
                "%"
              )
            );


          addPartResults(
            results,
            dimensionResultsB
          );


          const dimensionResultsBCompact =
            await fetchPaginatedPartResults(
              "name=ilike." +
              encodeURIComponent(
                "%" +
                b +
                "x" +
                a +
                "%"
              )
            );


          addPartResults(
            results,
            dimensionResultsBCompact
          );

        }

      }

    }


    /* =====================================================
       8. DUPLIKATE ENTFERNEN
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
       9. KATEGORIEN FILTERN
    ===================================================== */

    if (
      isBrickSearch
    ) {

      results =
        results.filter(
          part => {

            const categoryId =
              Number(
                part.category_id
              );

            const name =
              normalizeSearchText(
                part.name
              );

            const category =
              normalizeSearchText(
                part.category
              );

            return (
              categoryId === CATEGORY_BRICK ||
              name.startsWith("brick ") ||
              category.includes("brick")
            );

          }
        );

    }


    if (
      isPlateSearch
    ) {

      results =
        results.filter(
          part => {

            const categoryId =
              Number(
                part.category_id
              );

            const name =
              normalizeSearchText(
                part.name
              );

            const category =
              normalizeSearchText(
                part.category
              );

            return (
              categoryId === CATEGORY_PLATE ||
              name.startsWith("plate ") ||
              category.includes("plate")
            );

          }
        );

    }


    /* =====================================================
       TILE FILTER

       NUR GROOVE-TILES
    ===================================================== */

    if (
      isTileSearch
    ) {

      results =
        results.filter(
          part =>
            isGroovedTileName(
              part.name
            )
        );

    }


    /* =====================================================
       10. LOKALER FEINFILTER
    ===================================================== */

    results =
      results.filter(
        part => {

          const name =
            normalizeSearchText(
              part.name
            );


          const number =
            normalizeSearchText(
              part.part_num
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


          /* ---------------------------------------------
             BRICK
          --------------------------------------------- */

          if (
            isBrickSearch
          ) {

            return (
              Number(
                part.category_id
              ) === CATEGORY_BRICK ||
              name.startsWith("brick ") ||
              category.includes("brick") ||
              categoryName.includes("brick")
            );

          }


          /* ---------------------------------------------
             PLATE
          --------------------------------------------- */

          if (
            isPlateSearch
          ) {

            return (
              Number(
                part.category_id
              ) === CATEGORY_PLATE ||
              name.startsWith("plate ") ||
              category.includes("plate") ||
              categoryName.includes("plate")
            );

          }


          /* ---------------------------------------------
             TILE
          --------------------------------------------- */

          if (
            isTileSearch
          ) {

            return isGroovedTileName(
              name
            );

          }


          /* ---------------------------------------------
             EXAKTE DIMENSION
          --------------------------------------------- */

          if (
            dimension &&
            !partHasDimension(
              name,
              dimension
            )
          ) {

            return false;

          }


          /* ---------------------------------------------
             NAME
          --------------------------------------------- */

          if (
            partNameMatchesSearch(
              part,
              search
            )
          ) {

            return true;

          }


          /* ---------------------------------------------
             TEILWEISE DIMENSION
          --------------------------------------------- */

          if (
            partMatchesPartialDimension(
              part,
              search
            )
          ) {

            return true;

          }


          /* ---------------------------------------------
             KATEGORIE
          --------------------------------------------- */

          if (
            category.includes(search) ||
            categoryName.includes(search)
          ) {

            return true;

          }


          /* ---------------------------------------------
             TEILENUMMER
          --------------------------------------------- */

          if (
            number.includes(search)
          ) {

            return true;

          }


          return false;

        }
      );


    /* =====================================================
       11. KEINE ERGEBNISSE
    ===================================================== */

    if (
      results.length === 0
    ) {

      legoSearchResults =
        [];


      suggestions.innerHTML = `
        <div class="suggestion">
          ❌ Kein passendes LEGO Teil gefunden.
        </div>
      `;


      return;

    }


    /* =====================================================
       12. SORTIEREN
    ===================================================== */

    sortLegoParts(
      results,
      search
    );


    /* =====================================================
       13. MAXIMAL 20 ERGEBNISSE

       WICHTIG:

       ERST nachdem ALLE Daten geladen und sortiert
       wurden, wird auf 20 Ergebnisse gekürzt.

       Dadurch kann z.B. Brick 1 x 4 nicht mehr
       einfach durch die ersten 1000 Datenbanktreffer
       abgeschnitten werden.
    ===================================================== */

    const displayResults =
      results.slice(
        0,
        20
      );


    legoSearchResults =
      displayResults;


    /* =====================================================
       14. ANZEIGE
    ===================================================== */

    suggestions.innerHTML =
      displayResults
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


    legoSearchResults =
      [];


    suggestions.innerHTML =
      "";


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
