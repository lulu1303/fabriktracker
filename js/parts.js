/* =========================================================
   PARTS
   FabrikTracker
========================================================= */


/* =========================================================
   DATEN
========================================================= */

let parts = [];


/* =========================================================
   TEILE LADEN
========================================================= */

async function loadParts() {

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
     * Alle vorhandenen gemeldeten Teile laden.
     *
     * category_id wird automatisch mitgeladen,
     * weil wir select=* verwenden.
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
     * BILDER
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
     * =====================================================
     *
     * Sicherstellen, dass die Rebrickable-Kategorien
     * geladen wurden.
     */

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

    /*
     * Fallback, falls categories.js
     * noch nicht geladen wurde.
     */

    const map =
      new Map();


    list.forEach(
      part => {

        const key =
          part.category_id ??
          null;


        if (
          !map.has(
            key
          )
        ) {

          map.set(
            key,
            {

              id:
                key,

              name:
                "Sonstige",

              parts:
                []

            }
          );

        }


        map
          .get(
            key
          )
          .parts
          .push(
            part
          );

      }
    );


    groups =
      Array.from(
        map.values()
      );

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
                    🧱
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
   START
========================================================= */

window.addEventListener(
  "load",
  function() {

    /*
     * Nur starten, wenn loadParts
     * nicht bereits von einer anderen
     * Startlogik aufgerufen wird.
     */
    if (
      typeof loadParts ===
      "function"
    ) {

      loadParts();

    }

  }
);
