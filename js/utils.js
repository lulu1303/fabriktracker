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

function euro(value) {

  if (
    value == null ||
    isNaN(value)
  ) {

    return "–";

  }


  return Number(value).toLocaleString(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );

}


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

function cat(category, name) {

  const text =
    (
      String(category || "") +
      " " +
      String(name || "")
    ).toLowerCase();


  const categoryText =
    String(category || "")
      .toLowerCase();


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

function exactDims(
  part,
  query
) {

  const queryDimensions =
    dims(query);


  const partDimensions =
    dims(part.name);


  return !!queryDimensions &&
         !!partDimensions &&
         queryDimensions.a ===
           partDimensions.a &&
         queryDimensions.b ===
           partDimensions.b;

}


/* =========================================================
   DIMENSIONS-QUERY
========================================================= */

function dimensionQuery(
  query
) {

  return !!dims(query);

}
