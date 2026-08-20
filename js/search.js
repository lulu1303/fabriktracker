/* =========================================================
   HAUPTSUCHE
========================================================= */

function searchParts() {

  const input =
    document.getElementById(
      "searchInput"
    );


  const query =
    input.value
      .toLowerCase()
      .trim();


  if (!query) {

    displayParts(
      parts
    );

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
          String(
            part.part_number || ""
          )
          .toLowerCase();


        const name =
          String(
            part.name || ""
          )
          .toLowerCase();


        const category =
          String(
            part.category || ""
          )
          .toLowerCase();


        const color =
          String(
            part.color_name || ""
          )
          .toLowerCase();


        const categoryName =
          String(
            getCategoryName(
              part.category_id,
              part.category || ""
            )
          )
          .toLowerCase();


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
            !partDimension ||
            partDimension !==
              dimension
          ) {

            return false;

          }

        }


        return (

          number.includes(
            query
          )

          ||

          name.includes(
            query
          )

          ||

          category.includes(
            query
          )

          ||

          categoryName.includes(
            query
          )

          ||

          color.includes(
            query
          )

        );

      }
    );


  filtered.sort(
    (
      a,
      b
    ) =>
      getSearchPriority(
        a,
        query,
        dimension
      )
      -
      getSearchPriority(
        b,
        query,
        dimension
      )
  );


  displayParts(
    filtered
  );

}


/* =========================================================
   DIMENSIONS-SUCHE
========================================================= */

function normalizeDimensionQuery(
  value
) {

  return String(
    value || ""
  )

    .toLowerCase()

    .replace(
      /×/g,
      "x"
    )

    .replace(
      /(\d)\s*x\s*(\d)/g,
      "$1 x $2"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


function extractDimension(
  value
) {

  const normalized =
    normalizeDimensionQuery(
      value
    );


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
   ALLE DIMENSIONSPAARE AUS EINEM NAMEN
========================================================= */

function extractAllDimensions(
  value
) {

  const normalized =
    normalizeDimensionQuery(
      value
    );


  const matches =
    normalized.match(
      /\d+\s*x\s*\d+/g
    );


  if (
    !matches
  ) {

    return [];

  }


  return matches.map(
    dimension => {

      return dimension
        .replace(
          /\s*x\s*/g,
          "x"
        );

    }
  );

}


/* =========================================================
   PRÜFEN OB DIMENSION EXAKT PASST
========================================================= */

function hasExactDimension(
  partName,
  requestedDimension
) {

  if (
    !requestedDimension
  ) {

    return true;

  }


  const dimensions =
    extractAllDimensions(
      partName
    );


  if (
    dimensions.length !== 1
  ) {

    return false;

  }


  return (
    dimensions[0] ===
    requestedDimension
  );

}


/* =========================================================
   SUCHPRIORITÄT
========================================================= */

function getSearchPriority(
  part,
  query,
  dimension
) {

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


  const number =
    String(
      part.part_number || ""
    )
      .toLowerCase()
      .trim();


  const category =
    String(
      part.category || ""
    )
      .toLowerCase();


  let score = 1000;


  /* =======================================================
     EXAKTE TEILENUMMER
  ======================================================= */

  if (
    number === query
  ) {

    score -= 5000;

  }


  /* =======================================================
     EXAKTE DIMENSION
  ======================================================= */

  if (
    dimension
  ) {

    if (
      hasExactDimension(
        name,
        dimension
      )
    ) {

      score -= 1000;

    }

  }


  /* =======================================================
     SUCHBEGRIFF ALS WORT
  ======================================================= */

  const searchWords =
    query
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );


  searchWords.forEach(
    word => {

      if (
        name.includes(
          word
        )
      ) {

        score -= 100;

      }

    }
  );


  /* =======================================================
     KATEGORIE
  ======================================================= */

  if (
    category.includes(
      "brick"
    )
  ) {

    score -= 200;

  }


  if (
    category.includes(
      "plate"
    )
  ) {

    score -= 200;

  }


  if (
    category.includes(
      "tile"
    )
  ) {

    score -= 200;

  }


  /* =======================================================
     NAME BEGINNT MIT SUCHBEGRIFF
  ======================================================= */

  if (
    name === query
  ) {

    score -= 1500;

  }


  if (
    name.startsWith(
      query + " "
    )
  ) {

    score -= 800;

  }


  if (
    name.startsWith(
      query
    )
  ) {

    score -= 400;

  }


  /* =======================================================
     STANDARD-BRICK
  ======================================================= */

  const isStandardBrick =
    /^brick\s+\d+\s*x\s*\d+$/i.test(
      name
    );


  if (
    isStandardBrick
  ) {

    score -= 2200;

  }


  /* =======================================================
     STANDARD-PLATE
  ======================================================= */

  const isStandardPlate =
    /^plate\s+\d+\s*x\s*\d+$/i.test(
      name
    );


  if (
    isStandardPlate
  ) {

    score -= 2200;

  }


  /* =======================================================
     STANDARD-TILE
  ======================================================= */

  const isStandardTile =
    /^tile\s+\d+\s*x\s*\d+(?:\s+x\s*\d+)?$/i.test(
      name
    );


  if (
    isStandardTile
  ) {

    score -= 2200;

  }


  /* =======================================================
     BASIC / STANDARD
  ======================================================= */

  if (
    name.includes(
      "basic"
    ) ||
    name.includes(
      "standard"
    )
  ) {

    score -= 150;

  }


  /* =======================================================
     BRICKSLOT NICHT BEVORZUGEN
  ======================================================= */

  if (
    number.startsWith(
      "brickslot"
    ) ||
    name.startsWith(
      "brickslot"
    )
  ) {

    score += 3000;

  }


  /* =======================================================
     MODIFIED / SPECIAL / ASSEMBLY
  ======================================================= */

  if (
    name.includes(
      "modified"
    )
  ) {

    score += 700;

  }


  if (
    name.includes(
      "special"
    )
  ) {

    score += 700;

  }


  if (
    name.includes(
      "assembly"
    )
  ) {

    score += 700;

  }


  if (
    name.includes(
      "with "
    )
  ) {

    score += 600;

  }


  /* =======================================================
     PRINT / DEKORATION
  ======================================================= */

  if (
    name.includes(
      "printed"
    ) ||

    name.includes(
      "print"
    ) ||

    name.includes(
      "pattern"
    ) ||

    name.includes(
      "decorated"
    ) ||

    name.includes(
      "decoration"
    )
  ) {

    score += 1000;

  }


  /* =======================================================
     LEGO LAND / RESORT / FABRIK
  ======================================================= */

  if (
    name.includes(
      "legoland"
    ) ||

    name.includes(
      "resort"
    ) ||

    name.includes(
      "fabrik"
    )
  ) {

    score += 1400;

  }


  /* =======================================================
     DUPLO
  ======================================================= */

  if (
    name.includes(
      "duplo"
    ) ||

    category.includes(
      "duplo"
    )
  ) {

    score += 2000;

  }


  /* =======================================================
     EDUCATION
  ======================================================= */

  if (
    name.includes(
      "education"
    ) ||

    category.includes(
      "education"
    )
  ) {

    score += 1700;

  }


  return score;

}


/* =========================================================
   LEGO TEILESUCHE
========================================================= */

function searchLegoParts() {

  clearTimeout(
    searchTimer
  );


  const input =
    document.getElementById(
      "partSearchInput"
    );


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

    legoSearchResults = [];

    hideSuggestions();

    return;

  }


  searchTimer =
    setTimeout(
      () =>
        fetchLegoPartSuggestions(
          query
        ),

      300
    );

}

/* =========================================================
   LEGO TEILE SUCHEN
   ---------------------------------------------------------
   Suche berücksichtigt:
   - exakte Teilenummer
   - Teilnummer teilweise
   - Name
   - Kategorie
   - Dimensionen
   - Standardteile
   - Sonderteile
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
      normalizeDimensionQuery(
        search
      );


    const dimension =
      extractDimension(
        normalizedSearch
      );


    /* =====================================================
       ERGEBNISSE SAMMELN
    ===================================================== */

    let results = [];


    /* =====================================================
       1. EXAKTE TEILENUMMER
       
       Beispiel:
       Suche 3001
       → LEGO 3001
    ===================================================== */

    const exactNumberUrl =
      LEGO_PARTS_URL +
      "?part_num=eq." +
      encodeURIComponent(search) +
      "&select=part_num,name,category_id,category" +
      "&limit=50";


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
       2. TEILENUMMER TEILWEISE
       
       Beispiel:
       Suche 300
       → 3001, 3002, ...
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
       3. NAME-SUCHE
       
       Beispiel:
       LEGO 3001
       Door
       Window
       Brick
    ===================================================== */

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


    /* =====================================================
       4. KATEGORIE-SUCHE
       
       DAS IST DER WICHTIGE TEIL.
       
       Wenn der Datensatz z.B. so aussieht:
       
       part_num = 3001
       name     = LEGO 3001
       category = Bricks
       
       findet "Brick" den 3001 jetzt trotzdem.
    ===================================================== */

    const categoryUrl =
      LEGO_PARTS_URL +
      "?category=ilike." +
      encodeURIComponent(
        "%" +
        search +
        "%"
      ) +
      "&select=part_num,name,category_id,category" +
      "&limit=500";


    const categoryResults =
      await supabaseRequest(
        categoryUrl
      );


    if (
      Array.isArray(
        categoryResults
      )
    ) {

      results =
        results.concat(
          categoryResults
        );

    }


    /* =====================================================
       5. SPEZIELLE KATEGORIEN
       
       Bei "brick", "plate", "tile" holen wir zusätzlich
       gezielt die komplette Kategorie.
    ===================================================== */

    const categoryWords = [];


    if (
      normalizedSearch === "brick" ||
      normalizedSearch === "bricks"
    ) {

      categoryWords.push(
        "brick"
      );

    }


    if (
      normalizedSearch === "plate" ||
      normalizedSearch === "plates"
    ) {

      categoryWords.push(
        "plate"
      );

    }


    if (
      normalizedSearch === "tile" ||
      normalizedSearch === "tiles"
    ) {

      categoryWords.push(
        "tile"
      );

    }


    for (
      const categoryWord of categoryWords
    ) {

      const specialCategoryUrl =
        LEGO_PARTS_URL +
        "?category=ilike." +
        encodeURIComponent(
          "%" +
          categoryWord +
          "%"
        ) +
        "&select=part_num,name,category_id,category" +
        "&limit=1000";


      const specialResults =
        await supabaseRequest(
          specialCategoryUrl
        );


      if (
        Array.isArray(
          specialResults
        )
      ) {

        results =
          results.concat(
            specialResults
          );

      }

    }


    /* =====================================================
       6. KOMPAKTE DIMENSIONSSUCHE
       
       Brick 2x4
       Brick 2 x 4
       
       Falls der Name die Dimension enthält.
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
        !uniqueParts.has(
          key
        )
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


    function getPartPriority(part) {

  const number =
    String(part.part_num || "")
      .toLowerCase()
      .trim();

  const name =
    String(part.name || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const category =
    String(part.category || "")
      .toLowerCase()
      .trim();

  const categoryName =
    String(
      getCategoryName(
        part.category_id,
        part.category || ""
      )
    )
      .toLowerCase()
      .trim();


  let priority = 10000;


  /* =====================================================
     1. EXAKTE TEILENUMMER
     ===================================================== */

  if (number === search) {
    priority -= 100000;
  }


  /* =====================================================
     2. TEILENUMMER BEGINNT MIT SUCHE
     ===================================================== */

  if (number.startsWith(search)) {
    priority -= 10000;
  }


  /* =====================================================
     3. TEILENUMMER ENTHÄLT SUCHE
     ===================================================== */

  if (number.includes(search)) {
    priority -= 3000;
  }


  /* =====================================================
     4. DIMENSION
     ===================================================== */

  if (dimension) {

    const partDimension =
      extractDimension(
        normalizeDimensionQuery(name)
      );

    if (partDimension === dimension) {
      priority -= 15000;
    }

  }


  /* =====================================================
     5. GRUNDKATEGORIE
     ===================================================== */

  const isBrickSearch =
    search === "brick" ||
    search === "bricks";

  const isPlateSearch =
    search === "plate" ||
    search === "plates";

  const isTileSearch =
    search === "tile" ||
    search === "tiles";


  /* =====================================================
     6. STANDARD-BRICK
     
     Beispiel:
     Brick 2 x 4
     Brick 2 x 3
     Brick 1 x 2
     ===================================================== */

  const isStandardBrick =
    /^brick\s+\d+\s*x\s*\d+$/i.test(name);


  if (isBrickSearch && isStandardBrick) {

    priority -= 50000;

  }


  /* =====================================================
     7. STANDARD-PLATE
     
     Beispiel:
     Plate 2 x 4
     Plate 2 x 3
     Plate 1 x 2
     ===================================================== */

  const isStandardPlate =
    /^plate\s+\d+\s*x\s*\d+$/i.test(name);


  if (isPlateSearch && isStandardPlate) {

    priority -= 50000;

  }


  /* =====================================================
     8. STANDARD-TILE
     
     Beispiel:
     Tile 2 x 2
     Tile 1 x 2
     Tile 2 x 4
     
     Wichtig:
     NUR ein sauberer Standardname wird bevorzugt.
     
     Dadurch landen:
     Tile 2 x 2 with Groove
     Tile 2 x 2 without Groove
     Tile 2 x 2 with Clipboard
     
     NICHT vor Tile 2 x 2.
     ===================================================== */

  const isStandardTile =
    /^tile\s+\d+\s*x\s*\d+(?:\s*x\s*\d+)?$/i.test(name);


  if (isTileSearch && isStandardTile) {

    priority -= 50000;

  }


  /* =====================================================
     9. EXAKTER NAME
     ===================================================== */

  if (
    normalizeDimensionQuery(name) ===
    normalizedSearch
  ) {

    priority -= 20000;

  }


  /* =====================================================
     10. NAME BEGINNT MIT SUCHBEGRIFF
     ===================================================== */

  if (name.startsWith(search + " ")) {

    priority -= 5000;

  }


  /* =====================================================
     11. NAME ENTHÄLT SUCHBEGRIFF
     ===================================================== */

  if (name.includes(search)) {

    priority -= 1500;

  }


  /* =====================================================
     12. KATEGORIE
     ===================================================== */

  if (category.includes(search)) {

    priority -= 3000;

  }


  if (categoryName.includes(search)) {

    priority -= 3000;

  }


  /* =====================================================
     13. BASIC / STANDARD
     ===================================================== */

  if (
    name.includes("basic") ||
    name.includes("standard")
  ) {

    priority -= 500;

  }


  /* =====================================================
     14. MODIFIED
     ===================================================== */

  if (name.includes("modified")) {

    priority += 12000;

  }


  /* =====================================================
     15. SPECIAL
     ===================================================== */

  if (name.includes("special")) {

    priority += 12000;

  }


  /* =====================================================
     16. ASSEMBLY
     ===================================================== */

  if (name.includes("assembly")) {

    priority += 12000;

  }


  /* =====================================================
     17. WITH ...
     ===================================================== */

  if (name.includes("with ")) {

    priority += 9000;

  }


  /* =====================================================
     18. OHNE / WITHOUT ...
     ===================================================== */

  if (
    name.includes("without ") ||
    name.includes("ohne ")
  ) {

    priority += 7000;

  }


  /* =====================================================
     19. PRINT / PATTERN / DEKORATION
     ===================================================== */

  if (
    name.includes("printed") ||
    name.includes("print") ||
    name.includes("pattern") ||
    name.includes("decorated") ||
    name.includes("decoration")
  ) {

    priority += 20000;

  }


  /* =====================================================
     20. LEGO LAND / RESORT / FABRIK
     ===================================================== */

  if (
    name.includes("legoland") ||
    name.includes("resort") ||
    name.includes("fabrik")
  ) {

    priority += 20000;

  }


  /* =====================================================
     21. BRICKSLOT
     
     GANZ WICHTIG:
     Diese Teile sollen bei "Brick" NICHT oben stehen.
     ===================================================== */

  if (
    number.startsWith("brickslot") ||
    name.startsWith("brickslot")
  ) {

    priority += 100000;

  }


  /* =====================================================
     22. DUPLO
     ===================================================== */

  if (
    name.includes("duplo") ||
    category.includes("duplo") ||
    categoryName.includes("duplo")
  ) {

    priority += 30000;

  }


  /* =====================================================
     23. EDUCATION
     ===================================================== */

  if (
    name.includes("education") ||
    category.includes("education") ||
    categoryName.includes("education")
  ) {

    priority += 25000;

  }


  return priority;

}


    /* =====================================================
       SORTIEREN
    ===================================================== */

    /* =====================================================
   SORTIEREN
   -----------------------------------------------------
   STANDARDTEILE HABEN ABSOLUTE PRIORITÄT
   ===================================================== */

results.sort(
  (
    a,
    b
  ) => {

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


    const nameA =
      String(
        a.name || ""
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    const nameB =
      String(
        b.name || ""
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        )
        .trim();


    /* =================================================
       STANDARDTEILE ERKENNEN
       ================================================= */

    const standardBrickA =
      /^brick\s+\d+\s*x\s*\d+$/i.test(
        nameA
      );

    const standardBrickB =
      /^brick\s+\d+\s*x\s*\d+$/i.test(
        nameB
      );


    const standardPlateA =
      /^plate\s+\d+\s*x\s*\d+$/i.test(
        nameA
      );

    const standardPlateB =
      /^plate\s+\d+\s*x\s*\d+$/i.test(
        nameB
      );


    const standardTileA =
      /^tile\s+\d+\s*x\s*\d+(?:\s*x\s*\d+)?$/i.test(
        nameA
      );

    const standardTileB =
      /^tile\s+\d+\s*x\s*\d+(?:\s*x\s*\d+)?$/i.test(
        nameB
      );


    const isStandardA =
      standardBrickA ||
      standardPlateA ||
      standardTileA;


    const isStandardB =
      standardBrickB ||
      standardPlateB ||
      standardTileB;


    /* =================================================
       BEI BRICK / PLATE / TILE:
       STANDARDTEIL IMMER VORNE
       ================================================= */

    const baseSearch =
      search === "brick" ||
      search === "bricks" ||
      search === "plate" ||
      search === "plates" ||
      search === "tile" ||
      search === "tiles";


    if (
      baseSearch &&
      isStandardA !== isStandardB
    ) {

      return isStandardA
        ? -1
        : 1;

    }


    /* =================================================
       DIMENSION BEVORZUGEN
       ================================================= */

    if (
      dimension
    ) {

      const dimensionA =
        extractDimension(
          normalizeDimensionQuery(
            nameA
          )
        );


      const dimensionB =
        extractDimension(
          normalizeDimensionQuery(
            nameB
          )
        );


      const exactA =
        dimensionA ===
        dimension;


      const exactB =
        dimensionB ===
        dimension;


      if (
        exactA !== exactB
      ) {

        return exactA
          ? -1
          : 1;

      }

    }


    /* =================================================
       NORMALE PRIORITÄT
       ================================================= */

    const priorityA =
      getPartPriority(
        a
      );


    const priorityB =
      getPartPriority(
        b
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


    /* =================================================
       EXAKTE TEILENUMMER
       ================================================= */

    if (
      numberA === search &&
      numberB !== search
    ) {

      return -1;

    }


    if (
      numberB === search &&
      numberA !== search
    ) {

      return 1;

    }


    /* =================================================
       NUMERISCHE TEILENUMMERN
       ================================================= */

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


  /*
   * Teil global speichern
   */

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


  /*
   * Suchfeld aktualisieren
   */

  if (input) {

    input.value =
      part.part_num +
      " – " +
      part.name;

  }


  /*
   * Vorschläge schließen
   */

  if (suggestions) {

    suggestions.style.display =
      "none";

  }


  /*
   * Fehler entfernen
   */

  if (errorBox) {

    errorBox.textContent =
      "";

  }


  /*
   * Ausgewähltes Teil anzeigen
   */

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


  /*
   * Farben laden
   */

  await loadColorsForPart(
    part.part_num
  );

}
