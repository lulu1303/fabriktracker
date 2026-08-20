/* =========================================================
   START
========================================================= */

window.addEventListener(
  "load",
  function() {

    console.log(
      "FabrikTracker gestartet."
    );


    loadParts();

  }
);


/* =========================================================
   KLICK AUSSERHALB DER VORSCHLÄGE
========================================================= */

document.addEventListener(
  "click",
  function(event) {

    const field =
      document.querySelector(
        ".field"
      );


    const suggestions =
      document.getElementById(
        "partSuggestions"
      );


    if (
      field &&
      suggestions &&
      !field.contains(
        event.target
      )
    ) {

      suggestions.style.display =
        "none";

    }

  }
);
