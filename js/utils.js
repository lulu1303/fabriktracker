/* =========================================================
   UTILS
   FabrikTracker
========================================================= */


/* =========================================================
   HTML ESCAPEN
========================================================= */

/*
 * Hauptfunktion für HTML-Ausgabe.
 *
 * Dein aktuelles parts.js verwendet:
 *     escapeHTML(...)
 *
 * Die alte Version verwendete:
 *     esc(...)
 *
 * Deshalb unterstützen wir beide Namen.
 */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* Rückwärtskompatibilität */
function esc(value) {

  return escapeHTML(value);

}


/* =========================================================
   EURO / PREIS
========================================================= */


/* =========================================================
   DATUM
========================================================= */

/*
 * Dein aktuelles parts.js verwendet:
 *     formatDate(...)
 *
 * Die alte Version verwendete:
 *     date(...)
 *
 * Beide Namen bleiben deshalb verfügbar.
 */

function formatDate(value) {

  try {

    return value
      ? new Date(value).toLocaleString("de-DE")
      : "";

  } catch {

    return "";

  }

}


/* Rückwärtskompatibilität */
function date(value) {

  return formatDate(value);

}


/* =========================================================
   KATEGORIE
========================================================= */

/*
 * Einfache Kategorie-Erkennung.
 *
 * Wird weiterhin für ältere Teile der Anwendung
 * bereitgestellt.
 */


/* =========================================================
   KATEGORIENAME
========================================================= */

/*
 * Wird von parts.js verwendet:
 *
 *     getCategoryName(
 *       part.category_id,
 *       "Sonstige"
 *     )
 *
 * Falls categories.js bereits eine bessere
 * Implementierung bereitstellt, wird diese
 * Funktion dort später überschrieben.
 */

function getCategoryName(
  categoryId,
  fallback = "Sonstige"
) {

  /*
   * Falls eine globale Kategorie-Liste vorhanden ist,
   * versuchen wir daraus den Namen zu holen.
   */

  try {

    if (
      typeof categories !== "undefined" &&
      Array.isArray(categories)
    ) {

      const found =
        categories.find(
          category =>
            String(category.id) ===
            String(categoryId)
        );


      if (
        found &&
        found.name
      ) {

        return found.name;

      }

    }


    if (
      typeof rebrickableCategories !== "undefined" &&
      Array.isArray(rebrickableCategories)
    ) {

      const found =
        rebrickableCategories.find(
          category =>
            String(category.id) ===
            String(categoryId)
        );


      if (
        found &&
        found.name
      ) {

        return found.name;

      }

    }

  } catch (
    error
  ) {

    console.warn(
      "Kategorie konnte nicht ermittelt werden:",
      error
    );

  }


  return fallback;

}


/* =========================================================
   NORMALISIEREN
========================================================= */

function norm(value) {

  return String(value || "")
    .toLowerCase()
    .replace(
      /[×✕]/g,
      "x"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   ABMESSUNGEN ERKENNEN
========================================================= */

function dims(value) {

  const match =
    norm(value).match(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s|$)/
    );


  return match

    ? {

        a:
          +match[1]
            .replace(",", "."),

        b:
          +match[2]
            .replace(",", ".")

      }

    : null;

}


/* =========================================================
   EXAKTE MASS-SUCHE
========================================================= */


/* =========================================================
   DIMENSIONS-QUERY
========================================================= */


/* =========================================================
   RELATIVE ZEIT ("vor wenigen Minuten")
========================================================= */

/*
 * < 1 Minute      -> gerade eben
 * < 1 Stunde      -> vor wenigen Minuten
 * < 24 Stunden    -> vor wenigen Stunden
 * danach          -> vor 1 Tag / vor X Tagen
 */

function formatRelativeTime(value) {

  if (!value) {

    return "";

  }


  const time =
    new Date(value).getTime();


  if (
    Number.isNaN(time)
  ) {

    return "";

  }


  const diffMinutes =
    Math.floor(
      (Date.now() - time) / 60000
    );


  /* Uhr-Abweichungen (Zeit in der Zukunft) */
  if (diffMinutes < 1) {

    return "gerade eben";

  }


  if (diffMinutes < 60) {

    return "vor wenigen Minuten";

  }


  const diffHours =
    Math.floor(
      diffMinutes / 60
    );


  if (diffHours < 24) {

    return "vor wenigen Stunden";

  }


  const diffDays =
    Math.floor(
      diffHours / 24
    );


  return diffDays === 1
    ? "vor 1 Tag"
    : "vor " + diffDays + " Tagen";

}
