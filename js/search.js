/* =========================================================
   FABRIKTRACKER – GEMEINSAME LEGO-SUCHLOGIK

   Diese Datei enthält die komplette Suchlogik für:

   1. Hauptsuche
   2. „Teil melden“-Suche

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

   Beispiele:

   1x2
   1 x 2
   1×2
   1 × 2
   1,2
   1 , 2

   werden zu:

   1x2
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

   1x2 findet:

   1x2
   2x1
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


  /* Direkte Suche */

  if (
    name.includes(
      query
    )
  ) {

    return true;

  }


  /* Normalisierte Dimension */

  if (
    normalizedName.includes(
      normalizedQuery
    )
  ) {

    return true;

  }


  /* Ohne Leerzeichen */

  if (
    compactName.includes(
      compactQuery
    )
  ) {

    return true;

  }


  /* Suchwörter */

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

   Beispiel:

   brick 1

   findet:

   1x1
   1x2
   1x3
   1x4
   ...
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


  /* Standardteil */

  if (
    isStandardPartName(name)
  ) {

    priority -= 30000;

  }


  /* Exakte Dimension */

  if (
    dimension &&
    partHasDimension(
      name,
      dimension
    )
  ) {

    priority -= 20000;

  }


  /* Exakter Name */

  if (
    normalizeDimensionQuery(name) ===
    normalizedSearch
  ) {

    priority -= 15000;

  }


  /* Name beginnt mit Suche */

  if (
    name.startsWith(
      search + " "
    )
  ) {

    priority -= 10000;

  }


  /* Namenstreffer */

  if (
    partNameMatchesSearch(
      part,
      search
    )
  ) {

    priority -= 5000;

  }


  /* Teilweise Dimension */

  if (
    partMatchesPartialDimension(
      part,
      search
    )
  ) {

    priority -= 4000;

  }


  /* Teilenummer */

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
========================================================= */

function sortLegoParts(
  results,
  query
) {

  results.sort(
    (
      a,
      b
    ) => {

      /* Suchrelevanz */

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


      const nameA =
        normalizeSearchText(
          a.name
        );

      const nameB =
        normalizeSearchText(
          b.name
        );


      /* Standard / Normal / Sonder */

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


      /* Dimension */

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


      /* Name */

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


      /* Teilenummer */

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


        /* Exakte Dimension */

        if (
          dimension &&
          !partHasDimension(
            name,
            dimension
          )
        ) {

          return false;

        }


        /* Name */

        if (
          partNameMatchesSearch(
            part,
            query
          )
        ) {

          return true;

        }


        /* Teilweise Dimension */

        if (
          partMatchesPartialDimension(
            part,
            query
          )
        ) {

          return true;

        }


        /* Kategorie */

        if (
          category.includes(query) ||
          categoryName.includes(query)
        ) {

          return true;

        }


        /* Farbe */

        if (
          color.includes(query)
        ) {

          return true;

        }


        /* Teilenummer */

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

    target.push(
      part
    );

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

    errorBox.textContent =
      "";

  }


  try {

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
       EXAKTE TEILENUMMER
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
       KATEGORIE BRICK
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


      addPartResults(
        results,
        brickResults
      );

    }


    /* =====================================================
       KATEGORIE PLATE
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


      addPartResults(
        results,
        plateResults
      );

    }


    /* =====================================================
       KATEGORIE TILE
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


      addPartResults(
        results,
        tileResults
      );

    }


    /* =====================================================
       TEILENUMMER TEILWEISE
    ===================================================== */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );


    if (
      looksLikePartNumber &&
      !search.includes(" ")
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


      addPartResults(
        results,
        numberResults
      );

    }


    /* =====================================================
       NAMEN
    ===================================================== */

    const nameSearch =
      compactSearchText(
        normalizedSearch
      );


    if (
      nameSearch
    ) {

      const nameUrl =
        LEGO_PARTS_URL +
        "?name=ilike." +
        encodeURIComponent(
          "%" +
          nameSearch +
          "%"
        ) +
        "&select=part_num,name,category_id,category" +
        "&limit=1000";


      const nameResults =
        await supabaseRequest(
          nameUrl
        );


      addPartResults(
        results,
        nameResults
      );

    }


    /* =====================================================
       DIMENSIONSSUCHE
    ===================================================== */

    if (
      dimension
    ) {

      const dimensions =
        extractAllDimensions(
          dimension
        );


      if (
        dimensions.length > 0
      ) {

        const requested =
          dimensions[0];


        const partsOfDimension =
          requested.split("x");


        const a =
          partsOfDimension[0];

        const b =
          partsOfDimension[1];


        /* Richtung A */

        const dimensionUrlA =
          LEGO_PARTS_URL +
          "?name=ilike." +
          encodeURIComponent(
            "%" +
            a +
            "x" +
            b +
            "%"
          ) +
          "&select=part_num,name,category_id,category" +
          "&limit=500";


        const dimensionResultsA =
          await supabaseRequest(
            dimensionUrlA
          );


        addPartResults(
          results,
          dimensionResultsA
        );


        /* Richtung B */

        if (
          a !== b
        ) {

          const dimensionUrlB =
            LEGO_PARTS_URL +
            "?name=ilike." +
            encodeURIComponent(
              "%" +
              b +
              "x" +
              a +
              "%"
            ) +
            "&select=part_num,name,category_id,category" +
            "&limit=500";


          const dimensionResultsB =
            await supabaseRequest(
              dimensionUrlB
            );


          addPartResults(
            results,
            dimensionResultsB
          );

        }

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
       KATEGORIEN FILTERN
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


      /* Nur Tiles with groove */

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
       LOKALER FEINFILTER
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


          /* Reine Brick-Suche */

          if (
            isBrickSearch
          ) {

            return (
              Number(
                part.category_id
              ) === CATEGORY_BRICK
            );

          }


          /* Reine Plate-Suche */

          if (
            isPlateSearch
          ) {

            return (
              Number(
                part.category_id
              ) === CATEGORY_PLATE
            );

          }


          /* Reine Tile-Suche */

          if (
            isTileSearch
          ) {

            return (
              Number(
                part.category_id
              ) === CATEGORY_TILE &&
              name.includes(
                "with groove"
              )
            );

          }


          /* Exakte Dimension */

          if (
            dimension &&
            !partHasDimension(
              name,
              dimension
            )
          ) {

            return false;

          }


          /* Name */

          if (
            partNameMatchesSearch(
              part,
              search
            )
          ) {

            return true;

          }


          /* Teilweise Dimension */

          if (
            partMatchesPartialDimension(
              part,
              search
            )
          ) {

            return true;

          }


          /* Kategorie */

          if (
            category.includes(search) ||
            categoryName.includes(search)
          ) {

            return true;

          }


          /* Teilenummer */

          if (
            number.includes(search)
          ) {

            return true;

          }


          return false;

        }
      );


    /* =====================================================
       KEINE ERGEBNISSE
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
       SORTIEREN
    ===================================================== */

    sortLegoParts(
      results,
      search
    );


    /* =====================================================
       MAXIMAL 20
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
