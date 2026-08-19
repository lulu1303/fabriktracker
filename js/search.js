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
      .toLowerCase();


  const number =
    String(
      part.part_number || ""
    )
      .toLowerCase();


  const category =
    String(
      part.category || ""
    )
      .toLowerCase();


  let score = 1000;


  if (
    number === query
  ) {

    score -= 1000;

  }


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
      partDimension ===
      dimension
    ) {

      score -= 500;

    }

  }


  if (
    name.includes("brick")
  ) {

    score -= 200;

  }


  if (
    name.includes("plate")
  ) {

    score -= 180;

  }


  if (
    name.includes("tile")
  ) {

    score -= 160;

  }


  if (
    name.includes("basic") ||
    name.includes("standard")
  ) {

    score -= 100;

  }


  if (
    name.includes("duplo") ||
    category.includes("duplo")
  ) {

    score += 1000;

  }


  if (
    name.includes("printed") ||
    name.includes("print") ||
    name.includes("pattern") ||
    name.includes("decorated") ||
    name.includes("decoration")
  ) {

    score += 500;

  }


  if (
    name.includes("modified") ||
    name.includes("special") ||
    name.includes("assembly") ||
    name.includes("with ")
  ) {

    score += 250;

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


    /*
     * =====================================================
     * ENTSCHEIDEN, OB ES EINE TEILENUMMER ODER EINE
     * NORMALE NAMENSSUCHE IST
     *
     * "brick"  -> NAMENSSUCHE
     * "plate"  -> NAMENSSUCHE
     * "tile"   -> NAMENSSUCHE
     *
     * "3001"          -> TEILENUMMER
     * "3001pb01"      -> TEILENUMMER
     * "brickslot0001" -> TEILENUMMER
     *
     * Dadurch werden bei "Brick" nicht mehr zuerst
     * brickslot0001, brickslot0002 usw. angezeigt.
     * =====================================================
     */

    const looksLikePartNumber =
      /^[a-z0-9._-]*\d[a-z0-9._-]*$/i.test(
        search
      );


    /*
     * =====================================================
     * DIREKTE TEILENUMMERNSUCHE
     * =====================================================
     */

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


    /*
     * =====================================================
     * TEILENUMMER TEILWEISE SUCHEN
     *
     * Nur wenn die Eingabe tatsächlich wie eine
     * Teilnummer aussieht.
     * =====================================================
     */

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


    /*
     * =====================================================
     * NAMENSSUCHE
     *
     * WICHTIG:
     * Zuerst exakt nach dem Namen suchen.
     *
     * Dadurch wird z.B.
     *
     * "Brick 2 x 4"
     *
     * direkt gefunden, auch wenn in der Datenbank
     * tausende andere Treffer davor liegen.
     * =====================================================
     */

    if (
      results.length === 0
    ) {

      const normalized =
        normalizeDimensionQuery(
          search
        );


      /*
       * =====================================================
       * 1. EXAKTER NAME
       * =====================================================
       */

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


      results =
        Array.isArray(
          exactResults
        )
          ? exactResults
          : [];


      /*
       * =====================================================
       * 2. NORMALE TEILSUCHE
       *
       * Hier holen wir zusätzlich weitere Treffer.
       * =====================================================
       */

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


      /*
       * Exakte Treffer + normale Treffer zusammenführen
       */

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


      /*
       * =====================================================
       * 3. KOMPAKTE SCHREIBWEISE
       *
       * Beispiel:
       *
       * Brick 2x4
       * Brick 2 x 4
       * =====================================================
       */

      if (
        !results ||
        results.length === 0
      ) {

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


          results =
            await supabaseRequest(
              compactUrl
            );

        }

      }


      /*
       * =====================================================
       * DOPPELTE TREFFER ENTFERNEN
       * =====================================================
       */

      const uniqueParts =
        new Map();


      for (
        const part of results
      ) {

        const key =
          String(
            part.part_num || ""
          ).toLowerCase();


        if (
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


    /*
     * =====================================================
     * KEINE ERGEBNISSE
     * =====================================================
     */

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


    /*
     * =====================================================
     * DIMENSIONSFILTER
     *
     * WICHTIG:
     * 2 x 4 darf NICHT mit 2 x 4 x 3
     * gleichgesetzt werden.
     * =====================================================
     */

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
              normalizeDimensionQuery(
                String(
                  part.name || ""
                )
              );


            /*
             * Exakte Dimension bevorzugen.
             *
             * Beispiel:
             *
             * Suche: 2 x 4
             *
             * 2 x 4       -> Treffer
             * 2 x 4 x 3   -> kein exakter Treffer
             */

            const exactDimensionRegex =
              new RegExp(
                "(^|\\s)" +
                dimension.replace(
                  /\s*x\s*/gi,
                  "\\s*x\\s*"
                ) +
                "(\\s|$)",
                "i"
              );


            return exactDimensionRegex.test(
              partName
            );

          }
        );


      /*
       * Nur übernehmen, wenn wirklich
       * passende Ergebnisse vorhanden sind.
       */

      if (
        filteredResults.length > 0
      ) {

        results =
          filteredResults;

      }

    }


    /*
     * =====================================================
     * RELEVANZBEWERTUNG
     * =====================================================
     *
     * WICHTIG:
     *
     * Bei "Brick" soll z.B.
     *
     * "Brick 2 x 4"
     *
     * vor
     *
     * "Door for Slotted Bricks"
     *
     * stehen.
     *
     * Und vor allem sollen
     *
     * brickslot0001
     *
     * nicht automatisch ganz oben stehen.
     * =====================================================
     */

    function getPartPriority(
      part
    ) {

      const number =
        String(
          part.part_num || ""
        )
        .toLowerCase();


      const name =
        String(
          part.name || ""
        )
        .toLowerCase();


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


      /*
       * =====================================================
       * EXAKTE TEILENUMMER
       * =====================================================
       */

      if (
        number === search
      ) {

        priority -= 2000;

      }


      /*
       * =====================================================
       * SUCHBEGRIFF ALS GANZES WORT
       *
       * Dadurch werden normale Teile bevorzugt.
       * =====================================================
       */

      const searchWords =
        search
          .split(/\s+/)
          .filter(Boolean);


      let wordMatches =
        0;


      searchWords.forEach(
        word => {

          if (
            name.includes(
              word
            )
          ) {

            wordMatches++;

          }

        }
      );


      priority -=
        wordMatches * 80;


      /*
       * =====================================================
       * KATEGORIE
       * =====================================================
       */

      if (
        category.includes(
          "brick"
        )
      ) {

        priority -= 150;

      }


      if (
        category.includes(
          "plate"
        )
      ) {

        priority -= 150;

      }


      if (
        category.includes(
          "tile"
        )
      ) {

        priority -= 150;

      }


      /*
       * =====================================================
       * STANDARD-TEIL BEVORZUGEN
       *
       * "Brick 2 x 4"
       * ist besser als
       * "Brick 2 x 4 without..."
       * oder
       * "Brick 2 x 4 with LEGOland..."
       * =====================================================
       */

      const cleanName =
        name
          .replace(
            /\s+/g,
            " "
          )
          .trim();


      /*
       * Exakter Namens-Treffer
       */

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
          cleanName
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

        priority -= 1000;

      }


      /*
       * =====================================================
       * DIMENSIONEN
       * =====================================================
       */

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
          partDimension ===
          dimension
        ) {

          priority -= 500;

        }

      }


      /*
       * =====================================================
       * STANDARD-BRICK / PLATE / TILE
       *
       * Wenn das Teil einfach nur "Brick 2 x 4"
       * heißt, bekommt es einen starken Bonus.
       * =====================================================
       */

      if (
        /^brick\s+\d+\s*x\s*\d+$/i.test(
          cleanName
        )
      ) {

        priority -= 600;

      }


      if (
        /^plate\s+\d+\s*x\s*\d+$/i.test(
          cleanName
        )
      ) {

        priority -= 600;

      }


      if (
        /^tile\s+\d+\s*x\s*\d+/i.test(
          cleanName
        )
      ) {

        priority -= 600;

      }


      /*
       * =====================================================
       * SONDERTEILE NACH HINTEN
       * =====================================================
       */

      if (
        name.includes(
          "modified"
        )
      ) {

        priority += 500;

      }


      if (
        name.includes(
          "special"
        )
      ) {

        priority += 500;

      }


      if (
        name.includes(
          "assembly"
        )
      ) {

        priority += 500;

      }


      if (
        name.includes(
          "with "
        )
      ) {

        priority += 450;

      }


      /*
       * =====================================================
       * PRINT / DEKORATION
       * =====================================================
       */

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

        priority += 700;

      }


      /*
       * =====================================================
       * LEGO LAND / RESORT / FABRIK
       * =====================================================
       */

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

        priority += 900;

      }


      /*
       * =====================================================
       * DUPLO / EDUCATION
       * =====================================================
       */

      if (
        name.includes(
          "duplo"
        ) ||

        category.includes(
          "duplo"
        )
      ) {

        priority += 1500;

      }


      if (
        name.includes(
          "education"
        ) ||

        category.includes(
          "education"
        )
      ) {

        priority += 1200;

      }


      return priority;

    }


    /*
     * =====================================================
     * SORTIEREN
     * =====================================================
     */

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


        /*
         * Bei gleicher Relevanz:
         * kürzere Namen zuerst
         */

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


        /*
         * Danach alphabetisch
         */

        return nameA.localeCompare(
          nameB
        );

      }
    );


    /*
     * Maximal 20 Ergebnisse anzeigen
     */

    results =
      results.slice(
        0,
        20
      );


    /*
     * =====================================================
     * GLOBAL SPEICHERN
     * =====================================================
     */

    legoSearchResults =
      results;


    /*
     * =====================================================
     * ERGEBNISSE ANZEIGEN
     * =====================================================
     */

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
   NEU:
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
