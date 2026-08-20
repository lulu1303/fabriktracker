/* =========================================================
   PARTS
   FabrikTracker
========================================================= */


/* =========================================================
   LADESTATUS / CACHE
========================================================= */

let partsLoading = false;

let categoryImagesLoaded = false;


/*
 * =========================================================
 * BILD-CACHE
 * =========================================================
 *
 * Die Bilder werden nach
 *
 *     Teilenummer + Farbe
 *
 * zwischengespeichert.
 *
 * Dadurch müssen sie beim erneuten Laden der
 * Teile nicht noch einmal aus Supabase geladen werden.
 */

const partImageCache = {};


/*
 * =========================================================
 * GEWICHT-CACHE
 * =========================================================
 */

const partWeightCache = {};


/*
 * =========================================================
 * FARB-CACHE
 * =========================================================
 */

const partColorCache = {};


/* =========================================================
   BILDER LADEN
========================================================= */

async function loadImagesForParts() {

  if (
    !Array.isArray(parts) ||
    parts.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * BENÖTIGTE KOMBINATIONEN ERMITTELN
   * =====================================================
   */

  const combinations = [
    ...new Map(

      parts

        .filter(
          part =>
            part.part_number &&
            part.color_id !== null &&
            part.color_id !== undefined
        )

        .map(
          part => {

            const key =
              String(
                part.part_number
              ) +
              "_" +
              String(
                part.color_id
              );


            return [
              key,
              {
                part_num:
                  String(
                    part.part_number
                  ),

                color_id:
                  Number(
                    part.color_id
                  )
              }
            ];

          }
        )

    ).values()
  ];


  if (
    combinations.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * BEREITS GE-CACHTE BILDER DIREKT VERWENDEN
   * =====================================================
   */

  const missingCombinations =
    combinations.filter(
      item => {

        const key =
          String(
            item.part_num
          ) +
          "_" +
          String(
            item.color_id
          );


        return !Object.prototype.hasOwnProperty.call(
          partImageCache,
          key
        );

      }
    );


  /*
   * Wenn alles bereits im Cache ist,
   * müssen wir überhaupt keinen Request machen.
   */

  if (
    missingCombinations.length === 0
  ) {

    parts.forEach(
      part => {

        const key =
          String(
            part.part_number || ""
          ) +
          "_" +
          String(
            part.color_id ?? ""
          );


        part.image_url =
          partImageCache[key] ||
          null;

      }
    );


    return;

  }


  /*
   * =====================================================
   * EINDEUTIGE TEILENUMMERN
   * =====================================================
   */

  const missingPartNumbers = [
    ...new Set(
      missingCombinations.map(
        item =>
          item.part_num
      )
    )
  ];


  /*
   * =====================================================
   * BATCHES
   * =====================================================
   *
   * Maximal 100 Teilenummern pro Request.
   *
   * Die einzelnen Batches laufen PARALLEL.
   */

  const batchSize =
    100;


  const batches = [];


  for (
    let i = 0;
    i < missingPartNumbers.length;
    i += batchSize
  ) {

    batches.push(
      missingPartNumbers.slice(
        i,
        i + batchSize
      )
    );

  }


  try {

    /*
     * ===================================================
     * ALLE BATCHES PARALLEL ABFRAGEN
     * ===================================================
     */

    const batchRequests =
      batches.map(
        async batch => {

          const encodedNumbers =
            batch

              .map(
                number =>
                  `"${String(number)
                    .replace(
                      /"/g,
                      '\\"'
                    )}"`
              )

              .join(",");


          const url =
            SUPABASE_URL +
            "/rest/v1/lego_part_colors" +
            "?part_num=in.(" +
            encodedNumbers +
            ")" +
            "&select=part_num,color_id,image_url";


          return req(
            url
          );

        }
      );


    const batchResults =
      await Promise.all(
        batchRequests
      );


    /*
     * ===================================================
     * CACHE AUFBAUEN
     * ===================================================
     */

    batchResults.forEach(
      rows => {

        (
          rows || []
        ).forEach(
          row => {

            const key =
              String(
                row.part_num
              ) +
              "_" +
              String(
                row.color_id
              );


            partImageCache[key] =
              row.image_url ||
              null;

          }
        );

      }
    );


    /*
     * ===================================================
     * TEILE MIT CACHE VERKNÜPFEN
     * ===================================================
     */

    parts.forEach(
      part => {

        const key =
          String(
            part.part_number || ""
          ) +
          "_" +
          String(
            part.color_id ?? ""
          );


        part.image_url =
          Object.prototype.hasOwnProperty.call(
            partImageCache,
            key
          )

            ? partImageCache[key]

            : null;

      }
    );


  } catch (
    error
  ) {

    console.warn(
      "Farbabhängige LEGO-Bilder konnten nicht geladen werden:",
      error
    );


    /*
     * Nur fehlende Werte auf null setzen.
     *
     * Bereits gecachte Bilder bleiben erhalten.
     */

    parts.forEach(
      part => {

        const key =
          String(
            part.part_number || ""
          ) +
          "_" +
          String(
            part.color_id ?? ""
          );


        if (
          Object.prototype.hasOwnProperty.call(
            partImageCache,
            key
          )
        ) {

          part.image_url =
            partImageCache[key];

        } else {

          part.image_url =
            null;

        }

      }
    );

  }

}


/* =========================================================
   KATEGORIE-BILDER LADEN
========================================================= */

/*
 * Die Auswahl der Kategorie-Bilder erfolgt
 * ausschließlich über CATEGORY_IMAGES in categories.js.
 *
 * WICHTIG:
 *
 * Deine komplette manuelle CATEGORY_IMAGES-Konfiguration
 * bleibt in categories.js erhalten.
 *
 *
 * Die Bilder werden:
 *
 * 1. Nur EINMAL geladen
 * 2. Alle benötigten Teilenummern werden gesammelt
 * 3. Maximal 100 Teilenummern pro Request
 * 4. Die Requests laufen parallel
 * 5. Die gewünschte Farbe wird anschließend lokal
 *    ausgewählt
 *
 * Dadurch gibt es NICHT mehr für jede Kategorie
 * einen eigenen Supabase-Request.
 */

async function loadCategoryImages() {

  /*
   * =====================================================
   * BEREITS GELADEN
   * =====================================================
   */

  if (
    categoryImagesLoaded &&
    window.categoryImageMap
  ) {

    return;

  }


  /*
   * =====================================================
   * CATEGORY_IMAGES VORHANDEN?
   * =====================================================
   */

  if (
    typeof CATEGORY_IMAGES ===
    "undefined"
  ) {

    window.categoryImageMap =
      {};

    categoryImagesLoaded =
      true;

    return;

  }


  const configs =
    Object.entries(
      CATEGORY_IMAGES
    );


  if (
    configs.length === 0
  ) {

    window.categoryImageMap =
      {};

    categoryImagesLoaded =
      true;

    return;

  }


  /*
   * =====================================================
   * GÜLTIGE KONFIGURATIONEN SAMMELN
   * =====================================================
   */

  const validConfigs =
    configs.filter(
      (
        [
          categoryId,
          config
        ]
      ) => {

        return (
          config &&
          config.part
        );

      }
    );


  if (
    validConfigs.length === 0
  ) {

    window.categoryImageMap =
      {};

    categoryImagesLoaded =
      true;

    return;

  }


  /*
   * =====================================================
   * EINDEUTIGE TEILENUMMERN
   * =====================================================
   */

  const partNumbers = [
    ...new Set(
      validConfigs.map(
        (
          [
            categoryId,
            config
          ]
        ) =>
          String(
            config.part
          )
      )
    )
  ];


  const imageRows = [];


  /*
   * =====================================================
   * BATCHES
   * =====================================================
   */

  const batchSize =
    100;


  const batches = [];


  for (
    let i = 0;
    i < partNumbers.length;
    i += batchSize
  ) {

    batches.push(
      partNumbers.slice(
        i,
        i + batchSize
      )
    );

  }


  try {

    /*
     * ===================================================
     * ALLE BATCHES PARALLEL
     * ===================================================
     */

    const requests =
      batches.map(
        async batch => {

          const encodedNumbers =
            batch

              .map(
                number =>
                  `"${String(number)
                    .replace(
                      /"/g,
                      '\\"'
                    )}"`
              )

              .join(",");


          const url =
            SUPABASE_URL +
            "/rest/v1/lego_part_colors" +
            "?part_num=in.(" +
            encodedNumbers +
            ")" +
            "&image_url=not.is.null" +
            "&select=part_num,color_id,image_url";


          try {

            return await req(
              url
            );

          } catch (
            error
          ) {

            console.warn(
              "Kategorie-Bild-Batch konnte nicht geladen werden:",
              error
            );


            return [];

          }

        }
      );


    const results =
      await Promise.all(
        requests
      );


    /*
     * ===================================================
     * ERGEBNISSE ZUSAMMENFÜHREN
     * ===================================================
     */

    results.forEach(
      rows => {

        (
          rows || []
        ).forEach(
          row => {

            imageRows.push(
              row
            );

          }
        );

      }
    );


    /*
     * ===================================================
     * BILDER AUSWÄHLEN
     * ===================================================
     */

    const imageMap =
      {};


    validConfigs.forEach(
      (
        [
          categoryId,
          config
        ]
      ) => {

        const partNumber =
          String(
            config.part
          );


        /*
         * -------------------------------------------------
         * ZUERST EXAKTE FARBE
         * -------------------------------------------------
         */

        let matchingRow =
          null;


        if (
          config.color !== null &&
          config.color !== undefined &&
          config.color !== ""
        ) {

          matchingRow =
            imageRows.find(
              row =>

                String(
                  row.part_num
                ) ===
                partNumber &&

                Number(
                  row.color_id
                ) ===
                Number(
                  config.color
                ) &&

                row.image_url

            );

        }


        /*
         * -------------------------------------------------
         * FALLBACK
         * -------------------------------------------------
         *
         * Wenn die gewünschte Farbe kein Bild besitzt,
         * nehmen wir irgendeine vorhandene Bildvariante
         * desselben Teils.
         */

        if (
          !matchingRow
        ) {

          matchingRow =
            imageRows.find(
              row =>

                String(
                  row.part_num
                ) ===
                partNumber &&

                row.image_url

            );

        }


        /*
         * -------------------------------------------------
         * BILD SPEICHERN
         * -------------------------------------------------
         */

        if (
          matchingRow &&
          matchingRow.image_url
        ) {

          imageMap[
            String(
              categoryId
            )
          ] =
            matchingRow.image_url;

        }

      }
    );


    window.categoryImageMap =
      imageMap;


    categoryImagesLoaded =
      true;


    console.log(
      "Kategorie-Bilder geladen:",
      Object.keys(
        imageMap
      ).length
    );


  } catch (
    error
  ) {

    console.warn(
      "Kategorie-Bilder konnten nicht geladen werden:",
      error
    );


    window.categoryImageMap =
      {};


    /*
     * Bei Fehler nicht dauerhaft
     * als erfolgreich geladen markieren.
     */

    categoryImagesLoaded =
      false;

  }

}


/* =========================================================
   GEWICHTE LADEN
========================================================= */

async function loadWeightsForParts() {

  if (
    !Array.isArray(parts) ||
    parts.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * EINDEUTIGE TEILENUMMERN
   * =====================================================
   */

  const numbers = [
    ...new Set(
      parts

        .map(
          part =>
            String(
              part.part_number || ""
            )
        )

        .filter(Boolean)

    )
  ];


  if (
    numbers.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * BEREITS GE-CACHTE WERTE
   * =====================================================
   */

  const missingNumbers =
    numbers.filter(
      number =>
        !Object.prototype.hasOwnProperty.call(
          partWeightCache,
          number
        )
    );


  /*
   * Alles bereits vorhanden?
   */

  if (
    missingNumbers.length === 0
  ) {

    parts.forEach(
      part => {

        const number =
          String(
            part.part_number || ""
          );


        part.weight_grams =
          partWeightCache[number] ??
          null;

      }
    );


    return;

  }


  try {

    /*
     * ===================================================
     * FEHLENDE GEWICHTE LADEN
     * ===================================================
     */

    const encodedNumbers =
      missingNumbers

        .map(
          number =>
            `"${number.replace(
              /"/g,
              '\\"'
            )}"`
        )

        .join(",");


    const url =
      WEIGHTS_URL +
      "?part_num=in.(" +
      encodedNumbers +
      ")" +
      "&select=part_num,weight_grams";


    const weights =
      await req(
        url
      );


    /*
     * ===================================================
     * CACHE AUFBAUEN
     * ===================================================
     */

    (
      weights || []
    ).forEach(
      row => {

        partWeightCache[
          String(
            row.part_num
          )
        ] =
          Number(
            row.weight_grams
          );

      }
    );


    /*
     * Fehlende Werte merken,
     * damit sie nicht bei jedem Reload
     * erneut abgefragt werden.
     */

    missingNumbers.forEach(
      number => {

        if (
          !Object.prototype.hasOwnProperty.call(
            partWeightCache,
            number
          )
        ) {

          partWeightCache[number] =
            null;

        }

      }
    );


    /*
     * ===================================================
     * TEILE AKTUALISIEREN
     * ===================================================
     */

    parts.forEach(
      part => {

        const number =
          String(
            part.part_number || ""
          );


        part.weight_grams =
          partWeightCache[number] ??
          null;

      }
    );


  } catch (
    error
  ) {

    console.warn(
      "Gewichte konnten nicht geladen werden:",
      error
    );


    /*
     * Bereits vorhandene Cache-Werte
     * trotzdem verwenden.
     */

    parts.forEach(
      part => {

        const number =
          String(
            part.part_number || ""
          );


        part.weight_grams =
          Object.prototype.hasOwnProperty.call(
            partWeightCache,
            number
          )

            ? partWeightCache[number]

            : null;

      }
    );

  }

}


/* =========================================================
   FARBEN LADEN
========================================================= */

async function loadColorsForParts() {

  if (
    !Array.isArray(parts) ||
    parts.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * EINDEUTIGE FARBEN
   * =====================================================
   */

  const colorIds = [

    ...new Set(

      parts

        .map(
          part =>
            part.color_id
        )

        .filter(
          id =>
            id !== null &&
            id !== undefined
        )

    )

  ];


  if (
    colorIds.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * FEHLENDE FARBEN
   * =====================================================
   */

  const missingColorIds =
    colorIds.filter(
      id =>
        !Object.prototype.hasOwnProperty.call(
          partColorCache,
          id
        )
    );


  /*
   * =====================================================
   * NUR FEHLENDE FARBEN LADEN
   * =====================================================
   */

  if (
    missingColorIds.length > 0
  ) {

    const colorsUrl =

      SUPABASE_URL +
      "/rest/v1/lego_colors" +

      "?id=in.(" +
      missingColorIds.join(",") +
      ")" +

      "&select=id,name";


    const colors =
      await supabaseRequest(
        colorsUrl
      );


    (
      colors || []
    ).forEach(
      color => {

        partColorCache[
          color.id
        ] =
          color.name;

      }
    );


    /*
     * Nicht gefundene Farben ebenfalls
     * als leer markieren.
     */

    missingColorIds.forEach(
      id => {

        if (
          !Object.prototype.hasOwnProperty.call(
            partColorCache,
            id
          )
        ) {

          partColorCache[id] =
            "";

        }

      }
    );

  }


  /*
   * =====================================================
   * FARBEN DEN TEILEN ZUWEISEN
   * =====================================================
   */

  parts.forEach(
    part => {

      if (
        Number(
          part.color_id
        ) === 9999
      ) {

        part.color_name =
          "Not Applicable";

      } else {

        part.color_name =
          partColorCache[
            part.color_id
          ] || "";

      }

    }
  );

}


/* =========================================================
   TEILE LADEN
========================================================= */

async function loadParts() {

  /*
   * =====================================================
   * DOPPELTE LADE-VORGÄNGE VERHINDERN
   * =====================================================
   */

  if (
    partsLoading
  ) {

    console.log(
      "loadParts() läuft bereits."
    );

    return;

  }


  partsLoading =
    true;


  const container =
    document.getElementById(
      "results"
    );


  if (
    container
  ) {

    container.innerHTML = `
      <div class="card loading">
        Teile werden geladen...
      </div>
    `;

  }


  try {

    /*
     * =====================================================
     * TEILE AUS SUPABASE LADEN
     * =====================================================
     */

    const data =
      await supabaseRequest(

        PARTS_URL +
        "?select=*" +
        "&order=created_at.desc"

      );


    parts =
      Array.isArray(
        data
      )
        ? data
        : [];


    /*
     * =====================================================
     * WICHTIG:
     *
     * Die Teile werden jetzt SOFORT angezeigt.
     *
     * Wir warten NICHT auf:
     *
     * - Bilder
     * - Gewichte
     *
     * Dadurch fühlt sich die Seite deutlich schneller an.
     * =====================================================
     */

    displayParts(
      parts
    );


    /*
     * =====================================================
     * KATEGORIEN INITIALISIEREN
     * =====================================================
     */

    if (
      typeof initializeCategories ===
      "function"
    ) {

      await initializeCategories();

    }


    /*
     * =====================================================
     * FARBEN + BILDER + GEWICHTE
     * PARALLEL LADEN
     * =====================================================
     */

    const backgroundTasks = [];


    if (
      typeof loadColorsForParts ===
      "function"
    ) {

      backgroundTasks.push(
        loadColorsForParts()
      );

    }


    if (
      typeof loadImagesForParts ===
      "function"
    ) {

      backgroundTasks.push(
        loadImagesForParts()
      );

    }


    if (
      typeof loadCategoryImages ===
      "function"
    ) {

      backgroundTasks.push(
        loadCategoryImages()
      );

    }


    if (
      typeof loadWeightsForParts ===
      "function"
    ) {

      backgroundTasks.push(
        loadWeightsForParts()
      );

    }


    /*
     * Alle Hintergrunddaten gleichzeitig laden.
     */

    await Promise.all(
      backgroundTasks
    );


    /*
     * =====================================================
     * NOCH EINMAL DARSTELLEN
     * =====================================================
     *
     * Jetzt sind:
     *
     * - Farben
     * - Bilder
     * - Kategorie-Bilder
     * - Gewichte
     *
     * vorhanden.
     */

    displayParts(
      parts
    );


  } catch (
    error
  ) {

    console.error(
      "Teile laden Fehler:",
      error
    );


    showError(
      "Supabase-Fehler beim Laden",
      error.message ||
      "Unbekannter Fehler"
    );


  } finally {

    partsLoading =
      false;

  }

}


/* =========================================================
   TEILE ANZEIGEN
========================================================= */

function displayParts(
  list
) {

  const container =
    document.getElementById(
      "results"
    );


  if (
    !container
  ) {

    return;

  }


  if (
    !Array.isArray(
      list
    ) ||
    list.length === 0
  ) {

    container.innerHTML = `

      <div class="card">

        <div class="empty">

          Keine Teile gefunden.

        </div>

      </div>

    `;

    return;

  }


  /*
   * Teile nach Rebrickable-Kategorie gruppieren.
   */

  let groups = [];


  if (
    typeof groupPartsByRebrickableCategory ===
    "function"
  ) {

    groups =
      groupPartsByRebrickableCategory(
        list
      );

  } else {

    console.error(
      "categories.js wurde nicht geladen. " +
      "Rebrickable-Kategorien sind nicht verfügbar."
    );


    groups = [];

  }


  container.innerHTML =

    groups

      .map(
        group => {

          const categoryName =
            escapeHTML(
              group.name ||
              "Sonstige"
            );


          /*
           * Rebrickable-ID als
           * eindeutige Kategorie-ID.
           */

          const categoryId =
            group.id !== null &&
            group.id !== undefined

              ? String(
                  group.id
                )

              : "other";


          /*
           * =================================================
           * KATEGORIE-BILD
           * =================================================
           */

          const categoryImage =
            window.categoryImageMap &&
            window.categoryImageMap[
              categoryId
            ]

              ? window.categoryImageMap[
                  categoryId
                ]

              : "";


          const safeCategoryImage =
            categoryImage

              ? escapeHTML(
                  categoryImage
                )

              : "";


          return `

            <div
              class="category-folder"
              data-category-id="${escapeHTML(
                categoryId
              )}"
            >

              <button
                class="category-header"
                onclick="toggleCategory(this)"
              >

                <div class="category-left">

                  <span class="category-icon">

                    ${
                      safeCategoryImage

                        ? `

                          <img
                            class="category-image"
                            src="${safeCategoryImage}"
                            alt="${categoryName}"
                            loading="lazy"
                          >

                        `

                        : `

                          🧱

                        `
                    }

                  </span>


                  <span class="category-name">

                    ${categoryName}

                  </span>


                  <span class="category-count">

                    ${group.parts.length}

                  </span>

                </div>


                <span class="category-arrow">

                  ▶

                </span>

              </button>


              <div class="category-content">

                ${
                  group.parts

                    .map(
                      part =>
                        renderPart(
                          part
                        )
                    )

                    .join("")

                }

              </div>

            </div>

          `;

        }
      )

      .join("");

}


/* =========================================================
   TEIL RENDERN
========================================================= */

function renderPart(
  part
) {

  const number =
    escapeHTML(
      part.part_number ||
      ""
    );


  const name =
    escapeHTML(
      part.name ||
      ""
    );


  const color =
    escapeHTML(
      part.color_name ||
      ""
    );


  /*
   * =====================================================
   * KATEGORIE
   * =====================================================
   */

  let categoryName =
    "Sonstige";


  if (
    typeof getCategoryName ===
    "function"
  ) {

    categoryName =
      getCategoryName(
        part.category_id,
        "Sonstige"
      );

  }


  /*
   * =====================================================
   * GEWICHT
   * =====================================================
   */

  const weight =
    Number(
      part.weight_grams
    );


  const hasWeight =
    Number.isFinite(
      weight
    ) &&
    weight > 0;


  let normalPrice =
    null;


  let discountPrice =
    null;


  if (
    hasWeight &&
    typeof PRICE_PER_GRAM !==
    "undefined"
  ) {

    normalPrice =
      weight *
      PRICE_PER_GRAM;


    if (
      typeof DISCOUNT !==
      "undefined"
    ) {

      discountPrice =
        normalPrice *
        (
          1 -
          DISCOUNT
        );

    }

  }


  /*
   * =====================================================
   * VERFÜGBARKEIT
   * =====================================================
   */

  const isAvailable =
    part.is_available !== false;


  const lastSeen =
    part.last_seen_at ||
    part.created_at ||
    null;


  const lastSeenFormatted =
    typeof formatDate ===
    "function"

      ? formatDate(
          lastSeen
        )

      : "";


  /*
   * =====================================================
   * BILD
   * =====================================================
   */

  const imageUrl =
    part.image_url ||
    "";


  const safeImageUrl =
    imageUrl

      ? escapeHTML(
          imageUrl
        )

      : "";


  /*
   * =====================================================
   * PREIS
   * =====================================================
   */

  let priceHTML =
    "";


  if (
    hasWeight &&
    normalPrice !== null
  ) {

    priceHTML = `

      <div class="part-price">

        ${
          discountPrice !== null

            ? `

              <span class="price-normal">

                ${normalPrice.toFixed(2)} €

              </span>

              <span class="price-discount">

                ${discountPrice.toFixed(2)} €

              </span>

            `

            : `

              <span>

                ${normalPrice.toFixed(2)} €

              </span>

            `
        }

      </div>

    `;

  }


  /*
   * =====================================================
   * ADMIN
   * =====================================================
   */

  let adminHTML =
    "";


  if (
    typeof adminAuthenticated !==
    "undefined" &&
    adminAuthenticated
  ) {

    adminHTML = `

      <div class="part-admin-actions">

        <button
          class="admin-delete-button"
          onclick="adminDeletePart(
            '${escapeHTML(
              String(
                part.id
              )
            )}',
            '${escapeHTML(
              String(
                part.part_number ||
                ""
              )
            )}',
            '${escapeHTML(
              String(
                part.name ||
                ""
              )
            )}'
          )"
        >

          🗑️ Löschen

        </button>

      </div>

    `;

  }


  /*
   * =====================================================
   * HTML
   * =====================================================
   */

  return `

    <div
      class="part-card ${
        isAvailable
          ? ""
          : "unavailable"
      }"
    >

      <div class="part-main">


        <div class="part-image-wrapper">

          ${
            safeImageUrl

              ? `

                <img
                  class="part-image"
                  src="${safeImageUrl}"
                  alt="LEGO ${number}"
                  loading="lazy"
                >

              `

              : `

                <div class="part-image-placeholder">

                  🧱

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

            ${escapeHTML(
              categoryName
            )}

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
            lastSeenFormatted

              ? `

                <div class="part-last-seen">

                  Zuletzt gesehen:
                  ${escapeHTML(
                    lastSeenFormatted
                  )}

                </div>

              `

              : ""

          }


          ${priceHTML}


        </div>


      </div>


      <div class="part-status">

        ${
          isAvailable

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
        isAvailable

          ? `

            <button
              class="report-button"
              onclick="reportUnavailable(
                '${escapeHTML(
                  String(
                    part.id
                  )
                )}'
              )"
            >

              Nicht mehr da

            </button>

          `

          : `

            <button
              class="confirm-button"
              onclick="confirmPart(
                '${escapeHTML(
                  String(
                    part.part_number ||
                    ""
                  )
                )}',
                '${escapeHTML(
                  String(
                    part.id
                  )
                )}'
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
   KATEGORIE ÖFFNEN / SCHLIESSEN
========================================================= */

function toggleCategory(
  button
) {

  if (
    !button
  ) {

    return;

  }


  const folder =
    button.closest(
      ".category-folder"
    );


  if (
    !folder
  ) {

    return;

  }


  folder.classList.toggle(
    "open"
  );

}


/* =========================================================
   FEHLERANZEIGE
========================================================= */

function showError(
  title,
  message
) {

  const container =
    document.getElementById(
      "results"
    );


  if (
    !container
  ) {

    return;

  }


  container.innerHTML = `

    <div class="card error">

      <div class="error-title">

        ${escapeHTML(
          title
        )}

      </div>


      <div>

        ${escapeHTML(
          message
        )}

      </div>

    </div>

  `;

}


/* =========================================================
   CACHE DEBUG
========================================================= */

/*
 * Kann später in der Browser-Konsole benutzt werden:
 *
 * getPartsCacheStatus()
 *
 * Damit können wir sehen, wie viel bereits
 * zwischengespeichert wurde.
 */

function getPartsCacheStatus() {

  return {

    images:
      Object.keys(
        partImageCache
      ).length,

    weights:
      Object.keys(
        partWeightCache
      ).length,

    colors:
      Object.keys(
        partColorCache
      ).length,

    categoryImages:
      window.categoryImageMap
        ? Object.keys(
            window.categoryImageMap
          ).length
        : 0

  };

}


/* =========================================================
   GLOBAL VERFÜGBAR MACHEN
========================================================= */

window.loadParts =
  loadParts;


/* =========================================================
   DEBUG GLOBAL
========================================================= */

window.getPartsCacheStatus =
  getPartsCacheStatus;
