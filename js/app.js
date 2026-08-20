/* =========================================================
   APP
   FabrikTracker
========================================================= */


/* =========================================================
   APP INITIALISIEREN
========================================================= */

async function initializeApp() {

  console.log(
    "FabrikTracker wird initialisiert..."
  );


  try {

    /*
     * =====================================================
     * TEILE LADEN
     * =====================================================
     *
     * loadParts() ist der zentrale Einstiegspunkt
     * für die Teileliste.
     *
     * Die eigentliche Funktion befindet sich in parts.js.
     */

    if (
      typeof window.loadParts ===
      "function"
    ) {

      await window.loadParts();

    } else {

      console.error(
        "loadParts() wurde nicht gefunden."
      );

    }


    /*
     * =====================================================
     * WEITERE INITIALISIERUNGEN
     * =====================================================
     *
     * Diese Funktionen werden nur ausgeführt,
     * wenn sie in den jeweiligen Dateien vorhanden sind.
     *
     * Dadurch kann keine fehlende optionale Funktion
     * den Start der Seite abbrechen.
     */


    if (
      typeof initializeSearch ===
      "function"
    ) {

      try {

        initializeSearch();

      } catch (
        error
      ) {

        console.warn(
          "Suche konnte nicht initialisiert werden:",
          error
        );

      }

    }


    if (
      typeof initializeAdmin ===
      "function"
    ) {

      try {

        initializeAdmin();

      } catch (
        error
      ) {

        console.warn(
          "Admin konnte nicht initialisiert werden:",
          error
        );

      }

    }


    if (
      typeof initializeReports ===
      "function"
    ) {

      try {

        initializeReports();

      } catch (
        error
      ) {

        console.warn(
          "Meldungen konnten nicht initialisiert werden:",
          error
        );

      }

    }


    console.log(
      "FabrikTracker vollständig initialisiert."
    );


  } catch (
    error
  ) {

    console.error(
      "Fehler bei der App-Initialisierung:",
      error
    );


    if (
      typeof showError ===
      "function"
    ) {

      showError(
        "Fehler beim Starten der App",
        error.message ||
        "Unbekannter Fehler"
      );

    }

  }

}


/* =========================================================
   APP STARTEN
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeApp();

  }
);


/* =========================================================
   GLOBAL
========================================================= */

window.initializeApp =
  initializeApp;
