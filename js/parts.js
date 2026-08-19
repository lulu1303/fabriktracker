/* =========================================================
   PARTS
========================================================= */

function relevance(p, q) {

  q = norm(q);

  let n =
    norm(p.name);

  let num =
    norm(
      p.part_num ||
      p.part_number
    );

  let c =
    norm(p.category);

  let s = 0;


  if (dimensionQuery(q)) {

    if (!exactDims(p, q))
      return 1e9;

    s -= 5000;


    if (/\bplate\b/.test(q))
      s +=
        n.includes("plate")
          ? -500
          : 100;


    if (/\btile\b/.test(q))
      s +=
        n.includes("tile")
          ? -500
          : 100;


    if (/\bbrick\b/.test(q))
      s +=
        n.includes("brick")
          ? -500
          : 100;

  } else {

    if (num === q)
      s -= 10000;

    else if (num.startsWith(q))
      s -= 5000;

    else if (num.includes(q))
      s -= 3000;


    if (n === q)
      s -= 2000;

    else if (n.startsWith(q))
      s -= 800;

    else if (n.includes(q))
      s -= 300;

  }


  if (
    n.includes("duplo") ||
    c.includes("duplo")
  )
    s += 3000;


  if (
    n.includes("education") ||
    c.includes("education")
  )
    s += 2000;


  if (
    /printed|print|pattern|decorated|decoration/.test(n)
  )
    s += 1000;


  if (
    n.includes("modified") ||
    n.includes("assembly")
  )
    s += 500;


  if (
    n.includes("brick") ||
    c === "11"
  )
    s -= 80;


  if (n.includes("plate"))
    s -= 70;


  if (n.includes("tile"))
    s -= 60;


  return s;
}


/* =========================================================
   TEILE LADEN
========================================================= */

async function loadParts() {

  let box =
    document.getElementById(
      "results"
    );


  box.innerHTML =
    '<div class="card loading">Teile werden geladen...</div>';


  try {

    parts =
      await req(
        PARTS_URL +
        "?select=*&order=created_at.desc"
      ) || [];


    let ids =
      [
        ...new Set(
          parts
            .map(
              p => p.color_id
            )
            .filter(
              x => x != null
            )
        )
      ];


    if (ids.length) {

      let colors =
        await req(
          SUPABASE_URL +
          "/rest/v1/lego_colors?id=in." +
          ids.join(",") +
          "&select=id,name"
        ) || [];


      let map = {};


      colors.forEach(
        c =>
          map[c.id] =
            c.name
      );


      parts.forEach(
        p =>
          p.color_name =
            Number(
              p.color_id
            ) === 9999
              ? "Not Applicable"
              : map[p.color_id] || ""
      );

    }


    await loadImages();

    await loadWeights();

    displayParts(parts);


  } catch (e) {

    box.innerHTML =
      '<div class="card error"><b>Supabase-Fehler beim Laden</b><br>' +
      esc(e.message) +
      '</div>';

  }

}


/* =========================================================
   BILDER LADEN
========================================================= */

async function loadImages() {

  if (!parts.length)
    return;


  let nums =
    [
      ...new Set(
        parts
          .map(
            p =>
              String(
                p.part_number || ""
              )
          )
          .filter(Boolean)
      )
    ];


  let map = {};


  try {

    for (
      let i = 0;
      i < nums.length;
      i += 100
    ) {

      let b =
        nums.slice(
          i,
          i + 100
        );


      let q =
        b
          .map(
            x =>
              `"${x.replace(
                /"/g,
                '\\"'
              )}"`
          )
          .join(",");


      let rows =
        await req(
          SUPABASE_URL +
          "/rest/v1/lego_part_colors?part_num=in.(" +
          q +
          ")&select=part_num,color_id,image_url"
        ) || [];


      rows.forEach(
        r =>
          map[
            r.part_num +
            "_" +
            r.color_id
          ] =
            r.image_url
      );

    }


    parts.forEach(
      p =>
        p.image_url =
          map[
            p.part_number +
            "_" +
            p.color_id
          ] || null
    );


  } catch {

    parts.forEach(
      p =>
        p.image_url =
          null
    );

  }

}


/* =========================================================
   GEWICHTE LADEN
========================================================= */

async function loadWeights() {

  if (!parts.length)
    return;


  let nums =
    [
      ...new Set(
        parts
          .map(
            p =>
              String(
                p.part_number || ""
              )
          )
          .filter(Boolean)
      )
    ];


  try {

    let q =
      nums
        .map(
          x =>
            `"${x.replace(
              /"/g,
              '\\"'
            )}"`
        )
        .join(",");


    let rows =
      await req(
        WEIGHTS_URL +
        "?part_num=in.(" +
        q +
        ")" +
        "&select=part_num,weight_grams"
      ) || [];


    let m = {};


    rows.forEach(
      r =>
        m[r.part_num] =
          +r.weight_grams
    );


    parts.forEach(
      p =>
        p.weight_grams =
          m[p.part_number] ?? null
    );


  } catch {

    parts.forEach(
      p =>
        p.weight_grams =
          null
    );

  }

}


/* =========================================================
   TEIL RENDERN
========================================================= */

function render(p) {

  let n =
    esc(p.part_number);

  let name =
    esc(p.name);

  let color =
    esc(
      Number(p.color_id) === 9999
        ? "Not Applicable"
        : p.color_name || ""
    );

  let w =
    +p.weight_grams;

  let has =
    w > 0;

  let normal =
    has
      ? w * PRICE_PER_GRAM
      : null;

  let disc =
    has
      ? normal * (1 - DISCOUNT)
      : null;

  let available =
    p.is_available !== false;

  let ci =
    cat(
      p.category,
      p.name
    );

  let img =
    p.image_url
      ? esc(p.image_url)
      : "";

  let last =
    date(
      p.last_seen_at ||
      p.created_at
    );


  return `
    <div class="part-card ${available ? "" : "unavailable"}">

      <div class="part-main">

        <div class="part-image-wrapper">

          ${
            img
              ? `
                <img
                  class="part-image"
                  src="${img}"
                  alt="LEGO ${n}"
                  loading="lazy"
                  onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
                >

                <div
                  class="part-image-fallback"
                  style="display:none"
                >
                  🧱<br>
                  Kein Bild verfügbar
                </div>
              `
              : `
                <div class="part-image-fallback">
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
                LEGO ${n}
              </div>

              <div class="part-name">
                ${name} · ${esc(ci.name)}
              </div>

            </div>


            <div
              class="${available ? "available" : "not-available"}"
            >
              ● ${available ? "Verfügbar" : "Nicht verfügbar"}
            </div>

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
              has
                ? `
                  <div class="price-per-piece">

                    ${euro(disc)}

                    <span
                      style="
                        font-size:12px;
                        color:#777
                      "
                    >
                      mit 20 % Rabatt
                    </span>

                  </div>


                  <div class="price-row">

                    <div>
                      Normal:
                      <strong>
                        ${euro(normal)}
                      </strong>
                    </div>


                    <div class="price-discount">
                      −20 %:
                      <strong>
                        ${euro(disc)}
                      </strong>
                    </div>

                  </div>


                  <div class="weight">

                    ⚖️
                    ${w.toLocaleString(
                      "de-DE",
                      {
                        maximumFractionDigits: 3
                      }
                    )}
                    g · 11 €/100 g

                  </div>
                `
                : `
                  <div style="color:#999">
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
          last
            ? `
              <br>
              🕐 Zuletzt als vorhanden gemeldet:
              ${esc(last)}
            `
            : ""
        }

        <br>

        📂 ${esc(ci.name)}


        <div
          class="
            status-line
            ${available
              ? "available-status"
              : "unavailable-status"}
          "
        >
          ${
            available
              ? "✓ Dieses Teil wurde zuletzt als verfügbar gemeldet."
              : "⚠️ Dieses Teil wurde zuletzt als nicht verfügbar gemeldet."
          }
        </div>

      </div>


      ${
        available
          ? `
            <button
              class="secondary confirm"
              onclick="confirmPart(
                '${esc(p.part_number)}',
                '${esc(p.id)}'
              )"
            >
              👍 Ich habe dieses Teil gesehen
            </button>

            <button
              class="danger unavailable-button"
              onclick="reportUnavailable(
                '${esc(p.id)}'
              )"
            >
              ❌ Teil ist nicht mehr da
            </button>
          `
          : `
            <button
              class="success confirm"
              onclick="confirmPart(
                '${esc(p.part_number)}',
                '${esc(p.id)}'
              )"
            >
              👍 Ich habe dieses Teil gesehen
            </button>
          `
      }


      <button
        class="admin-delete"
        onclick="adminDeletePart(
          '${esc(p.id)}',
          '${esc(p.part_number)}',
          '${esc(p.name)}'
        )"
      >
        🔒 Admin
      </button>

    </div>
  `;
}


/* =========================================================
   TEILE ANZEIGEN
========================================================= */

function displayParts(list) {

  let box =
    document.getElementById(
      "results"
    );


  if (!list.length) {

    box.innerHTML =
      '<div class="card empty">Keine passenden Teile gefunden.</div>';

    return;
  }


  let groups = {};


  list.forEach(
    p => {

      let c =
        cat(
          p.category,
          p.name
        );


      (
        groups[c.key] ??=
        {
          info: c,
          parts: []
        }
      )
        .parts
        .push(p);

    }
  );


  let order =
    [
      "bricks",
      "plates",
      "tiles",
      "slopes",
      "technic",
      "minifigs",
      "wheels",
      "other"
    ];


  box.innerHTML =
    Object.keys(groups)
      .sort(
        (a, b) =>
          order.indexOf(a) -
          order.indexOf(b)
      )
      .map(
        (k, i) => {

          let g =
            groups[k];


          return `
            <div
              class="category-folder ${i ? "" : "open"}"
            >

              <button
                class="category-header"
                onclick="
                  this.parentElement
                    .classList
                    .toggle('open')
                "
              >

                <div class="category-left">

                  <span class="category-icon">
                    ${g.info.icon}
                  </span>

                  <span class="category-name">
                    ${g.info.name}
                  </span>

                  <span class="category-count">
                    ${g.parts.length}
                  </span>

                </div>


                <span class="category-arrow">
                  ▶
                </span>

              </button>


              <div class="category-content">

                ${g.parts
                  .map(render)
                  .join("")}

              </div>

            </div>
          `;
        }
      )
      .join("");
}
