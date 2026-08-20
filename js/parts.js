/* =========================================================
   PARTS
   FabrikTracker
========================================================= */


/* =========================================================
   LADESTATUS / CACHE
========================================================= */

let partsLoading = false;

let categoryImagesLoaded = false;


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
              String(part.part_number) +
              "_" +
              String(part.color_id);


            return [
              key,
              {
                part_num:
                  String(part.part_number),

                color_id:
                  Number(part.color_id)
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


  const imageMap = {};

  const batchSize = 100;


  try {

    const partNumbers = [
      ...new Set(
        combinations.map(
          item =>
            item.part_num
        )
      )
    ];


    for (
      let i = 0;
      i < partNumbers.length;
      i += batchSize
    ) {

      const batch =
        partNumbers.slice(
          i,
          i + batchSize
        );


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


      const rows =
        await req(url);


      (rows || []).forEach(
        row => {

          const key =
            String(
              row.part_num
            ) +
            "_" +
            String(
              row.color_id
            );


          imageMap[key] =
            row.image_url ||
            null;

        }
      );

    }


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
          imageMap[key] ||
          null;

      }
    );


  } catch (
    error
  ) {

    console.warn(
      "Farbabhängige LEGO-Bilder konnten nicht geladen werden:",
      error
    );


    parts.forEach(
      part => {

        part.image_url =
          null;

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
 * Die Bilder werden:
 *
 * 1. Nur EINMAL geladen
 * 2. Parallel abgefragt
 * 3. Danach im Speicher behalten
 *
 * Dadurch werden beim erneuten Laden der Teile
 * keine 76+ einzelnen Requests mehr ausgeführt.
 */

async function loadCategoryImages() {

  /*
   * Bereits geladen?
   * Dann nichts mehr machen.
   */

  if (
    categoryImagesLoaded &&
    window.categoryImageMap
  ) {

    return;

  }


  /*
   * Falls categories.js noch keine
   * CATEGORY_IMAGES enthält, einfach nichts tun.
   */

  if (
    typeof CATEGORY_IMAGES ===
    "undefined"
  ) {

    window.categoryImageMap = {};

    categoryImagesLoaded = true;

    return;

  }


  const configs =
    Object.entries(
      CATEGORY_IMAGES
    );


  if (
    configs.length === 0
  ) {

    window.categoryImageMap = {};

    categoryImagesLoaded = true;

    return;

  }


  const imageMap = {};


  try {

    /*
     * =====================================================
     * ALLE KATEGORIEN PARALLEL LADEN
     * =====================================================
     */

    const requests =
      configs.map(
        async (
          [
            categoryId,
            config
          ]
        ) => {

          if (
            !config ||
            !config.part
          ) {

            return null;

          }


          const partNumber =
            String(
              config.part
            );


          let rows = [];


          /*
           * =================================================
           * EXAKTE FARBE
           * =================================================
           */

          if (
            config.color !== null &&
            config.color !== undefined &&
            config.color !== ""
          ) {

            const exactUrl =
              SUPABASE_URL +
              "/rest/v1/lego_part_colors" +
              "?part_num=eq." +
              encodeURIComponent(
                partNumber
              ) +
              "&color_id=eq." +
              encodeURIComponent(
                String(
                  config.color
                )
              ) +
              "&select=part_num,color_id,image_url" +
              "&limit=1";


            try {

              rows =
                await req(
                  exactUrl
                );

            } catch (
              error
            ) {

              console.warn(
                "Exaktes Kategorie-Bild konnte nicht geladen werden:",
                categoryId,
                error
              );

              rows = [];

            }

          }


          /*
           * =================================================
           * FALLBACK
           * =================================================
           */

          /*
           * Wenn keine Farbe angegeben wurde
           * oder die gewünschte Farbvariante
           * kein Bild besitzt:
           *
           * irgendeine vorhandene Bildvariante
           * desselben Teils nehmen.
           */

          if (
            !Array.isArray(rows) ||
            rows.length === 0 ||
            !rows[0].image_url
          ) {

            const fallbackUrl =
              SUPABASE_URL +
              "/rest/v1/lego_part_colors" +
              "?part_num=eq." +
              encodeURIComponent(
                partNumber
              ) +
              "&image_url=not.is.null" +
              "&select=part_num,color_id,image_url" +
              "&limit=1";


            try {

              rows =
                await req(
                  fallbackUrl
                );

            } catch (
              error
            ) {

              console.warn(
                "Fallback-Kategorie-Bild konnte nicht geladen werden:",
                categoryId,
                error
              );

              rows = [];

            }

          }


          if (
            Array.isArray(rows) &&
            rows.length > 0 &&
            rows[0].image_url
          ) {

            return [
              String(
                categoryId
              ),
              rows[0].image_url
            ];

          }


          return null;

        }
      );


    const results =
      await Promise.all(
        requests
      );


    /*
     * Ergebnisse in Map übernehmen.
     */

    results.forEach(
      result => {

        if (
          !result
        ) {

          return;

        }


        const [
          categoryId,
          imageUrl
        ] =
          result;


        imageMap[
          categoryId
        ] =
          imageUrl;

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
     * Bei einem Fehler NICHT dauerhaft
     * als erfolgreich geladen markieren.
     *
     * So kann später erneut versucht werden.
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


  try {

    const encodedNumbers =
      numbers
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
      await req(url);


    const weightMap = {};


    (weights || []).forEach(
      row => {

        weightMap[
          String(
            row.part_num
          )
        ] =
          Number(
            row.weight_grams
          );

      }
    );


    parts.forEach(
      part => {

        const number =
          String(
            part.part_number || ""
          );


        part.weight_grams =
          weightMap[number] !== undefined
            ? weightMap[number]
            : null;

      }
    );


  } catch (
    error
  ) {

    console.warn(
      "Gewichte konnten nicht geladen werden:",
      error
    );


    parts.forEach(
      part => {

        part.weight_grams =
          null;

      }
    );

  }

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
     * FARBEN LADEN
     * =====================================================
     */

    if (
      parts.length > 0
    ) {

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
        colorIds.length > 0
      ) {

        const colorsUrl =

          SUPABASE_URL +
          "/rest/v1/lego_colors" +

          "?id=in.(" +
          colorIds.join(",") +
          ")" +

          "&select=id,name";


        const colors =
          await supabaseRequest(
            colorsUrl
          );


        const colorMap = {};


        (
          colors || []
        ).forEach(
          color => {

            colorMap[
              color.id
            ] =
              color.name;

          }
        );


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
                colorMap[
                  part.color_id
                ] || "";

            }

          }
        );

      }

    }


    /*
     * =====================================================
     * TEILE-BILDER
     * =====================================================
     */

    if (
      typeof loadImagesForParts ===
      "function"
    ) {

      await loadImagesForParts();

    }


    /*
     * =====================================================
     * KATEGORIE-BILDER
     * =====================================================
     */

    if (
      typeof loadCategoryImages ===
      "function"
    ) {

      await loadCategoryImages();

    }


    /*
     * =====================================================
     * GEWICHTE
     * =====================================================
     */

    if (
      typeof loadWeightsForParts ===
      "function"
    ) {

      await loadWeightsForParts();

    }


    /*
     * =====================================================
     * KATEGORIEN
     * ===================================================== */

    if (
      typeof initializeCategories ===
      "function"
    ) {

      await initializeCategories();

    }


    /*
     * =====================================================
     * ANZEIGE
     * =====================================================
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
   GLOBAL VERFÜGBAR MACHEN
========================================================= */

window.loadParts =
  loadParts;
