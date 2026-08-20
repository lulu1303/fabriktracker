/* =========================================================
   PARTS
   FabrikTracker
========================================================= */


/* =========================================================
   KATEGORIE-BILDER
========================================================= */

/*
 * Repräsentative LEGO-Teilenummern für die Kategorien.
 *
 * Wenn diese Teilenummer in lego_part_colors vorhanden ist,
 * wird deren Bild für die Kategorie verwendet.
 *
 * Falls nicht vorhanden, wird automatisch das erste vorhandene
 * Bild aus der jeweiligen Kategorie verwendet.
 */

const CATEGORY_REPRESENTATIVE_PARTS = {

  /* Grundkategorien */

  1: "3865",       // Baseplates
  3: "3039",       // Bricks Sloped
  4: "3437",       // Duplo / Quatro / Primo
  5: "87079",      // Bricks Special
  6: "43722",      // Bricks Wedged
  7: "3002",       // Containers
  8: "3700",       // Technic Bricks
  9: "3795",       // Plates Special

  11: "3001",      // Bricks – 2x4
  12: "3673",      // Technic Connectors
  13: "3626",      // Minifigs
  14: "3024",      // Plates – 1x1
  15: "87087",     // Tiles Special
  16: "60596",     // Windows and Doors
  17: "65803",     // Gear Parts
  18: "2429",      // Hinges / Arms / Turntables
  19: "3070b",     // Tiles
  20: "3062b",     // Bricks Round and Cones
  21: "2654",      // Plates Round / Curved / Dishes
  22: "19475",     // Pneumatics
  23: "60474",     // Panels
  24: "3069b",     // Other
  25: "32294",     // Technic Steering / Suspension / Engine
  26: "22961",     // Technic Special
  27: "970c00",     // Minifig Accessories
  28: "30167",      // Animals / Creatures
  29: "11214",      // Wheels and Tyres
  30: "79c11",      // Tubes and Hoses
  31: "25269",      // String / Bands / Reels
  32: "30136",      // Bars / Ladders / Fences
  33: "30153",      // Rock
  34: "64567",      // Supports / Girders / Cranes
  35: "2540",       // Transportation - Sea and Air
  36: "30064",      // Transportation - Land
  37: "30602",      // Bricks Curved
  38: "2335",       // Flags / Banners / Signs
  39: "57878",      // Magnets and Holders
  40: "32555",      // Technic Panels
  41: "45300",      // Large Buildable Figures
  42: "6265",       // Belville / Scala / Fabuland
  43: "Znap",       // Znap
  44: "65803",      // Mechanical
  45: "5590",       // Electronics
  46: "3707",       // Technic Axles
  47: "4744",       // Windscreens / Fuselage
  48: "Clikits",     // Clikits
  49: "41765",      // Plates Wedged
  50: "HO",         // HO Scale
  51: "32524",      // Technic Beams
  52: "6589",       // Technic Gears
  53: "3673",       // Technic Pins
  54: "3713",       // Technic Bushes
  55: "32001",      // Technic Beams Special
  56: "48729",      // Tools
  57: "4024",       // Non-Buildable Figures
  58: "3958",       // Stickers
  59: "6141",       // Minifig Heads
  60: "973",         // Minifig Upper Body
  61: "970c00",      // Minifig Lower Body
  62: "35038",       // Minidoll Heads
  63: "9225",        // Minidoll Upper Body
  64: "9226",        // Minidoll Lower Body
  65: "30165",       // Minifig Headwear
  66: "Modulex",
  67: "6143",        // Tiles Round / Curved
  68: "18654",       // Projectiles / Launchers
  69: "64647",       // Energy Effects
  70: "970c00",      // Minifig Hipwear
  71: "10167",       // Minifig Neckwear
  72: "18866",       // Minifig Headwear Accessories
  73: "6157",        // Minifig Shields / Weapons / Tools
  74: "64648",       // Animal / Creature Accessories
  75: "98165",       // Animal / Creature Body Parts

  /*
   * Besonders wichtig:
   *
   * Plants & Trees
   */
  76: "24866",

  77: "99781",       // Non-System Parts
  78: "Pen & Watch"

};


/* =========================================================
   KATEGORIE-BILD CACHE
========================================================= */

let categoryImageMap = {};


/* =========================================================
   HILFSFUNKTION:
   BILD AUS TEILEN SUCHEN
========================================================= */

function findPartImage(
  partNumber
) {

  if (
    !partNumber
  ) {

    return null;

  }


  const target =
    String(
      partNumber
    ).toLowerCase();


  /*
   * Zuerst exakte Teilenummer suchen.
   */

  const found =
    parts.find(
      part => {

        return (
          String(
            part.part_number || ""
          ).toLowerCase() ===
          target
        ) &&
        part.image_url
      }
    );


  if (
    found &&
    found.image_url
  ) {

    return found.image_url;

  }


  return null;

}


/* =========================================================
   KATEGORIE-BILDER LADEN
========================================================= */

async function loadCategoryImages() {

  categoryImageMap = {};


  /*
   * Keine Teile vorhanden.
   */
  if (
    !Array.isArray(parts) ||
    parts.length === 0
  ) {

    return;

  }


  /*
   * =====================================================
   * 1. ZUERST BILDER AUS DEN BEREITS GELADENEN TEILEN
   * =====================================================
   */

  Object.keys(
    CATEGORY_REPRESENTATIVE_PARTS
  ).forEach(
    categoryId => {

      const representative =
        CATEGORY_REPRESENTATIVE_PARTS[
          categoryId
        ];


      /*
       * Nur echte Teilenummern verwenden.
       *
       * Sonderkategorien wie Znap / Clikits /
       * Modulex / HO bekommen später einen Fallback.
       */

      const image =
        findPartImage(
          representative
        );


      if (
        image
      ) {

        categoryImageMap[
          categoryId
        ] =
          image;

      }

    }
  );


  /*
   * =====================================================
   * 2. FALLBACK:
   * ERSTES BILD AUS DER JEWEILIGEN KATEGORIE
   * =====================================================
   */

  if (
    typeof groupPartsByRebrickableCategory !==
    "function"
  ) {

    return;

  }


  const groups =
    groupPartsByRebrickableCategory(
      parts
    );


  groups.forEach(
    group => {

      if (
        group.id === null ||
        group.id === undefined
      ) {

        return;

      }


      const categoryId =
        String(
          group.id
        );


      /*
       * Haben wir bereits ein
       * repräsentatives Bild?
       */

      if (
        categoryImageMap[
          categoryId
        ]
      ) {

        return;

      }


      /*
       * Erstes Teil mit Bild suchen.
       */

      const partWithImage =
        group.parts.find(
          part =>
            part.image_url
        );


      if (
        partWithImage &&
        partWithImage.image_url
      ) {

        categoryImageMap[
          categoryId
        ] =
          partWithImage.image_url;

      }

    });

}


/* =========================================================
   KATEGORIE-BILD HTML
========================================================= */

function renderCategoryImage(
  categoryId
) {

  const image =
    categoryImageMap[
      String(
        categoryId
      )
    ] || "";


  if (
    image
  ) {

    return `

      <span class="category-icon">

        <img
          src="${escapeHTML(
            image
          )}"
          alt=""
          class="category-image"
          loading="lazy"
        >

      </span>

    `;

  }


  /*
   * Fallback, wenn kein Bild vorhanden ist.
   */

  return `

    <span class="category-icon">

      🧱

    </span>

  `;

}


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
     */

    if (
      typeof initializeCategories ===
      "function"
    ) {

      await initializeCategories();

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

                  ${renderCategoryImage(
                    categoryId
                  )}


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


/* =========================================================
   START
========================================================= */

window.addEventListener(
  "load",
  function() {

    if (
      typeof window.loadParts ===
      "function"
    ) {

      window.loadParts();

    }

  }
);
