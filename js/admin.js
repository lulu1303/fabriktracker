
/* =========================================================
   ADMIN
========================================================= */

let adminAuthenticated =
  sessionStorage.getItem(
    "fabriktracker_admin_authenticated"
  ) === "true";


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin() {

  /*
   * Bereits in dieser Browser-Sitzung authentifiziert.
   */
  if (
    adminAuthenticated
  ) {

    return true;

  }


  const password =
    prompt(
      "Admin-Passwort:"
    );


  if (
    password === null
  ) {

    return false;

  }


  /*
   * Passwort prüfen.
   */
  if (
    password !==
    ADMIN_PASSWORD
  ) {

    alert(
      "❌ Falsches Admin-Passwort."
    );

    return false;

  }


  /*
   * Nur den Authentifizierungsstatus speichern.
   * Das Passwort selbst wird NICHT gespeichert.
   */
  adminAuthenticated =
    true;


  sessionStorage.setItem(
    "fabriktracker_admin_authenticated",
    "true"
  );


  return true;

}


/* =========================================================
   ADMIN TEIL LÖSCHEN
========================================================= */

async function adminDeletePart(
  id,
  partNumber,
  partName
) {

  const authenticated =
    await adminLogin();


  if (
    !authenticated
  ) {

    return;

  }


  const confirmed =
    confirm(

      "Soll dieses Teil wirklich gelöscht werden?\n\n" +

      "LEGO " +
      partNumber +
      "\n" +
      partName

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
          "DELETE"

      }

    );


    alert(
      "✅ Teil wurde gelöscht."
    );


    await loadParts();


  } catch (
    error
  ) {

    console.error(
      "Admin Delete Fehler:",
      error
    );


    alert(

      "❌ Das Teil konnte nicht gelöscht werden.\n\n" +

      (
        error.message ||
        "Unbekannter Fehler"
      )

    );

  }

}


/* =========================================================
   ADMIN STATUS ÄNDERN
========================================================= */

async function adminSetAvailability(
  id,
  available
) {

  const authenticated =
    await adminLogin();


  if (
    !authenticated
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
              Boolean(
                available
              )

          })

      }

    );


    await loadParts();


  } catch (
    error
  ) {

    console.error(
      "Admin Status Fehler:",
      error
    );


    alert(

      "❌ Status konnte nicht geändert werden.\n\n" +

      (
        error.message ||
        "Unbekannter Fehler"
      )

    );

  }

}
