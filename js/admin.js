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

  if (
    adminAuthenticated
  ) {

    return true;

  }


  const password =
    prompt(
      "🔒 Admin-Passwort eingeben:"
    );


  if (
    password === null
  ) {

    return false;

  }


  /*
   * TEMPORÄRE ENTWICKLUNGS-LÖSUNG
   *
   * Hier dein bisher verwendetes Admin-Passwort einsetzen.
   */
  if (
    password !==
    "DEIN_ADMIN_PASSWORT"
  ) {

    alert(
      "❌ Falsches Admin-Passwort."
    );

    return false;

  }


  adminAuthenticated =
    true;


  sessionStorage.setItem(
    "fabriktracker_admin_authenticated",
    "true"
  );


  updateAdminUI();


  return true;

}


/* =========================================================
   ADMIN LOGIN / LOGOUT BUTTON
========================================================= */

async function toggleAdminLogin() {

  if (
    adminAuthenticated
  ) {

    adminLogout();

    return;

  }


  const success =
    await adminLogin();


  if (
    success
  ) {

    updateAdminUI();

    if (
      typeof displayParts === "function" &&
      typeof parts !== "undefined"
    ) {

      displayParts(
        parts
      );

    }

  }

}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

function adminLogout() {

  adminAuthenticated =
    false;


  sessionStorage.removeItem(
    "fabriktracker_admin_authenticated"
  );


  updateAdminUI();


  if (
    typeof displayParts === "function" &&
    typeof parts !== "undefined"
  ) {

    displayParts(
      parts
    );

  }

}


/* =========================================================
   ADMIN UI
========================================================= */

function updateAdminUI() {

  const button =
    document.getElementById(
      "adminLoginButton"
    );


  if (!button) {

    return;

  }


  if (
    adminAuthenticated
  ) {

    button.innerHTML =
      "🟢 Admin aktiv · Abmelden";

    button.classList.add(
      "admin-active"
    );

  } else {

    button.innerHTML =
      "🔒 Admin";

    button.classList.remove(
      "admin-active"
    );

  }

}


/* =========================================================
   ADMIN TEIL LÖSCHEN
========================================================= */

async function adminDeletePart(
  id,
  partNumber,
  partName
) {

  /*
   * Falls noch nicht angemeldet:
   * einmalig Passwort abfragen.
   */
  const authenticated =
    await adminLogin();


  if (
    !authenticated
  ) {

    return;

  }


  const confirmed =
    confirm(

      "⚠️ Teil wirklich löschen?\n\n" +

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

    await req(

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

    await req(

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


/* =========================================================
   ADMIN BEIM LADEN INITIALISIEREN
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    updateAdminUI();

  }
);
