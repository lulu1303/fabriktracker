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


function normalizeSearchText(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

}


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


function isStandardPartName(name) {

  return (
    isStandardBrickName(name) ||
    isStandardPlateName(name) ||
    isStandardTileName(name)
  );

}


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

  if (number === query) {
    score -= 200000;
  }

  if (isStandardPartName(name)) {
    score -= 50000;
  }

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

  if (
    normalizeDimensionQuery(name) ===
    normalizeDimensionQuery(query)
  ) {

    score -= 25000;

  }

  if (
    name.startsWith(
      query + " "
    )
  ) {

    score -= 10000;

  }

  if (
    number.startsWith(query)
  ) {

    score -= 8000;

  }

  if (
    name.includes(query)
  ) {

    score -= 3000;

  }

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

  if (
    name.includes("basic") ||
    name.includes("standard")
  ) {

    score -= 500;

  }

  if (
    number.startsWith("brickslot") ||
    name.startsWith("brickslot")
  ) {

    score += 500000;

  }

  if (
    isSpecialPartName(name)
  ) {

    score += 30000;

  }

  if (
    name.includes("duplo") ||
    category.includes("duplo") ||
    categoryName.includes("duplo")
  ) {

    score += 50000;

  }

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

    const normalizedSearch =
      normalizeDimensionQuery(search);

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

      if (
        number === search
      ) {

        priority -= 100000;

      }

      if (
        number.startsWith(search)
      ) {

        priority -= 10000;

      }

      if (
        number.includes(search)
      ) {

        priority -= 3000;

      }

      if (dimension) {

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

      if (
        normalizeDimensionQuery(name) ===
        normalizedSearch
      ) {

        priority -= 20000;

      }

      if (
        name.startsWith(
          search + " "
        )
      ) {

        priority -= 5000;

      }

      if (
        name.includes(search)
      ) {

        priority -= 1500;

      }

      if (
        name.includes("modified")
      ) {

        priority += 12000;

      }

      if (
        name.includes("special")
      ) {

        priority += 12000;

      }

      if (
        name.includes("assembly")
      ) {

        priority += 12000;

      }

      if (
        name.includes("with ") &&
        !(
          isTileSearch &&
          name.includes("groove")
        )
      ) {

        priority += 9000;

      }

      if (
        name.includes("without ") &&
        !(
          isTileSearch &&
          name.includes("groove")
        )
      ) {

        priority += 7000;

      }

      if (
        name.includes("printed") ||
        name.includes("print") ||
        name.includes("pattern") ||
        name.includes("decorated") ||
        name.includes("decoration")
      ) {

        priority += 20000;

      }

      if (
        name.includes("duplo")
      ) {

        priority += 30000;

      }

      if (
        name.includes("modulex")
      ) {

        priority += 30000;

      }

      if (
        name.includes("education")
      ) {

        priority += 25000;

      }

      return priority;

    }

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

    results =
      results.slice(
        0,
        20
      );

    legoSearchResults =
      results;

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

  if (
    number === search
  ) {

    priority -= 300000;

  }

  const standardBrick =
    isStandardBrickName(name);

  const standardPlate =
    isStandardPlateName(name);

  const standardTile =
    isStandardTileName(name);

  const standardPart =
    standardBrick ||
    standardPlate ||
    standardTile;

  if (
    baseSearch &&
    standardPart
  ) {

    priority -= 150000;

  }

  if (
    normalizedName ===
    normalizedSearch
  ) {

    priority -= 80000;

  }

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

  if (
    name.startsWith(
      search + " "
    )
  ) {

    priority -= 15000;

  }

  if (
    number.startsWith(search)
  ) {

    priority -= 10000;

  }

  if (
    name.includes(search)
  ) {

    priority -= 5000;

  }

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

  if (
    number.startsWith("brickslot") ||
    name.startsWith("brickslot")
  ) {

    priority += 500000;

  }

  if (
    name.includes("modified")
  ) {

    priority += 60000;

  }

  if (
    name.includes("special")
  ) {

    priority += 60000;

  }

  if (
    name.includes("assembly")
  ) {

    priority += 60000;

  }

  if (
    name.includes("with ")
  ) {

    priority += 50000;

  }

  if (
    name.includes("without ") ||
    name.includes("ohne ")
  ) {

    priority += 45000;

  }

  if (
    name.includes("printed") ||
    name.includes("print") ||
    name.includes("pattern") ||
    name.includes("decorated") ||
    name.includes("decoration")
  ) {

    priority += 80000;

  }

  if (
    name.includes("legoland") ||
    name.includes("resort") ||
    name.includes("fabrik")
  ) {

    priority += 80000;

  }

  if (
    name.includes("duplo") ||
    category.includes("duplo") ||
    categoryName.includes("duplo")
  ) {

    priority += 100000;

  }

  if (
    name.includes("education") ||
    category.includes("education") ||
    categoryName.includes("education")
  ) {

    priority += 90000;

  }

  return priority;

}


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
