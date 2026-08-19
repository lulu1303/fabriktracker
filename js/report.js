/* =========================================================
   REPORT / TEIL MELDEN
========================================================= */

async function reportUnavailable(
  id
) {

  const confirmed =
    confirm(
      "Möchtest du wirklich melden, dass dieses Teil nicht mehr verfügbar ist?"
    );


  if (
    !confirmed
  ) {

    return;

  }


  try {

    await supabaseRequest(

      PARTS_URL +

      "?id=eq." +

      encodeURIComponent(
        id
      ),

      {

        method:
          "PATCH",

        headers: {

          "Prefer":
            "return=minimal"

        },

        body:
          JSON.stringify({

            is_available:
              false,

            last_seen_at:
              new Date()
                .toISOString()

          })

      }

    );


    alert(
      "✅ Vielen Dank! Das Teil wurde als nicht verfügbar gemeldet."
    );


    await loadParts();


  } catch (
    error
  ) {

    console.error(
      "Report unavailable Fehler:",
      error
    );


    alert(

      "❌ Die Meldung konnte nicht gespeichert werden.\n\n" +

      (
        error.message ||
        "Unbekannter Fehler"
      )

    );

  }

}


/* =========================================================
   TEIL BESTÄTIGEN
========================================================= */

async function confirmPart(
  partNumber,
  id
) {

  const confirmed =
    confirm(

      "Hast du LEGO " +
      partNumber +
      " gerade tatsächlich in der Fabrik gesehen?"

    );


  if (
    !confirmed
  ) {

    return;

  }


  try {

    await supabaseRequest(

      PARTS_URL +

      "?id=eq." +

      encodeURIComponent(
        id
      ),

      {

        method:
          "PATCH",

        headers: {

          "Prefer":
            "return=minimal"

        },

        body:
          JSON.stringify({

            is_available:
              true,

            last_seen_at:
              new Date()
                .toISOString()

          })

      }

    );


    alert(
      "✅ Vielen Dank! Die Verfügbarkeit wurde bestätigt."
    );


    await loadParts();


  } catch (
    error
  ) {

    console.error(
      "Confirm Part Fehler:",
      error
    );


    alert(

      "❌ Die Bestätigung konnte nicht gespeichert werden.\n\n" +

      (
        error.message ||
        "Unbekannter Fehler"
      )

    );

  }

}


/* =========================================================
   REPORT FORMULAR
========================================================= */

function openReportForm() {

  const form =
    document.getElementById(
      "reportForm"
    );


  if (!form) {

    return;

  }


  form.style.display =
    "block";


  form.scrollIntoView({

    behavior:
      "smooth",

    block:
      "start"

  });

}


/* =========================================================
   REPORT FORMULAR SCHLIESSEN
========================================================= */

function closeReportForm() {

  const form =
    document.getElementById(
      "reportForm"
    );


  if (!form) {

    return;

  }


  form.style.display =
    "none";


  resetReportForm();

}


/* =========================================================
   REPORT FORMULAR ZURÜCKSETZEN
========================================================= */

function resetReportForm() {

  const input =
    document.getElementById(
      "partSearchInput"
    );


  const selected =
    document.getElementById(
      "selectedPart"
    );


  const suggestions =
    document.getElementById(
      "partSuggestions"
    );


  const errorBox =
    document.getElementById(
      "partSearchError"
    );


  const colorSelect =
    document.getElementById(
      "colorSelect"
    );


  const quantityInput =
    document.getElementById(
      "quantityInput"
    );


  const submitButton =
    document.getElementById(
      "submitReportButton"
    );


  selectedPart =
    null;


  legoSearchResults =
    [];


  if (input) {

    input.value =
      "";

  }


  if (selected) {

    selected.innerHTML =
      "";

  }


  if (suggestions) {

    suggestions.innerHTML =
      "";

    suggestions.style.display =
      "none";

  }


  if (errorBox) {

    errorBox.textContent =
      "";

  }


  if (colorSelect) {

    colorSelect.disabled =
      true;

    colorSelect.innerHTML = `

      <option value="">
        Erst Teil auswählen...
      </option>

    `;

  }


  if (quantityInput) {

    quantityInput.value =
      "1";

  }


  if (submitButton) {

    submitButton.disabled =
      true;

  }

}


/* =========================================================
   FARBEN FÜR TEIL LADEN
========================================================= */

async function loadColorsForPart(
  partNumber
) {

  const select =
    document.getElementById(
      "colorSelect"
    );


  const submitButton =
    document.getElementById(
      "submitReportButton"
    );


  if (!select) {

    return;

  }


  select.disabled =
    true;


  select.innerHTML = `

    <option value="">
      Farben werden geladen...
    </option>

  `;


  if (submitButton) {

    submitButton.disabled =
      true;

  }


  try {

    const url =

      SUPABASE_URL +

      "/rest/v1/lego_part_colors" +

      "?part_num=eq." +

      encodeURIComponent(
        partNumber
      ) +

      "&select=color_id,color_name" +

      "&order=color_name.asc";


    const colors =
      await supabaseRequest(
        url
      );


    select.innerHTML = `

      <option value="">
        Farbe auswählen...
      </option>

    `;


    (
      colors || []
    ).forEach(
      color => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          color.color_id;


        option.textContent =
          color.color_name ||
          (
            "Farbe " +
            color.color_id
          );


        select.appendChild(
          option
        );

      }
    );


    select.disabled =
      false;


  } catch (
    error
  ) {

    console.error(
      "Farben konnten nicht geladen werden:",
      error
    );


    select.innerHTML = `

      <option value="">
        ❌ Farben konnten nicht geladen werden
      </option>

    `;


    select.disabled =
      true;

  }


  updateReportSubmitState();

}


/* =========================================================
   SUBMIT BUTTON STATUS
========================================================= */

function updateReportSubmitState() {

  const submitButton =
    document.getElementById(
      "submitReportButton"
    );


  const colorSelect =
    document.getElementById(
      "colorSelect"
    );


  if (!submitButton) {

    return;

  }


  submitButton.disabled =
    !selectedPart ||
    !colorSelect ||
    !colorSelect.value;

}


/* =========================================================
   REPORT ABSENDEN
========================================================= */

async function submitReport() {

  const submitButton =
    document.getElementById(
      "submitReportButton"
    );


  const colorSelect =
    document.getElementById(
      "colorSelect"
    );


  const quantityInput =
    document.getElementById(
      "quantityInput"
    );


  if (
    !selectedPart
  ) {

    alert(
      "❌ Bitte zuerst ein LEGO Teil auswählen."
    );

    return;

  }


  if (
    !colorSelect ||
    !colorSelect.value
  ) {

    alert(
      "❌ Bitte eine Farbe auswählen."
    );

    return;

  }


  const quantity =
    Number(
      quantityInput?.value ||
      1
    );


  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity < 1
  ) {

    alert(
      "❌ Bitte eine gültige Menge eingeben."
    );

    return;

  }


  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.textContent =
      "⏳ Wird gespeichert...";

  }


  try {

    const payload = {

      part_num:
        selectedPart.part_num,

      color_id:
        Number(
          colorSelect.value
        ),

      quantity:
        quantity,

      reported_at:
        new Date()
          .toISOString()

    };


    /*
     * Der Report wird in die Reports-Tabelle
     * geschrieben.
     */

    const reportsUrl =

      SUPABASE_URL +

      "/rest/v1/part_reports";


    await supabaseRequest(

      reportsUrl,

      {

        method:
          "POST",

        headers: {

          "Prefer":
            "return=minimal"

        },

        body:
          JSON.stringify(
            payload
          )

      }

    );


    /*
     * Wenn das Teil bereits in der
     * parts-Tabelle existiert, wird es
     * gleichzeitig als verfügbar markiert.
     */

    try {

      const existingUrl =

        PARTS_URL +

        "?part_number=eq." +

        encodeURIComponent(
          selectedPart.part_num
        ) +

        "&color_id=eq." +

        encodeURIComponent(
          colorSelect.value
        ) +

        "&select=id" +

        "&limit=1";


      const existing =
        await supabaseRequest(
          existingUrl
        );


      if (
        existing &&
        existing.length > 0
      ) {

        await supabaseRequest(

          PARTS_URL +

          "?id=eq." +

          encodeURIComponent(
            existing[0].id
          ),

          {

            method:
              "PATCH",

            headers: {

              "Prefer":
                "return=minimal"

            },

            body:
              JSON.stringify({

                is_available:
                  true,

                last_seen_at:
                  new Date()
                    .toISOString()

              })

          }

        );

      }

    } catch (
      updateError
    ) {

      console.warn(
        "Teil konnte nach Report nicht aktualisiert werden:",
        updateError
      );

    }


    alert(
      "✅ Vielen Dank! Deine Meldung wurde gespeichert."
    );


    closeReportForm();


    await loadParts();


  } catch (
    error
  ) {

    console.error(
      "Report Submit Fehler:",
      error
    );


    alert(

      "❌ Die Meldung konnte nicht gespeichert werden.\n\n" +

      (
        error.message ||
        "Unbekannter Fehler"
      )

    );


  } finally {

    if (submitButton) {

      submitButton.textContent =
        "Meldung absenden";

      updateReportSubmitState();

    }

  }

}
