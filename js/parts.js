/* =========================================================
   FABRIKTRACKER – PARTS
========================================================= */

let partsLoading = false;
let categoryImagesLoaded = false;


/* =========================================================
   TEILE-BILDER
========================================================= */

async function loadImagesForParts() {

  if (!Array.isArray(parts) || !parts.length) return;

  const combinations = [
    ...new Map(
      parts
        .filter(p =>
          p.part_number &&
          p.color_id !== null &&
          p.color_id !== undefined
        )
        .map(p => [
          `${p.part_number}_${p.color_id}`,
          {
            part_num: String(p.part_number),
            color_id: Number(p.color_id)
          }
        ])
    ).values()
  ];

  if (!combinations.length) return;

  const imageMap = {};
  const genericMap = {};

  const quote = value =>
    `"${String(value).replace(/"/g, "")}"`;

  try {

    /*
     * 1) Bild der genauen Farbe.
     *
     * Es werden nur die gemeldeten Teil/Farbe-Paare abgefragt.
     * (Alle Farben aller Teile zu laden würde das Zeilenlimit
     * von Supabase sprengen, dann fehlen Bilder.)
     */
    const pairBatch = 40;
    const tasks = [];

    for (let i = 0; i < combinations.length; i += pairBatch) {

      const filter = combinations
        .slice(i, i + pairBatch)
        .map(c =>
          `and(part_num.eq.${quote(c.part_num)},` +
          `color_id.eq.${c.color_id})`
        )
        .join(",");

      tasks.push(
        req(
          `${SUPABASE_URL}/rest/v1/lego_part_colors` +
          `?select=part_num,color_id,image_url` +
          `&or=(${encodeURIComponent(filter)})`
        ).then(rows => {

          (rows || []).forEach(row => {
            imageMap[`${row.part_num}_${row.color_id}`] =
              row.image_url || null;
          });

        })
      );
    }

    /* 2) Allgemeines Teilebild als Reserve */
    const numbers = [
      ...new Set(combinations.map(x => x.part_num))
    ];

    for (let i = 0; i < numbers.length; i += 100) {

      const list = numbers
        .slice(i, i + 100)
        .map(quote)
        .join(",");

      tasks.push(
        req(
          `${SUPABASE_URL}/rest/v1/lego_parts` +
          `?select=part_num,image_url` +
          `&part_num=in.(${encodeURIComponent(list)})`
        ).then(rows => {

          (rows || []).forEach(row => {
            genericMap[row.part_num] = row.image_url || null;
          });

        })
      );
    }

    await Promise.all(tasks);

    parts.forEach(part => {

      const key =
        `${part.part_number || ""}_${part.color_id ?? ""}`;

      const own =
        imageMap[key] || null;

      const generic =
        genericMap[part.part_number] || null;

      part.image_url =
        own || generic || null;

      /* Wird benutzt, falls das Farbbild nicht lädt */
      part.image_fallback =
        generic && generic !== part.image_url
          ? generic
          : null;

    });

  } catch (error) {

    console.warn(
      "LEGO-Bilder konnten nicht geladen werden:",
      error
    );

    parts.forEach(p => {
      p.image_url = null;
      p.image_fallback = null;
    });
  }
}


/*
 * Wenn ein Bild nicht lädt: erst Reserve-Bild versuchen,
 * danach den Stein als Platzhalter anzeigen.
 */
function imageFallback(img) {

  const fallback = img.dataset.fallback;

  if (fallback) {

    img.dataset.fallback = "";
    img.src = fallback;

    return;
  }

  const placeholder = document.createElement("div");

  placeholder.className =
    img.classList.contains("part-number-image")
      ? "part-number-image-placeholder"
      : "part-image-placeholder";

  placeholder.innerHTML = '<span class="brick-logo" aria-hidden="true"></span>';

  img.replaceWith(placeholder);
}

window.imageFallback = imageFallback;


/* =========================================================
   KATEGORIE-BILDER
========================================================= */

async function loadCategoryImages() {

  if (
    categoryImagesLoaded &&
    window.categoryImageMap
  ) return;

  if (typeof CATEGORY_IMAGES === "undefined") {
    window.categoryImageMap = {};
    categoryImagesLoaded = true;
    return;
  }

  const configs = Object.entries(CATEGORY_IMAGES);
  const imageMap = {};

  if (!configs.length) {
    window.categoryImageMap = {};
    categoryImagesLoaded = true;
    return;
  }

  try {

    const results = await Promise.all(
      configs.map(async ([categoryId, config]) => {

        if (!config?.part) return null;

        const partNumber = String(config.part);
        let rows = [];

        if (
          config.color !== null &&
          config.color !== undefined &&
          config.color !== ""
        ) {

          const exactUrl =
            `${SUPABASE_URL}/rest/v1/lego_part_colors` +
            `?part_num=eq.${encodeURIComponent(partNumber)}` +
            `&color_id=eq.${encodeURIComponent(String(config.color))}` +
            `&select=part_num,color_id,image_url&limit=1`;

          try {
            rows = await req(exactUrl);
          } catch {
            rows = [];
          }
        }

        if (
          !Array.isArray(rows) ||
          !rows.length ||
          !rows[0].image_url
        ) {

          const fallbackUrl =
            `${SUPABASE_URL}/rest/v1/lego_part_colors` +
            `?part_num=eq.${encodeURIComponent(partNumber)}` +
            `&image_url=not.is.null` +
            `&select=part_num,color_id,image_url&limit=1`;

          try {
            rows = await req(fallbackUrl);
          } catch {
            rows = [];
          }
        }

        if (rows?.[0]?.image_url) {
          return [
            String(categoryId),
            rows[0].image_url
          ];
        }

        return null;
      })
    );

    results.forEach(result => {

      if (!result) return;

      imageMap[result[0]] = result[1];

    });

    window.categoryImageMap = imageMap;
    categoryImagesLoaded = true;

    console.log(
      "Kategorie-Bilder geladen:",
      Object.keys(imageMap).length
    );

  } catch (error) {

    console.warn(
      "Kategorie-Bilder konnten nicht geladen werden:",
      error
    );

    window.categoryImageMap = {};
    categoryImagesLoaded = false;
  }
}
/* =========================================================
   GEWICHTE
========================================================= */

async function loadWeightsForParts() {

  if (!Array.isArray(parts) || !parts.length) return;

  const numbers = [
    ...new Set(
      parts
        .map(p => String(p.part_number || "").trim())
        .filter(Boolean)
    )
  ];

  if (!numbers.length) return;

  try {

    /* =====================================================
       1. EXAKTE TEILENUMMERN LADEN
    ===================================================== */

    const encoded = numbers
      .map(n => `"${n.replace(/"/g, '\\"')}"`)
      .join(",");

    const exactUrl =
      `${WEIGHTS_URL}` +
      `?part_num=in.(${encoded})` +
      `&select=part_num,weight_grams`;

    const exactRows =
      await req(exactUrl);

    const weightMap = {};

    (exactRows || []).forEach(row => {

      if (
        row.part_num &&
        row.weight_grams !== null &&
        row.weight_grams !== undefined
      ) {

        weightMap[String(row.part_num)] =
          Number(row.weight_grams);

      }

    });


    /* =====================================================
       2. FEHLENDE TEILE → BASISNUMMER ERMITTELN
    ===================================================== */

    const missingNumbers =
      numbers.filter(
        number =>
          weightMap[number] === undefined
      );

    const fallbackNumbers = [
      ...new Set(
        missingNumbers
          .map(number => {

            /*
             * Beispiele:
             *
             * 3069b       → 3069
             * 2431pr0232  → 2431
             * 25977pr0001 → 25977
             *
             * Alles nach der ersten
             * Buchstaben-/Varianten-Endung
             * wird entfernt.
             */

            const match =
              number.match(/^(\d+)/);

            return match
              ? match[1]
              : null;

          })
          .filter(Boolean)
          .filter(
            number =>
              weightMap[number] === undefined
          )
      )
    ];


    /* =====================================================
       3. BASISNUMMERN LADEN
    ===================================================== */

    if (fallbackNumbers.length) {

      const fallbackEncoded =
        fallbackNumbers
          .map(
            n =>
              `"${n.replace(
                /"/g,
                '\\"'
              )}"`
          )
          .join(",");

      const fallbackUrl =
        `${WEIGHTS_URL}` +
        `?part_num=in.(${fallbackEncoded})` +
        `&select=part_num,weight_grams`;

      const fallbackRows =
        await req(fallbackUrl);

      (fallbackRows || []).forEach(row => {

        if (
          row.part_num &&
          row.weight_grams !== null &&
          row.weight_grams !== undefined
        ) {

          weightMap[String(row.part_num)] =
            Number(row.weight_grams);

        }

      });

    }


    /* =====================================================
       4. GEWICHTE DEN TEILEN ZUWEISEN
    ===================================================== */

    parts.forEach(part => {

      const number =
        String(
          part.part_number || ""
        ).trim();

      /* Exakte Nummer bevorzugen */
      if (
        weightMap[number] !== undefined
      ) {

        part.weight_grams =
          weightMap[number];

        return;

      }


      /* Basisnummer als Fallback */
      const match =
        number.match(/^(\d+)/);

      const baseNumber =
        match
          ? match[1]
          : null;

      part.weight_grams =
        baseNumber &&
        weightMap[baseNumber] !== undefined

          ? weightMap[baseNumber]

          : null;

    });


    console.log(
      "Gewichte geladen:",
      parts.filter(
        p =>
          Number.isFinite(
            Number(p.weight_grams)
          ) &&
          Number(p.weight_grams) > 0
      ).length,
      "/",
      parts.length
    );

  } catch (error) {

    console.warn(
      "Gewichte konnten nicht geladen werden:",
      error
    );

    parts.forEach(
      p => p.weight_grams = null
    );

  }
}

/* =========================================================
   TEILE LADEN
========================================================= */

async function loadParts() {

  if (partsLoading) return;

  partsLoading = true;

  const container =
    document.getElementById("results");

  if (container) {
    container.innerHTML = `
      <div class="card loading">
        Teile werden geladen...
      </div>
    `;
  }

  try {

    console.log("Lade Teile aus Supabase...");

    const data = await supabaseRequest(
      PARTS_URL +
      "?select=*" +
      "&order=created_at.desc"
    );

    parts =
      Array.isArray(data)
        ? data
        : [];

    console.log("Teile geladen:", parts.length);

    /* Sofort anzeigen */
    displayParts(parts);


    /* Farben */
    const colorTask = (async () => {

      try {

        const colorIds = [
          ...new Set(
            parts
              .map(p => p.color_id)
              .filter(
                id =>
                  id !== null &&
                  id !== undefined
              )
          )
        ];

        if (!colorIds.length) return;

        const url =
          `${SUPABASE_URL}/rest/v1/lego_colors` +
          `?id=in.(${colorIds.join(",")})` +
          `&select=id,name`;

        const colors =
          await supabaseRequest(url);

        const map = {};

        (colors || []).forEach(color => {
          map[color.id] = color.name;
        });

        parts.forEach(part => {

          part.color_name =
            Number(part.color_id) === 9999
              ? "Not Applicable"
              : map[part.color_id] || "";

        });

        displayParts(parts);

      } catch (error) {

        console.warn(
          "Farben konnten nicht geladen werden:",
          error
        );
      }

    })();


    /* Bilder */
    const imageTask = (async () => {

      try {

        await loadImagesForParts();
        displayParts(parts);

      } catch (error) {

        console.warn(
          "Teile-Bilder konnten nicht geladen werden:",
          error
        );
      }

    })();


    /* Kategorie-Bilder */
    const categoryImageTask = (async () => {

      try {

        await loadCategoryImages();
        displayParts(parts);

      } catch (error) {

        console.warn(
          "Kategorie-Bilder konnten nicht geladen werden:",
          error
        );
      }

    })();


    /* Gewichte */
    const weightTask = (async () => {

      try {

        await loadWeightsForParts();
        displayParts(parts);

      } catch (error) {

        console.warn(
          "Gewichte konnten nicht geladen werden:",
          error
        );
      }

    })();


    Promise.allSettled([
      colorTask,
      imageTask,
      categoryImageTask,
      weightTask
    ]).then(() => {

      const searchInput =
        document.getElementById("searchInput");

      if (
        searchInput &&
        searchInput.value.trim()
      ) {
        searchParts();
      } else {
        displayParts(parts);
      }

    });

  } catch (error) {

    console.error(
      "Teile laden Fehler:",
      error
    );

    showError(
      "Supabase-Fehler beim Laden",
      error.message || "Unbekannter Fehler"
    );

  } finally {

    partsLoading = false;
  }
}


/* =========================================================
   TEILE ANZEIGEN
========================================================= */

function displayParts(list) {

  const container =
    document.getElementById("results");

  if (!container) return;

  if (!Array.isArray(list) || !list.length) {

    container.innerHTML = `
      <div class="card">
        <div class="empty">
          Keine Teile gefunden.
        </div>
      </div>
    `;

    return;
  }

  if (
    typeof groupPartsByRebrickableCategory !==
    "function"
  ) {

    console.error(
      "categories.js wurde nicht geladen."
    );

    return;
  }

  const groups =
    groupPartsByRebrickableCategory(list);

  container.innerHTML =
    groups.map(renderCategory).join("");
}


/* =========================================================
   KATEGORIE RENDERN
========================================================= */

function renderCategory(group) {

  const categoryName =
    escapeHTML(group.name || "Sonstige");

  const categoryId =
    group.id !== null &&
    group.id !== undefined
      ? String(group.id)
      : "other";

  const categoryImage =
    window.categoryImageMap?.[categoryId] || "";

  const partGroups = new Map();

  group.parts.forEach(part => {

    const number =
      String(part.part_number || "");

    if (!partGroups.has(number)) {
      partGroups.set(number, []);
    }

    partGroups.get(number).push(part);
  });

  const content =
    [...partGroups.entries()]
      .map(([number, colorParts]) =>
        renderPartNumberGroup(
          number,
          colorParts
        )
      )
      .join("");

  return `
    <div
      class="category-folder"
      data-category-id="${escapeHTML(categoryId)}"
    >

      <button
        class="category-header"
        onclick="toggleCategory(this)"
      >

        <div class="category-left">

          <span class="category-icon">

            ${
              categoryImage
                ? `
                  <img
                    class="category-image"
                    src="${escapeHTML(categoryImage)}"
                    alt="${categoryName}"
                    loading="lazy"
                  >
                `
                : `<span class="brick-logo" aria-hidden="true"></span>`
            }

          </span>

          <span class="category-name">
            ${categoryName}
          </span>

          <span class="category-count">
            ${group.parts.length}
          </span>

        </div>

        <span class="category-arrow">▶</span>

      </button>

      <div class="category-content">
        ${content}
      </div>

    </div>
  `;
}


/* =========================================================
   TEILENUMMER RENDERN
========================================================= */

function renderPartNumberGroup(
  partNumber,
  colorParts
) {

  const firstPart =
    colorParts[0] || {};

  const safeNumber =
    escapeHTML(String(partNumber || ""));

  const name =
    escapeHTML(firstPart.name || "");

  const imagePart =
    colorParts.find(p => p.image_url) ||
    firstPart;

  const imageUrl =
    imagePart.image_url || "";

  return `
    <div
      class="part-number-folder"
      data-part-number="${safeNumber}"
    >

      <button
        class="part-number-header"
        onclick="togglePartNumber(this)"
      >

        <div class="part-number-left">

          <div class="part-number-image-wrapper">

            ${
              imageUrl
                ? `
                  <img
                    class="part-number-image"
                    src="${escapeHTML(imageUrl)}"
                    data-fallback="${escapeHTML(imagePart.image_fallback || "")}"
                    onerror="imageFallback(this)"
                    alt="LEGO ${safeNumber}"
                    loading="lazy"
                  >
                `
                : `
                  <div class="part-number-image-placeholder">
                    <span class="brick-logo" aria-hidden="true"></span>
                  </div>
                `
            }

          </div>

          <div class="part-number-info">

            <div class="part-number-title">
              LEGO ${safeNumber}
              <span
                class="fav-star${
                  typeof isFavorite === "function" && isFavorite(partNumber)
                    ? " active"
                    : ""
                }"
                data-fav="${safeNumber}"
                role="button"
                aria-label="Als Favorit merken"
              >${
                typeof isFavorite === "function" && isFavorite(partNumber)
                  ? "★"
                  : "☆"
              }</span>
              <span
                class="watch-bell${
                  typeof isWatched === "function" && isWatched(partNumber)
                    ? " active"
                    : ""
                }"
                data-watch="${safeNumber}"
                role="button"
                aria-label="Benachrichtigen, sobald gemeldet"
              >🔔</span>
            </div>

            ${
              name
                ? `
                  <div class="part-number-name">
                    ${name}
                  </div>
                `
                : ""
            }

          </div>

          <span class="part-number-count">
            ${colorParts.length}
            ${colorParts.length === 1 ? " Farbe" : " Farben"}
          </span>

        </div>

        <span class="part-number-arrow">▶</span>

      </button>

      <div class="part-number-content">

        ${
          colorParts
            .map(renderPart)
            .join("")
        }

      </div>

    </div>
  `;
}


/* =========================================================
   EINZELNES TEIL
========================================================= */

function renderPart(part) {

  const number =
    escapeHTML(part.part_number || "");

  const name =
    escapeHTML(part.name || "");

  const color =
    escapeHTML(part.color_name || "");

  let categoryName = "Sonstige";

  if (typeof getCategoryName === "function") {
    categoryName =
      getCategoryName(
        part.category_id,
        "Sonstige"
      );
  }

  const weight =
    Number(part.weight_grams);

  const hasWeight =
    Number.isFinite(weight) &&
    weight > 0;

  let normalPrice = null;

  if (
    hasWeight &&
    typeof PRICE_PER_GRAM !== "undefined"
  ) {

    normalPrice =
      weight * PRICE_PER_GRAM;
  }

  const available =
    part.is_available !== false;

  const lastSeen =
    part.last_seen_at ||
    part.created_at ||
    null;

  /* Genaues Datum (wird als Tooltip angezeigt) */
  const lastSeenFormatted =
    typeof formatDate === "function"
      ? formatDate(lastSeen)
      : "";

  /* Anzeige: "vor wenigen Minuten", "vor 3 Tagen" ... */
  const lastSeenRelative =
    typeof formatRelativeTime === "function"
      ? formatRelativeTime(lastSeen)
      : "";

  const imageUrl =
    part.image_url || "";

  let adminHTML = "";

  if (
    typeof adminAuthenticated !== "undefined" &&
    adminAuthenticated
  ) {

    adminHTML = `
      <div class="part-admin-actions">

        <button
          class="admin-delete-button"
          onclick='adminDeletePart(
  ${JSON.stringify(String(part.id)).replace(/'/g, "&#39;")},
  ${JSON.stringify(String(part.part_number || "")).replace(/'/g, "&#39;")},
  ${JSON.stringify(String(part.name || "")).replace(/'/g, "&#39;")}
)'
        >
          🗑️ Löschen
        </button>

      </div>
    `;
  }

  let priceHTML = "";

if (
  hasWeight &&
  normalPrice !== null
) {

  const normalCents =
    normalPrice * 100;

  const discountList =
    typeof DISCOUNTS !== "undefined" &&
    Array.isArray(DISCOUNTS)
      ? DISCOUNTS
      : [];

  const discountHTML =
    discountList
      .map(discount => {

        const percent =
          Math.round(
            discount.rate * 100
          );

        const cents =
          normalCents *
          (1 - discount.rate);

        return `
          <div
            class="price-discount"
            title="${escapeHTML(discount.title || "")}"
          >
            ${escapeHTML(discount.emoji || "")}
            -${percent}%:
            ${cents.toFixed(1)} ct
          </div>
        `;

      })
      .join("");

  priceHTML = `
    <div class="part-price">

      <div class="price-normal">
        Normal:
        ${normalCents.toFixed(1)} ct
      </div>

      ${discountHTML}

    </div>
  `;
}
  return `
    <div class="part-card ${available ? "" : "unavailable"}">

      <div class="part-main">

        <div class="part-image-wrapper">

          ${
            imageUrl
              ? `
                <img
                  class="part-image"
                  src="${escapeHTML(imageUrl)}"
                  data-fallback="${escapeHTML(part.image_fallback || "")}"
                  onerror="imageFallback(this)"
                  alt="LEGO ${number}"
                  loading="lazy"
                >
              `
              : `
                <div class="part-image-placeholder">
                  <span class="brick-logo" aria-hidden="true"></span>
                </div>
              `
          }

        </div>

        <div class="part-info">

          <div class="part-number">
            LEGO ${number}
          </div>

          <div class="part-name">
            ${name}
          </div>

          ${
            color
              ? `
                <div class="part-color">
                  ${color}
                </div>
              `
              : ""
          }

          <div class="part-category">
            ${escapeHTML(categoryName)}
          </div>

          ${
            hasWeight
              ? `
                <div class="part-weight">
                  ${weight.toFixed(2)} g
                </div>
              `
              : ""
          }

          ${
            lastSeenRelative || lastSeenFormatted
              ? `
                <div
                  class="part-last-seen"
                  title="${escapeHTML(lastSeenFormatted)}"
                >
                  Zuletzt gesehen:
                  ${escapeHTML(lastSeenRelative || lastSeenFormatted)}
                </div>
              `
              : ""
          }

          ${priceHTML}

        </div>

      </div>

      <div class="part-status">

        ${
          available
            ? `
              <span class="status-available">
                🟢 Verfügbar
              </span>
            `
            : `
              <span class="status-unavailable">
                🔴 Nicht verfügbar
              </span>
            `
        }

      </div>

      ${adminHTML}

      ${
        available
          ? `
            <button
              class="confirm-button"
              onclick="confirmPart(
                '${escapeHTML(String(part.part_number || ""))}',
                '${escapeHTML(String(part.id))}'
              )"
            >
              ✅ Gerade gesehen
            </button>

            <button
              class="report-button"
              onclick="reportUnavailable(
                '${escapeHTML(String(part.id))}'
              )"
            >
              Nicht mehr da
            </button>
          `
          : `
            <button
              class="confirm-button"
              onclick="confirmPart(
                '${escapeHTML(String(part.part_number || ""))}',
                '${escapeHTML(String(part.id))}'
              )"
            >
              Wieder verfügbar
            </button>
          `
      }

    </div>
  `;
}


/* =========================================================
   AUF / ZU
========================================================= */

function toggleCategory(button) {

  const folder =
    button?.closest(".category-folder");

  if (!folder) return;

  folder.classList.toggle("open");
}


function togglePartNumber(button) {

  const folder =
    button?.closest(".part-number-folder");

  if (!folder) return;

  folder.classList.toggle("open");
}


/* =========================================================
   FEHLER
========================================================= */

function showError(title, message) {

  const container =
    document.getElementById("results");

  if (!container) return;

  container.innerHTML = `
    <div class="card error">

      <div class="error-title">
        ${escapeHTML(title)}
      </div>

      <div>
        ${escapeHTML(message)}
      </div>

    </div>
  `;
}


/* =========================================================
   GLOBAL
========================================================= */

window.loadParts = loadParts;
window.toggleCategory = toggleCategory;
window.togglePartNumber = togglePartNumber;
