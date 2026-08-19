/* =========================================================
   HTML ESCAPEN
========================================================= */

function escapeHTML(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   GELD FORMATIEREN
========================================================= */

function formatEuro(value) {

  if (
    value === null ||
    value === undefined ||
    isNaN(value)
  ) {

    return "–";

  }


  return Number(value)
    .toLocaleString(
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
   DATUM FORMATIEREN
========================================================= */

function formatDate(value) {

  if (!value) {

    return "";

  }


  try {

    return new Date(
      value
    ).toLocaleString(
      "de-DE"
    );

  } catch {

    return "";

  }

}
