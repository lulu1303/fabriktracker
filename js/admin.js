/* =========================================================
   ADMIN
========================================================= */

/*
 * Das Passwort wird bewusst NICHT mehr im Browser gespeichert
 * und nicht im Code geprüft. Es wird nur im Arbeitsspeicher
 * gehalten und beim Löschen an Supabase geschickt, wo es
 * serverseitig geprüft wird (admin_delete_part).
 *
 * Nach einem Neuladen der Seite ist man deshalb abgemeldet.
 */
let adminAuthenticated =
  false;

try {

  /* Alten Merker aus früheren Versionen entfernen */
  sessionStorage.removeItem(
    "fabriktracker_admin_authenticated"
  );

} catch (
  error
) {

  // Storage nicht verfügbar – kein Problem.

}


let adminPassword =
  "";


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin() {

  /*
   * Bereits angemeldet?
   * Dann kein neues Passwort verlangen.
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


  if (
    password.trim() === ""
  ) {

    alert(
      "Bitte ein Passwort eingeben."
    );

    return false;

  }


  /*
   * Passwort nur für diese Sitzung im Arbeitsspeicher merken.
   *
   * Die eigentliche Prüfung passiert in Supabase, sobald eine
   * Admin-Aktion (z.B. Löschen) ausgeführt wird.
   */
  adminPassword =
    password;


  adminAuthenticated =
    true;


  updateAdminUI();


  /*
   * Teile neu rendern,
   * damit Admin-Funktionen sichtbar werden.
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

  if (
    adminAuthenticated
  ) {

    adminLogout();

    return;

  }


  await adminLogin();

}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

function adminLogout() {

  adminAuthenticated =
    false;


  adminPassword =
    "";


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

  /*
   * Der Button in index.html heißt "adminLoginButton".
   * Der alte Name "adminHeaderButton" bleibt als Fallback.
   */
  const button =
    document.getElementById(
      "adminHeaderButton"
    ) ||
    document.getElementById(
      "adminLoginButton"
    );


  if (!button) {

    return;

  }


  /* Button "Rabatte" nur für angemeldete Admins */
  if (
    typeof updateDiscountAdminButton ===
    "function"
  ) {

    updateDiscountAdminButton();

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

  if (!id) {

    alert(
      "Dieses Teil konnte nicht eindeutig gefunden werden."
    );

    return;

  }


  /*
   * Falls noch nicht angemeldet:
   * einmalig Passwort abfragen.
   */
  if (
    !adminAuthenticated
  ) {

    const authenticated =
      await adminLogin();


    if (
      !authenticated
    ) {

      return;

    }

  }


  /*
   * Sicherheitsabfrage.
   */
  const confirmed =
    confirm(

      "⚠️ Teil wirklich komplett löschen?\n\n" +

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
     * WICHTIG:
     *
     * Wir benutzen die vorhandene
     * Supabase-RPC.
     *
     * Nicht direkt DELETE auf /parts.
     */
    const result =
      await req(

        SUPABASE_URL +
        "/rest/v1/rpc/admin_delete_part",

        {

          method:
            "POST",

          body:
            JSON.stringify({

              p_part_id:
                Number(id),

              p_password:
                adminPassword

            })

        }

      );


    /*
     * Die RPC muss true zurückgeben.
     */
    if (
      result !== true
    ) {

      /*
       * Meist ist das Passwort falsch.
       * Deshalb wieder abmelden, damit man es
       * beim nächsten Versuch neu eingeben kann.
       */
      adminLogout();

      alert(

        "❌ Das Teil wurde NICHT gelöscht.\n\n" +

        "Wahrscheinlich ist das Admin-Passwort falsch. " +

        "Bitte erneut anmelden."

      );

      return;

    }


    /*
     * Erst NACH erfolgreicher RPC
     * Erfolg melden.
     */
    alert(
      "✅ Das Teil wurde komplett gelöscht."
    );


    /*
     * Aktuelle Liste erneut aus
     * Supabase laden.
     */
    await window.loadParts();


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
        "Unbekannter Supabase-Fehler"
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
  if (
    !adminAuthenticated
  ) {

    const authenticated =
      await adminLogin();


    if (
      !authenticated
    ) {

      return;

    }

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


    await window.loadParts();


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
