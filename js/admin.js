/* =========================================================
   ADMIN
========================================================= */

let adminAuthenticated = false;


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin() {

  if (adminAuthenticated) {

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
   * Das Passwort wird aktuell nur lokal
   * geprüft.
   *
   * Die eigentliche Admin-Berechtigung
   * wird zusätzlich durch Supabase/RLS
   * abgesichert.
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


  adminAuthenticated =
    true;


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
