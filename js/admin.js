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
   * Bereits angemeldet?
   * Dann nichts weiter tun.
   *
   * Wichtig:
   * adminLogin() wird auch beim Löschen aufgerufen.
   * Deshalb darf diese Funktion bei bestehender
   * Anmeldung NICHT ausloggen.
   */
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
   * Das Passwort wird nicht gespeichert.
   * Es bleibt nur der Login-Status in der
   * aktuellen Browser-Session erhalten.
   */
  if (
    password !==
    "luludel13"
  ) {

    alert(
      "❌ Falsches Admin-Passwort."
    );

    return false;

  }


  /*
   * Admin erfolgreich angemeldet.
   */
  adminAuthenticated =
    true;


  sessionStorage.setItem(
    "fabriktracker_admin_authenticated",
    "true"
  );


  updateAdminUI();


  /*
   * Teile neu darstellen,
   * damit die Admin-Buttons sichtbar werden.
   */
  if (
    typeof displayParts === "function" &&
    typeof parts !== "undefined"
  ) {

    displayParts(
      parts
    );

  }


  return true;

}


/* =========================================================
   ADMIN LOGIN / LOGOUT BUTTON
========================================================= */

async function toggleAdminLogin() {

  /*
   * Wenn bereits angemeldet:
   * ausloggen.
   */
  if (
    adminAuthenticated
  ) {

    adminLogout();

    return;

  }


  /*
   * Noch nicht angemeldet:
   * Passwort abfragen.
   */
  await adminLogin();

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


  /*
   * Teile neu darstellen,
   * damit die Löschen-Buttons wieder verschwinden.
   */
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

  /*
   * Neuer Button im Header.
   */
  const button =
    document.getElementById(
      "adminHeaderButton"
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
      "active"
    );

  } else {

    button.innerHTML =
      "🔒 Admin";


    button.classList.remove(
      "active"
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
   *
   * Wenn bereits angemeldet:
   * adminLogin() gibt sofort true zurück.
   */
  const authenticated =
    await adminLogin();


  if (
    !authenticated
  ) {

    return;

  }


  /*
   * Sicherheitsabfrage vor dem Löschen.
   */
  const confirmed =
    confirm(

      "⚠️ Teil wirklich löschen?\n\n" +

      "LEGO " +
      partNumber +
      "\n" +
      partName +

      "\n\n" +

      "Dieser Vorgang kann nicht rückgängig gemacht werden."

    );


  if (
    !confirmed
  ) {

    return;

  }


  try {

    /*
     * Teil aus Supabase löschen.
     */
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


    /*
     * Liste neu laden.
     */
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


  try {

    /*
     * Verfügbarkeit des Teils ändern.
     */
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


    /*
     * Liste neu laden.
     */
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
