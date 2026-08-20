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
      query
        .trim()
        .toLowerCase();


    let results = [];


    if (!search) {

      legoSearchResults = [];

      suggestions.innerHTML =
        "";

      return;

    }


    /* =====================================================
       TEILENUMMER ODER NAMENSSUCHE
    ===================================================== */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );


    /* =====================================================
       DIREKTE TEILENUMMERNSUCHE
    ===================================================== */

    if (
      looksLikePartNumber
    ) {

      const exactUrl =

        LEGO_PARTS_URL +

        "?part_num=eq." +

        encodeURIComponent(
          search
        ) +

        "&select=part_num,name,category_id,category" +

        "&limit=20";


      results =
        await supabaseRequest(
          exactUrl
        );

    }


    /* =====================================================
       TEILENUMMER TEILWEISE
    ===================================================== */

    if (
      results.length === 0 &&
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

        "&limit=100";


      results =
        await supabaseRequest(
          numberUrl
        );

    }


    /* =====================================================
       NAMENSSUCHE
    ===================================================== */

    if (
      results.length === 0
    ) {

      const normalized =
        normalizeDimensionQuery(
          search
        );


      let standardResults = [];


      /* ===================================================
         STANDARD-BRICK
         
         Nur wenn wirklich nach "brick" gesucht wird.
         
         Dadurch holen wir gezielt:
         
         Brick 1 x 2
         Brick 1 x 4
         Brick 2 x 2
         Brick 2 x 3
         Brick 2 x 4
         ...
         
         und nicht nur die ersten 500 allgemeinen
         "brick"-Treffer wie brickslot0001 usw.
      =================================================== */

      if (
        normalized === "brick" ||
        normalized === "bricks"
      ) {

        const standardBrickUrl =

          LEGO_PARTS_URL +

          "?name=ilike." +

          encodeURIComponent(
            "Brick %"
          ) +

          "&select=part_num,name,category_id,category" +

          "&limit=500";


        const brickResults =
          await supabaseRequest(
            standardBrickUrl
          );


        if (
          Array.isArray(
            brickResults
          )
        ) {

          standardResults =
            standardResults.concat(
              brickResults.filter(
                part => {

                  const partName =
                    String(
                      part.name || ""
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .trim();


                  const partNumber =
                    String(
                      part.part_num || ""
                    )
                      .toLowerCase()
                      .trim();


                  if (
                    partNumber.startsWith(
                      "brickslot"
                    )
                  ) {

                    return false;

                  }


                  return /^brick\s+\d+\s*x\s*\d+$/i.test(
                    partName
                  );

                }
              )
            );

        }

      }


      /* ===================================================
         STANDARD-PLATE
      =================================================== */

      if (
        normalized === "plate" ||
        normalized === "plates"
      ) {

        const standardPlateUrl =

          LEGO_PARTS_URL +

          "?name=ilike." +

          encodeURIComponent(
            "Plate %"
          ) +

          "&select=part_num,name,category_id,category" +

          "&limit=500";


        const plateResults =
          await supabaseRequest(
            standardPlateUrl
          );


        if (
          Array.isArray(
            plateResults
          )
        ) {

          standardResults =
            standardResults.concat(
              plateResults.filter(
                part => {

                  const partName =
                    String(
                      part.name || ""
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .trim();


                  return /^plate\s+\d+\s*x\s*\d+$/i.test(
                    partName
                  );

                }
              )
            );

        }

      }


      /* ===================================================
         STANDARD-TILE
      =================================================== */

      if (
        normalized === "tile" ||
        normalized === "tiles"
      ) {

        const standardTileUrl =

          LEGO_PARTS_URL +

          "?name=ilike." +

          encodeURIComponent(
            "Tile %"
          ) +

          "&select=part_num,name,category_id,category" +

          "&limit=500";


        const tileResults =
          await supabaseRequest(
            standardTileUrl
          );


        if (
          Array.isArray(
            tileResults
          )
        ) {

          standardResults =
            standardResults.concat(
              tileResults.filter(
                part => {

                  const partName =
                    String(
                      part.name || ""
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        " "
                      )
                      .trim();


                  return /^tile\s+\d+\s*x\s*\d+(?:\s+x\s*\d+)?$/i.test(
                    partName
                  );

                }
              )
            );

        }

      }


      /* ===================================================
         EXAKTER NAME
         
         Besonders wichtig für:
         
         Brick 2 x 4
         Plate 2 x 4
         Tile 2 x 2
      =================================================== */

      const exactNameUrl =

        LEGO_PARTS_URL +

        "?name=ilike." +

        encodeURIComponent(
          normalized
        ) +

        "&select=part_num,name,category_id,category" +

        "&limit=20";


      const exactResults =
        await supabaseRequest(
          exactNameUrl
        );


      if (
        Array.isArray(
          exactResults
        )
      ) {

        results =
          exactResults;

      }


      /* ===================================================
         BREITE NAMENSSUCHE
         
         Nur als Ergänzung.
      =================================================== */

      const nameUrl =

        LEGO_PARTS_URL +

        "?name=ilike." +

        encodeURIComponent(
          "%" +
          normalized +
          "%"
        ) +

        "&select=part_num,name,category_id,category" +

        "&limit=500";


      const broadResults =
        await supabaseRequest(
          nameUrl
        );


      if (
        Array.isArray(
          broadResults
        )
      ) {

        results =
          results.concat(
            broadResults
          );

      }


      /* ===================================================
         STANDARDERGEBNISSE VORANSTELLEN
      =================================================== */

      if (
        standardResults.length > 0
      ) {

        results =
          standardResults.concat(
            results
          );

      }


      /* ===================================================
         KOMPAKTE SCHREIBWEISE
         
         Brick 2x4
         Brick 2 x 4
      =================================================== */

      if (
        normalized.includes(
          " x "
        )
      ) {

        const compact =
          normalized.replace(
            /\s*x\s*/gi,
            "x"
          );


        const compactUrl =

          LEGO_PARTS_URL +

          "?name=ilike." +

          encodeURIComponent(
            "%" +
            compact +
            "%"
          ) +

          "&select=part_num,name,category_id,category" +

          "&limit=500";


        const compactResults =
          await supabaseRequest(
            compactUrl
          );


        if (
          Array.isArray(
            compactResults
          )
        ) {

          results =
            results.concat(
              compactResults
            );

        }

      }


      /* ===================================================
         DOPPELTE TREFFER ENTFERNEN
      =================================================== */

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

    }


    /* =====================================================
       KEINE ERGEBNISSE
    ===================================================== */

    if (
      !results ||
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
       DIMENSIONSFILTER
       
       2 x 4 darf NICHT automatisch
       mit 2 x 4 x 3 gleichgesetzt werden.
    ===================================================== */

    const dimension =
      extractDimension(
        search
      );


    if (
      dimension
    ) {

      const filteredResults =
        results.filter(
          part => {

            const partName =
              String(
                part.name || ""
              );


            return hasExactDimension(
              partName,
              dimension
            );

          }
        );


      if (
        filteredResults.length > 0
      ) {

        results =
          filteredResults;

      }

    }


    /* =====================================================
       RELEVANZBEWERTUNG
    ===================================================== */

    function getPartPriority(
      part
    ) {

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


      const category =
        String(
          getCategoryName(
            part.category_id,
            part.category || ""
          )
        )
        .toLowerCase();


      let priority =
        1000;


      /* ===================================================
         EXAKTE TEILENUMMER
      =================================================== */

      if (
        number === search
      ) {

        priority -= 5000;

      }


      /* ===================================================
         EXAKTER NAME
      =================================================== */

      const normalizedSearch =
        normalizeDimensionQuery(
          search
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();


      const normalizedName =
        normalizeDimensionQuery(
          name
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();


      if (
        normalizedName ===
        normalizedSearch
      ) {

        priority -= 3000;

      }


      /* ===================================================
         STANDARDTEIL
      =================================================== */

      if (
        /^brick\s+\d+\s*x\s*\d+$/i.test(
          name
        )
      ) {

        priority -= 3000;

      }


      if (
        /^plate\s+\d+\s*x\s*\d+$/i.test(
          name
        )
      ) {

        priority -= 3000;

      }


      if (
        /^tile\s+\d+\s*x\s*\d+(?:\s+x\s*\d+)?$/i.test(
          name
        )
      ) {

        priority -= 3000;

      }


      /* ===================================================
         NAME BEGINNT MIT SUCHBEGRIFF
      =================================================== */

      if (
        name.startsWith(
          search + " "
        )
      ) {

        priority -= 1200;

      }


      if (
        name.startsWith(
          search
        )
      ) {

        priority -= 700;

      }


      /* ===================================================
         SUCHWÖRTER
      =================================================== */

      const searchWords =
        search
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

            priority -= 100;

          }

        }
      );


      /* ===================================================
         DIMENSION
      =================================================== */

      if (
        dimension &&
        hasExactDimension(
          name,
          dimension
        )
      ) {

        priority -= 1000;

      }


      /* ===================================================
         KATEGORIE
      =================================================== */

      if (
        category.includes(
          "brick"
        )
      ) {

        priority -= 250;

      }


      if (
        category.includes(
          "plate"
        )
      ) {

        priority -= 250;

      }


      if (
        category.includes(
          "tile"
        )
      ) {

        priority -= 250;

      }


      /* ===================================================
         BRICKSLOT NICHT BEVORZUGEN
      =================================================== */

      if (
        number.startsWith(
          "brickslot"
        ) ||
        name.startsWith(
          "brickslot"
        )
      ) {

        priority += 4000;

      }


      /* ===================================================
         BASIC / STANDARD
      =================================================== */

      if (
        name.includes(
          "basic"
        ) ||
        name.includes(
          "standard"
        )
      ) {

        priority -= 150;

      }


      /* ===================================================
         MODIFIED / SPECIAL / ASSEMBLY
      =================================================== */

      if (
        name.includes(
          "modified"
        )
      ) {

        priority += 900;

      }


      if (
        name.includes(
          "special"
        )
      ) {

        priority += 900;

      }


      if (
        name.includes(
          "assembly"
        )
      ) {

        priority += 900;

      }


      if (
        name.includes(
          "with "
        )
      ) {

        priority += 750;

      }


      /* ===================================================
         PRINT / DEKORATION
      =================================================== */

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

        priority += 1200;

      }


      /* ===================================================
         LEGO LAND / RESORT / FABRIK
      =================================================== */

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

        priority += 1500;

      }


      /* ===================================================
         DUPLO
      =================================================== */

      if (
        name.includes(
          "duplo"
        ) ||

        category.includes(
          "duplo"
        )
      ) {

        priority += 2500;

      }


      /* ===================================================
         EDUCATION
      =================================================== */

      if (
        name.includes(
          "education"
        ) ||

        category.includes(
          "education"
        )
      ) {

        priority += 2000;

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


        /* Kürzere Namen zuerst */

        const nameA =
          String(
            a.name || ""
          );


        const nameB =
          String(
            b.name || ""
          );


        if (
          nameA.length !==
          nameB.length
        ) {

          return (
            nameA.length -
            nameB.length
          );

        }


        /* Alphabetisch */

        return nameA.localeCompare(
          nameB
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


    /* =====================================================
       GLOBAL SPEICHERN
    ===================================================== */

    legoSearchResults =
      results;


    /* =====================================================
       ERGEBNISSE ANZEIGEN
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
                onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectLegoPartByIndex(${index}); }"
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
