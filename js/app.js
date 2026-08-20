/* =========================================================
   APP / INITIALISIERUNG
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeApp();

  }
);


/* =========================================================
   APP INITIALISIEREN
========================================================= */

async function initializeApp() {

  /*
   * Report-Formular initialisieren
   */

  initializeReportForm();


  /*
   * Teile laden
   *
   * WICHTIG:
   * loadParts() wird hier genau EINMAL aufgerufen.
   * Der zusätzliche window.load-Aufruf aus parts.js
   * muss entfernt werden.
   */

  try {

    if (
      typeof window.loadParts ===
      "function"
    ) {

      await window.loadParts();

    }

  } catch (
    error
  ) {

    console.error(
      "App konnte nicht initialisiert werden:",
      error
    );

  }


  /*
   * Sucheingabe
   */

  const searchInput =
    document.getElementById(
      "searchInput"
    );


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      () => {

        searchParts();

      }
    );

  }


  /*
   * Report-Suche
   */

  const partSearchInput =
    document.getElementById(
      "partSearchInput"
    );


  if (partSearchInput) {

    partSearchInput.addEventListener(
      "input",
      () => {

        searchLegoParts();

      }
    );

  }


  /*
   * Farbauswahl
   */

  const colorSelect =
    document.getElementById(
      "colorSelect"
    );


  if (colorSelect) {

    colorSelect.addEventListener(
      "change",
      () => {

        updateReportSubmitState();

      }
    );

  }


  /*
   * Klick außerhalb der
   * Suchvorschläge schließt diese.
   */

  document.addEventListener(
    "click",
    event => {

      const suggestions =
        document.getElementById(
          "partSuggestions"
        );


      const input =
        document.getElementById(
          "partSearchInput"
        );


      if (
        !suggestions ||
        !input
      ) {

        return;

      }


      if (
        event.target === input ||
        suggestions.contains(
          event.target
        )
      ) {

        return;

      }


      hideSuggestions();

    }
  );

}


/* =========================================================
   KATEGORIE ÖFFNEN / SCHLIESSEN
========================================================= */

function toggleCategory(
  button
) {

  if (!button) {

    return;

  }


  const folder =
    button.closest(
      ".category-folder"
    );


  if (!folder) {

    return;

  }


  folder.classList.toggle(
    "open"
  );

}


/* =========================================================
   SUCHVORSCHLÄGE VERSTECKEN
========================================================= */

function hideSuggestions() {

  const suggestions =
    document.getElementById(
      "partSuggestions"
    );


  if (!suggestions) {

    return;

  }


  suggestions.style.display =
    "none";

}


/* =========================================================
   SUCHVORSCHLÄGE ANZEIGEN
========================================================= */

function showSuggestions() {

  const suggestions =
    document.getElementById(
      "partSuggestions"
    );


  if (!suggestions) {

    return;

  }


  suggestions.style.display =
    "block";

}


/* =========================================================
   FEHLER ANZEIGEN
========================================================= */

function showError(
  title,
  message
) {

  const container =
    document.getElementById(
      "results"
    );


  if (!container) {

    return;

  }


  container.innerHTML = `

    <div class="card error">

      <div class="error-title">

        ❌ ${escapeHTML(
          title ||
          "Fehler"
        )}

      </div>


      <div>

        ${escapeHTML(
          message ||
          "Unbekannter Fehler"
        )}

      </div>

    </div>

  `;

}


/* =========================================================
   REPORT-FORMULAR BEIM LADEN VERSTECKEN
========================================================= */

function initializeReportForm() {

  const form =
    document.getElementById(
      "reportForm"
    );


  if (form) {

    form.style.display =
      "none";

  }


  updateReportSubmitState();

}
