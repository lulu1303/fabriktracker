/* =========================================================
   KATEGORIE
========================================================= */

function getCategoryInfo(
  category,
  name
) {

  const categoryText =
    String(
      category || ""
    ).toLowerCase();


  const text =
    (
      String(category || "") +
      " " +
      String(name || "")
    ).toLowerCase();


  if (
    categoryText === "11"
  ) {

    return {

      key: "bricks",

      name: "Bricks",

      icon: "🧱"

    };

  }


  if (
    text.includes("plate")
  ) {

    return {

      key: "plates",

      name: "Plates",

      icon: "▰"

    };

  }


  if (
    text.includes("tile")
  ) {

    return {

      key: "tiles",

      name: "Tiles",

      icon: "▫️"

    };

  }


  if (
    text.includes("brick")
  ) {

    return {

      key: "bricks",

      name: "Bricks",

      icon: "🧱"

    };

  }


  if (
    text.includes("slope") ||
    text.includes("wedge")
  ) {

    return {

      key: "slopes",

      name: "Slopes",

      icon: "🔺"

    };

  }


  if (
    text.includes("technic")
  ) {

    return {

      key: "technic",

      name: "Technic",

      icon: "⚙️"

    };

  }


  if (
    text.includes("minifig")
  ) {

    return {

      key: "minifigs",

      name: "Minifiguren",

      icon: "👤"

    };

  }


  if (
    text.includes("wheel") ||
    text.includes("tire")
  ) {

    return {

      key: "wheels",

      name: "Räder & Reifen",

      icon: "⚫"

    };

  }


  return {

    key: "other",

    name: "Sonstige",

    icon: "🧩"

  };

}


/* =========================================================
   BILDER LADEN
========================================================= */

async function loadImagesForParts() {

  if (
    !parts ||
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
              `"${String(
                number
              ).replace(
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
        await supabaseRequest(
          url
        );


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


  } catch (error) {

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
    !parts ||
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
      await supabaseRequest(
        url
      );


    const weightMap = {};


    (
      weights || []
    ).forEach(
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


        if (
          weightMap[number] !==
          undefined
        ) {

          part.weight_grams =
            weightMap[number];

        } else {

          part.weight_grams =
            null;

        }

      }
    );


  } catch (error) {

    console.warn(
      "Gewichte konnten nicht geladen werden:",
      error
    );


    parts.forEach(
      part =>
        part.weight_grams = null
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


  container.innerHTML = `

    <div class="card loading">
      Teile werden geladen...
    </div>

  `;


  try {

    const data =
      await supabaseRequest(

        PARTS_URL +

        "?select=*" +

        "&order=created_at.desc"

      );


    parts =
      data || [];


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
              Number(part.color_id) === 9999
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


    await loadImagesForParts();

    await loadWeightsForParts();

    displayParts(
      parts
    );


  } catch (error) {

    console.error(
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
   EIN TEIL RENDERN
========================================================= */

function renderPart(
  part
) {

  const number =
    escapeHTML(
      part.part_number || ""
    );


  const name =
    escapeHTML(
      part.name || ""
    );


  const color =
    escapeHTML(
      part.color_name || ""
    );


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
    hasWeight
  ) {

    normalPrice =
      weight *
      PRICE_PER_GRAM;


    discountPrice =
      normalPrice *
      (1 - DISCOUNT);

  }


  const isAvailable =
    part.is_available !== false;


  const lastSeen =
    part.last_seen_at ||
    part.created_at ||
    null;


  const lastSeenFormatted =
    formatDate(
      lastSeen
    );


  const categoryInfo =
    getCategoryInfo(
      part.category,
      part.name
    );


  const imageUrl =
    part.image_url ||
    "";


  const safeImageUrl =
    imageUrl
      ? escapeHTML(
          imageUrl
        )
      : "";


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
                  onerror="
                    this.style.display='none';
                    this.nextElementSibling.style.display='block';
                  "
                >

                <div
                  class="part-image-fallback"
                  style="display:none;"
                >
                  🧱<br>
                  Kein Bild verfügbar
                </div>

              `

              : `

                <div
                  class="part-image-fallback"
                  style="display:block;"
                >
                  🧱<br>
                  Kein Bild verfügbar
                </div>

              `
          }

        </div>


        <div class="part-info">

          <div class="part-header">

            <div>

              <div class="part-number">
                LEGO ${number}
              </div>

              <div class="part-name">

                ${name}

                ${
                  categoryInfo
                    ? " · " +
                      escapeHTML(
                        categoryInfo.name
                      )
                    : ""
                }

              </div>

            </div>


            ${
              isAvailable

                ? `

                  <div class="available">
                    ● Verfügbar
                  </div>

                `

                : `

                  <div class="not-available">
                    ● Nicht verfügbar
                  </div>

                `
            }

          </div>


          ${
            color

              ? `

                <div class="part-color">
                  🎨 ${color}
                </div>

              `

              : ""

          }


          <div class="price-box">

            <div class="price-title">
              Preis pro Stein
            </div>


            ${
              hasWeight

                ? `

                  <div class="price-per-piece">

                    ${formatEuro(
                      discountPrice
                    )}

                    <span
                      style="
                        font-size:12px;
                        color:#777;
                        font-weight:600;
                      "
                    >
                      mit 20 % Rabatt
                    </span>

                  </div>


                  <div class="price-row">

                    <div class="price-normal">

                      Normal:

                      <strong>
                        ${formatEuro(
                          normalPrice
                        )}
                      </strong>

                    </div>


                    <div class="price-discount">

                      −20 %:

                      <strong>
                        ${formatEuro(
                          discountPrice
                        )}
                      </strong>

                    </div>

                  </div>


                  <div class="weight">

                    ⚖️

                    ${weight.toLocaleString(
                      "de-DE",
                      {
                        maximumFractionDigits: 3
                      }
                    )}

                    g

                    · 11 €/100 g

                  </div>

                `

                : `

                  <div
                    style="
                      color:#999;
                      font-size:14px;
                    "
                  >
                    ⚖️ Gewicht noch nicht hinterlegt
                  </div>

                `
            }

          </div>

        </div>

      </div>


      <div class="details">

        📍 LEGO Fabrik Günzburg

        ${
          lastSeenFormatted

            ? `

              <br>

              🕐 Zuletzt als vorhanden gemeldet:

              ${escapeHTML(
                lastSeenFormatted
              )}

            `

            : ""

        }


        ${
          categoryInfo

            ? `

              <br>

              📂 ${escapeHTML(
                categoryInfo.name
              )}

            `

            : ""

        }


        ${
          !isAvailable

            ? `

              <div
                class="
                  status-line
                  unavailable-status
                "
              >

                ⚠️ Dieses Teil wurde zuletzt
                als nicht verfügbar gemeldet.

              </div>

            `

            : `

              <div
                class="
                  status-line
                  available-status
                "
              >

                ✓ Dieses Teil wurde zuletzt
                als verfügbar gemeldet.

              </div>

            `

        }

      </div>


      ${
        isAvailable

          ? `

            <button
              class="secondary confirm"
              onclick="confirmPart('${escapeHTML(
                part.part_number || ""
              )}', '${escapeHTML(
                part.id || ""
              )}')"
            >
              👍 Ich habe dieses Teil gesehen
            </button>


            <button
              class="danger unavailable-button"
              onclick="reportUnavailable('${escapeHTML(
                part.id || ""
              )}')"
            >
              ❌ Teil ist nicht mehr da
            </button>

          `

          : `

            <button
              class="success confirm"
              onclick="confirmPart('${escapeHTML(
                part.part_number || ""
              )}', '${escapeHTML(
                part.id || ""
              )}')"
            >
              👍 Ich habe dieses Teil gesehen
            </button>

          `

      }


      <button
        class="admin-delete"
        onclick="adminDeletePart('${escapeHTML(
          part.id || ""
        )}', '${escapeHTML(
          part.part_number || ""
        )}', '${escapeHTML(
          part.name || ""
        )}')"
      >
        🔒 Admin
      </button>


    </div>

  `;

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
    !list ||
    list.length === 0
  ) {

    container.innerHTML = `

      <div class="card empty">

        Keine passenden Teile gefunden.

      </div>

    `;

    return;

  }


  const groups = {};


  list.forEach(
    part => {

      const category =
        getCategoryInfo(
          part.category,
          part.name
        );


      if (
        !groups[
          category.key
        ]
      ) {

        groups[
          category.key
        ] = {

          info: category,

          parts: []

        };

      }


      groups[
        category.key
      ]
        .parts
        .push(
          part
        );

    }
  );


  const categoryOrder = [

    "bricks",
    "plates",
    "tiles",
    "slopes",
    "technic",
    "minifigs",
    "wheels",
    "other"

  ];


  const sortedKeys =

    Object.keys(
      groups
    )

    .sort(
      (a, b) => {

        const indexA =
          categoryOrder.indexOf(
            a
          );


        const indexB =
          categoryOrder.indexOf(
            b
          );


        return (

          (
            indexA === -1
              ? 999
              : indexA
          )

          -

          (
            indexB === -1
              ? 999
              : indexB
          )

        );

      }
    );


  container.innerHTML =

    sortedKeys

      .map(
        (
          key,
          index
        ) => {

          const group =
            groups[key];


          return `

            <div
              class="category-folder ${
                index === 0
                  ? "open"
                  : ""
              }"
            >

              <button
                class="category-header"
                onclick="toggleCategory(this)"
              >

                <div class="category-left">

                  <span class="category-icon">
                    ${group.info.icon}
                  </span>


                  <span class="category-name">
                    ${escapeHTML(
                      group.info.name
                    )}
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
