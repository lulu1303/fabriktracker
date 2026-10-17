/* =========================================================
   REPORT / MELDEFORMULAR
========================================================= */


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
   WICHTIG
   ---------------------------------------------------------
   KEINE zweite searchLegoParts()
   KEINE zweite fetchLegoPartSuggestions()
   KEINE zweite selectLegoPart()
   
   Diese Funktionen befinden sich ausschließlich
   in search.js.
========================================================= */


/* =========================================================
   FARBEN LADEN
========================================================= */

async function loadColorsForPart(num) {

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

    const partNumber =
      selectedPart.part_num;

    const colorId =
      Number(
        sel.value
      );

    const now =
      new Date()
        .toISOString();

    /*
     * Gibt es dieses Teil in dieser Farbe schon?
     * (Die Datenbank erlaubt pro Teilenummer + Farbe
     * nur einen Eintrag.)
     */
    const findExisting =
      async () => {

        const rows =
          await req(
            PARTS_URL +
            "?part_number=eq." +
            encodeURIComponent(
              partNumber
            ) +
            "&color_id=eq." +
            colorId +
            "&select=id,is_available" +
            "&limit=1"
          );

        return (
          Array.isArray(rows) &&
          rows.length
        )
          ? rows[0]
          : null;

      };

    /*
     * Vorhandenen Eintrag bestätigen:
     * wieder verfügbar + gerade gesehen.
     */
    const confirmExisting =
      async existing => {

        await req(
          PARTS_URL +
          "?id=eq." +
          encodeURIComponent(
            existing.id
          ),
          {
            method: "PATCH",

            headers: {
              Prefer:
                "return=minimal"
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

        return (
          existing.is_available === false
            ? "Dieses Teil war schon gemeldet, aber als nicht mehr da markiert. Ich habe es wieder als verfügbar eingetragen. 🧱"
            : "Dieses Teil war schon gemeldet. Ich habe es als gerade gesehen bestätigt. 🧱"
        );

      };

    let message;

    const existing =
      await findExisting();

    if (existing) {

      message =
        await confirmExisting(
          existing
        );

    } else {

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
                    partNumber,

                  name:
                    selectedPart.name,

                  category:
                    selectedPart.category ||
                    "",

                  color_id:
                    colorId,

                  is_available:
                    true,

                  last_seen_at:
                    now
                }
              )
          }
        );

        message =
          "Danke! Das Teil wurde erfolgreich gemeldet. 🧱";

      } catch (insertError) {

        /*
         * 23505 = Eintrag existiert bereits.
         * Zwischenzeitlich hat jemand anderes
         * dasselbe Teil gemeldet.
         */
        if (
          String(
            insertError.code
          ) !== "23505"
        ) {

          throw insertError;

        }

        const again =
          await findExisting();

        if (!again) {

          throw insertError;

        }

        message =
          await confirmExisting(
            again
          );

      }

    }

    alert(
      message
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
      friendlyError(e)
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

    window.refreshPartList();

  } catch (e) {

    alert(
      "Der Status konnte leider nicht geändert werden.\n\n" +
      friendlyError(e)
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

    window.refreshPartList();

  } catch (e) {

    alert(
      "Die Bestätigung konnte leider nicht gespeichert werden.\n\n" +
      friendlyError(e)
    );

  }

}
