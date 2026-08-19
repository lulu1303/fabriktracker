/* =========================================================
   REPORT / MELDEFORMULAR
========================================================= */

function relevance(
  part,
  query
) {

  const q =
    norm(query);


  const name =
    String(
      part.name || ""
    )
      .toLowerCase();


  const number =
    String(
      part.part_num || ""
    )
      .toLowerCase();


  const category =
    String(
      part.category || ""
    )
      .toLowerCase();


  let score =
    1000;


  if (
    number === q
  ) {

    score -=
      2000;

  }


  const words =
    q
      .split(/\s+/)
      .filter(Boolean);


  let matches =
    0;


  words.forEach(
    word => {

      if (
        name.includes(
          word
        )
      ) {

        matches++;

      }

    }
  );


  score -=
    matches * 80;


  if (
    name.includes("brick") ||
    category.includes("brick")
  ) {

    score -= 150;

  }


  if (
    name.includes("plate") ||
    category.includes("plate")
  ) {

    score -= 150;

  }


  if (
    name.includes("tile") ||
    category.includes("tile")
  ) {

    score -= 150;

  }


  const cleanName =
    name
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const normalizedQuery =
    norm(q)
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (
    cleanName ===
    normalizedQuery
  ) {

    score -=
      1000;

  }


  const d =
    dims(q);


  if (
    d
  ) {

    const pd =
      dims(name);


    if (
      pd &&
      pd.a === d.a &&
      pd.b === d.b
    ) {

      score -=
        500;

    }

  }


  if (
    /^brick\s+\d+\s*x\s*\d+$/i.test(
      cleanName
    )
  ) {

    score -=
      600;

  }


  if (
    /^plate\s+\d+\s*x\s*\d+$/i.test(
      cleanName
    )
  ) {

    score -=
      600;

  }


  if (
    /^tile\s+\d+\s*x\s*\d+/i.test(
      cleanName
    )
  ) {

    score -=
      600;

  }


  if (
    name.includes("modified")
  ) {

    score += 500;

  }


  if (
    name.includes("special")
  ) {

    score += 500;

  }


  if (
    name.includes("assembly")
  ) {

    score += 500;

  }


  if (
    name.includes("with ")
  ) {

    score += 450;

  }


  if (
    name.includes("printed") ||
    name.includes("print") ||
    name.includes("pattern") ||
    name.includes("decorated") ||
    name.includes("decoration")
  ) {

    score += 700;

  }


  if (
    name.includes("legoland") ||
    name.includes("resort") ||
    name.includes("fabrik")
  ) {

    score += 900;

  }


  if (
    name.includes("duplo") ||
    category.includes("duplo")
  ) {

    score += 1500;

  }


  if (
    name.includes("education") ||
    category.includes("education")
  ) {

    score += 1200;

  }


  return score;

}


function openReportForm() {

  let a =
    document.getElementById(
      "reportArea"
    );


  if (a.innerHTML) {

    a.innerHTML = "";

    return;

  }


  a.innerHTML = `
    <div class="report-form">

      <div class="field">

        <label>
          Teilenummer oder Name
        </label>

        <input
          id="partSearchInput"
          autocomplete="off"
          placeholder="z.B. 3001, 2431pr0232 oder Brick 2 x 4"
          oninput="searchLegoParts()"
        >

        <div
          id="partSuggestions"
          class="suggestions"
          style="display:none"
        ></div>

        <div id="selectedPart"></div>

        <div
          id="partSearchError"
          class="search-error"
        ></div>

      </div>


      <div class="field">

        <label>
          Farbe
        </label>

        <select
          id="colorSelect"
          disabled
        >
          <option value="">
            Erst Teil auswählen...
          </option>
        </select>

      </div>


      <div class="form-buttons">

        <button
          class="secondary"
          onclick="
            document.getElementById('reportArea').innerHTML='';
            selectedPart=null
          "
        >
          Abbrechen
        </button>


        <button
          id="submitReportButton"
          class="primary"
          onclick="submitReport()"
          disabled
        >
          Teil melden
        </button>

      </div>

    </div>
  `;

}


/* =========================================================
   LEGO-TEILE SUCHEN
========================================================= */

function searchLegoParts() {

  clearTimeout(
    searchTimer
  );


  let q =
    document
      .getElementById(
        "partSearchInput"
      )
      .value
      .trim();


  selectedPart =
    null;


  document.getElementById(
    "selectedPart"
  ).innerHTML =
    "";


  document.getElementById(
    "colorSelect"
  ).disabled =
    true;


  document.getElementById(
    "submitReportButton"
  ).disabled =
    true;


  if (
    q.length < 2
  ) {

    document.getElementById(
      "partSuggestions"
    ).style.display =
      "none";

    return;

  }


  searchTimer =
    setTimeout(
      () =>
        fetchSuggestions(q),
      250
    );

}


/* =========================================================
   VORSCHLÄGE LADEN
========================================================= */

async function fetchSuggestions(q) {

  let box =
    document.getElementById(
      "partSuggestions"
    );


  let err =
    document.getElementById(
      "partSearchError"
    );


  box.style.display =
    "block";


  box.innerHTML =
    '<div class="suggestion">🔎 Suche Teile...</div>';


  err.textContent =
    "";


  try {

    let results = [];


    let s =
      norm(q);


    let looks =
      /^[a-z0-9._-]+$/i.test(s) &&
      !dimensionQuery(s);


    /*
      Exakte Teilenummer
    */

    if (looks) {

      results =
        await req(
          LEGO_PARTS_URL +
          "?part_num=eq." +
          encodeURIComponent(q) +
          "&select=part_num,name,category" +
          "&limit=20"
        ) || [];

    }


    /*
      Teilenummer enthält Suchbegriff
    */

    if (
      !results.length &&
      looks
    ) {

      results =
        await req(
          LEGO_PARTS_URL +
          "?part_num=ilike." +
          encodeURIComponent(
            "%" + q + "%"
          ) +
          "&select=part_num,name,category" +
          "&limit=100"
        ) || [];

    }


    /*
      Suche über Namen
    */

    if (
      !results.length
    ) {

      let n =
        s
          .replace(
            /\s*x\s*/g,
            " x "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();


      results =
        await req(
          LEGO_PARTS_URL +
          "?name=ilike." +
          encodeURIComponent(
            "%" + n + "%"
          ) +
          "&select=part_num,name,category" +
          "&limit=1000"
        ) || [];

    }


    /*
      Maßsuche
    */

    if (
      dimensionQuery(q)
    ) {

      results =
        results.filter(
          p =>
            exactDims(
              p,
              q
            )
        );

    }


    /*
      Relevanzsortierung
    */

    results.sort(
      (a, b) =>
        relevance(
          a,
          q
        ) -
        relevance(
          b,
          q
        )
    );


    /*
      Maximal 30 Vorschläge
    */

    results =
      results.slice(
        0,
        30
      );


    if (
      !results.length
    ) {

      box.innerHTML =
        '<div class="suggestion">❌ Kein passendes LEGO Teil gefunden.</div>';

      return;

    }


    box.innerHTML =
      results
        .map(
          p =>
            `
              <div
                class="suggestion"
                onclick='selectLegoPart(${JSON.stringify(p)})'
              >

                <div class="suggestion-number">
                  LEGO ${esc(
                    p.part_num
                  )}
                </div>

                <div class="suggestion-name">
                  ${esc(
                    p.name
                  )}
                  ·
                  ${esc(
                    cat(
                      p.category,
                      p.name
                    ).name
                  )}
                </div>

              </div>
            `
        )
        .join("");


  } catch (e) {

    box.innerHTML =
      "";


    err.textContent =
      "❌ Fehler bei der Teilesuche: " +
      e.message;

  }

}


/* =========================================================
   TEIL AUSWÄHLEN
========================================================= */

async function selectLegoPart(p) {

  selectedPart =
    p;


  document.getElementById(
    "partSearchInput"
  ).value =
    p.part_num +
    " – " +
    p.name;


  document.getElementById(
    "partSuggestions"
  ).style.display =
    "none";


  document.getElementById(
    "selectedPart"
  ).innerHTML =

    `
      <div class="selected-part">

        ✅ LEGO
        ${esc(p.part_num)}
        –
        ${esc(p.name)}

      </div>
    `;


  await loadColors(
    p.part_num
  );

}


/* =========================================================
   FARBEN LADEN
========================================================= */

async function loadColors(num) {

  let sel =
    document.getElementById(
      "colorSelect"
    );


  let btn =
    document.getElementById(
      "submitReportButton"
    );


  sel.disabled =
    true;


  sel.innerHTML =
    `
      <option value="">
        Farben werden geladen...
      </option>
    `;


  btn.disabled =
    true;


  try {

    let pc =
      await req(
        SUPABASE_URL +
        "/rest/v1/lego_part_colors" +
        "?select=color_id" +
        "&part_num=eq." +
        encodeURIComponent(num)
      ) || [];


    let ids =
      [
        ...new Set(
          pc
            .map(
              x =>
                x.color_id
            )
            .filter(
              x =>
                x != null
            )
        )
      ];


    if (
      !ids.length
    ) {

      sel.innerHTML =
        `
          <option value="">
            Keine Farben gefunden
          </option>
        `;

      return;

    }


    let colors =
      await req(
        SUPABASE_URL +
        "/rest/v1/lego_colors" +
        "?id=in." +
        encodeURIComponent(
          "(" +
          ids.join(",") +
          ")"
        ) +
        "&select=id,name" +
        "&order=id.asc"
      ) || [];


    /*
      Not Applicable immer hinzufügen,
      falls ID 9999 vorhanden ist,
      aber noch nicht aus der DB kam.
    */

    if (
      ids.some(
        x =>
          Number(x) === 9999
      ) &&
      !colors.some(
        x =>
          Number(x.id) === 9999
      )
    ) {

      colors.push(
        {
          id: 9999,
          name: "Not Applicable"
        }
      );

    }


    sel.innerHTML =
      `
        <option value="">
          Farbe auswählen...
        </option>
      `;


    colors
      .sort(
        (a, b) =>
          Number(a.id) === 9999
            ? 1
            : Number(b.id) === 9999
              ? -1
              : Number(a.id) -
                Number(b.id)
      )
      .forEach(
        c => {

          let o =
            document.createElement(
              "option"
            );


          o.value =
            c.id;


          o.textContent =
            Number(c.id) === 9999
              ? "Not Applicable"
              : c.name;


          sel.appendChild(
            o
          );

        }
      );


    sel.disabled =
      false;


    sel.onchange =
      () =>
        btn.disabled =
          !sel.value;


  } catch (e) {

    sel.innerHTML =
      `
        <option value="">
          Fehler beim Laden der Farben
        </option>
      `;

  }

}


/* =========================================================
   TEIL MELDEN
========================================================= */

async function submitReport() {

  let btn =
    document.getElementById(
      "submitReportButton"
    );


  let sel =
    document.getElementById(
      "colorSelect"
    );


  if (
    !selectedPart
  ) {

    alert(
      "Bitte zuerst ein LEGO Teil auswählen."
    );

    return;

  }


  if (
    !sel.value
  ) {

    alert(
      "Bitte zuerst eine Farbe auswählen."
    );

    return;

  }


  btn.disabled =
    true;


  btn.textContent =
    "Wird gespeichert...";


  try {

    await req(
      PARTS_URL,
      {
        method: "POST",

        headers: {
          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify(
            {
              part_number:
                selectedPart.part_num,

              name:
                selectedPart.name,

              category:
                selectedPart.category ||
                "",

              color_id:
                Number(
                  sel.value
                ),

              is_available:
                true,

              last_seen_at:
                new Date()
                  .toISOString()
            }
          )
      }
    );


    alert(
      "Danke! Das Teil wurde erfolgreich gemeldet. 🧱"
    );


    document.getElementById(
      "reportArea"
    ).innerHTML =
      "";


    selectedPart =
      null;


    await window.loadParts();


  } catch (e) {

    alert(
      "Das Teil konnte leider nicht gespeichert werden.\n\n" +
      e.message
    );


  } finally {

    btn.disabled =
      false;


    btn.textContent =
      "Teil melden";

  }

}


/* =========================================================
   TEIL NICHT MEHR VERFÜGBAR
========================================================= */

async function reportUnavailable(id) {

  let p =
    parts.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (
    !p ||
    !confirm(
      "Bist du sicher, dass dieses Teil nicht mehr da ist?\n\n" +
      "LEGO " +
      p.part_number +
      "\n" +
      p.name
    )
  )
    return;


  try {

    await req(
      PARTS_URL +
      "?id=eq." +
      encodeURIComponent(id),
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify(
            {
              is_available:
                false
            }
          )
      }
    );


    p.is_available =
      false;


    displayParts(
      parts
    );


  } catch (e) {

    alert(
      "Der Status konnte leider nicht geändert werden.\n\n" +
      e.message
    );

  }

}


/* =========================================================
   TEIL BESTÄTIGEN
========================================================= */

async function confirmPart(
  number,
  id
) {

  let p =
    parts.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!p)
    return;


  let now =
    new Date()
      .toISOString();


  try {

    await req(
      PARTS_URL +
      "?id=eq." +
      encodeURIComponent(id),
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify(
            {
              is_available:
                true,

              last_seen_at:
                now
            }
          )
      }
    );


    p.is_available =
      true;


    p.last_seen_at =
      now;


    displayParts(
      parts
    );


  } catch (e) {

    alert(
      "Die Bestätigung konnte leider nicht gespeichert werden.\n\n" +
      e.message
    );

  }

}
