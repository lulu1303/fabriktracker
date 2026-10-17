/* =========================================================
   RABATTE
   FabrikTracker

   - Rabatte werden aus Supabase (Tabelle "discounts") geladen
     und gelten für alle Besucher.
   - Im Admin-Bereich gibt es ein Fenster zum Bearbeiten.
   - Gespeichert wird über die Funktion admin_save_discounts,
     die das Admin-Passwort serverseitig prüft.

   Fallback: Ist Supabase nicht erreichbar, bleiben die
   Standardwerte aus config.js (DISCOUNTS) aktiv.
========================================================= */


/* =========================================================
   RABATTE LADEN
========================================================= */

async function loadDiscounts() {

  try {

    const rows =
      await supabaseRequest(
        SUPABASE_URL +
        "/rest/v1/discounts" +
        "?select=id,emoji,title,percent" +
        "&order=sort_order.asc,id.asc"
      );

    if (
      Array.isArray(rows)
    ) {

      DISCOUNTS =
        rows.map(
          row => ({

            id:
              row.id,

            rate:
              Number(row.percent) / 100,

            emoji:
              row.emoji || "",

            title:
              row.title || ""

          })
        );

    }

  } catch (
    error
  ) {

    console.warn(
      "Rabatte konnten nicht geladen werden, " +
      "Standardwerte bleiben aktiv:",
      error
    );

  }

}


/* =========================================================
   ADMIN-BUTTON "RABATTE"
========================================================= */

/*
 * Wird von updateAdminUI() in admin.js aufgerufen.
 * Der Button erscheint nur, wenn der Admin angemeldet ist.
 */

function updateDiscountAdminButton() {

  const loginButton =
    document.getElementById(
      "adminHeaderButton"
    ) ||
    document.getElementById(
      "adminLoginButton"
    );

  if (
    !loginButton
  ) {

    return;

  }

  const existing =
    document.getElementById(
      "adminDiscountsButton"
    );

  const isAdmin =
    typeof adminAuthenticated !== "undefined" &&
    adminAuthenticated;

  if (
    !isAdmin
  ) {

    if (existing) {

      existing.remove();

    }

    return;

  }

  if (
    existing
  ) {

    return;

  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "adminDiscountsButton";

  button.type =
    "button";

  button.className =
    loginButton.className;

  button.textContent =
    "🏷️ Rabatte";

  button.addEventListener(
    "click",
    openDiscountEditor
  );

  loginButton.parentNode.insertBefore(
    button,
    loginButton
  );

}


/* =========================================================
   RABATT-FENSTER
========================================================= */

let discountEditorRows =
  [];


function closeDiscountEditor() {

  const overlay =
    document.getElementById(
      "discountEditorOverlay"
    );

  if (overlay) {

    overlay.remove();

  }

}


function renderDiscountEditorRows() {

  const container =
    document.getElementById(
      "discountEditorRows"
    );

  if (
    !container
  ) {

    return;

  }

  if (
    !discountEditorRows.length
  ) {

    container.innerHTML = `
      <div class="discount-empty">
        Aktuell gibt es keine Rabatte.
      </div>
    `;

    return;

  }

  container.innerHTML =
    discountEditorRows
      .map(
        (
          row,
          index
        ) => `

          <div class="discount-row">

            <input
              class="discount-emoji"
              type="text"
              maxlength="8"
              placeholder="🎃"
              aria-label="Emoji"
              data-index="${index}"
              data-field="emoji"
              value="${escapeHTML(row.emoji)}"
            >

            <input
              class="discount-title"
              type="text"
              maxlength="60"
              placeholder="Name, z.B. Halloween-Sale"
              aria-label="Name des Rabatts"
              data-index="${index}"
              data-field="title"
              value="${escapeHTML(row.title)}"
            >

            <div class="discount-percent-wrapper">

              <span>-</span>

              <input
                class="discount-percent"
                type="number"
                inputmode="numeric"
                min="1"
                max="90"
                step="1"
                placeholder="20"
                aria-label="Prozent"
                data-index="${index}"
                data-field="percent"
                value="${escapeHTML(String(row.percent ?? ""))}"
              >

              <span>%</span>

            </div>

            <button
              class="discount-remove"
              type="button"
              aria-label="Rabatt entfernen"
              data-remove="${index}"
            >
              ✕
            </button>

          </div>

        `
      )
      .join("");

}


function openDiscountEditor() {

  if (
    typeof adminAuthenticated === "undefined" ||
    !adminAuthenticated
  ) {

    return;

  }

  closeDiscountEditor();

  discountEditorRows =
    (
      Array.isArray(
        DISCOUNTS
      )
        ? DISCOUNTS
        : []
    ).map(
      discount => ({

        id:
          discount.id || null,

        emoji:
          discount.emoji || "",

        title:
          discount.title || "",

        percent:
          Math.round(
            Number(discount.rate) * 100
          )

      })
    );

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "discountEditorOverlay";

  overlay.className =
    "modal-backdrop";

  overlay.innerHTML = `

    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discountEditorTitle"
    >

      <h2 id="discountEditorTitle">
        🏷️ Aktuelle Rabatte
      </h2>

      <p class="modal-hint">
        Emoji, Name und Prozent eintragen,
        z.B. 🎃 Halloween-Sale -40 %.
        Der Rabatt wird bei jedem Teil
        vom normalen Preis berechnet.
      </p>

      <div id="discountEditorRows"></div>

      <button
        id="discountAddButton"
        class="secondary modal-add"
        type="button"
      >
        + Rabatt hinzufügen
      </button>

      <div class="modal-buttons">

        <button
          id="discountCancelButton"
          class="secondary"
          type="button"
        >
          Abbrechen
        </button>

        <button
          id="discountSaveButton"
          class="primary"
          type="button"
        >
          Speichern
        </button>

      </div>

    </div>

  `;

  document.body.appendChild(
    overlay
  );

  renderDiscountEditorRows();


  /* Eingaben direkt in die Liste übernehmen */
  overlay.addEventListener(
    "input",
    event => {

      const target =
        event.target;

      const index =
        Number(
          target.dataset.index
        );

      const field =
        target.dataset.field;

      if (
        !field ||
        !discountEditorRows[index]
      ) {

        return;

      }

      discountEditorRows[index][field] =
        target.value;

    }
  );


  overlay.addEventListener(
    "click",
    event => {

      /* Klick auf den dunklen Hintergrund schließt das Fenster */
      if (
        event.target === overlay
      ) {

        closeDiscountEditor();

        return;

      }

      const removeButton =
        event.target.closest(
          "[data-remove]"
        );

      if (
        removeButton
      ) {

        discountEditorRows.splice(
          Number(
            removeButton.dataset.remove
          ),
          1
        );

        renderDiscountEditorRows();

      }

    }
  );


  document
    .getElementById(
      "discountAddButton"
    )
    .addEventListener(
      "click",
      () => {

        if (
          discountEditorRows.length >= 10
        ) {

          alert(
            "Es sind maximal 10 Rabatte möglich."
          );

          return;

        }

        discountEditorRows.push({

          id:
            null,

          emoji:
            "",

          title:
            "",

          percent:
            ""

        });

        renderDiscountEditorRows();

      }
    );


  document
    .getElementById(
      "discountCancelButton"
    )
    .addEventListener(
      "click",
      closeDiscountEditor
    );


  document
    .getElementById(
      "discountSaveButton"
    )
    .addEventListener(
      "click",
      saveDiscountEditor
    );

}


/* =========================================================
   SPEICHERN
========================================================= */

async function saveDiscountEditor() {

  const saveButton =
    document.getElementById(
      "discountSaveButton"
    );

  const payload = [];

  for (
    const row of discountEditorRows
  ) {

    const percent =
      Number(
        row.percent
      );

    if (
      !Number.isInteger(
        percent
      ) ||
      percent < 1 ||
      percent > 90
    ) {

      alert(
        "Bitte bei jedem Rabatt eine ganze Zahl " +
        "zwischen 1 und 90 als Prozent eintragen."
      );

      return;

    }

    payload.push({

      id:
        row.id || null,

      emoji:
        String(
          row.emoji || ""
        ).trim(),

      title:
        String(
          row.title || ""
        ).trim(),

      percent:
        percent

    });

  }

  if (
    saveButton
  ) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      "Wird gespeichert...";

  }

  try {

    const result =
      await req(
        SUPABASE_URL +
        "/rest/v1/rpc/admin_save_discounts",
        {

          method:
            "POST",

          body:
            JSON.stringify({

              p_password:
                adminPassword,

              p_discounts:
                payload

            })

        }
      );

    if (
      result !== true
    ) {

      /*
       * Meist ist das Passwort falsch.
       * Deshalb abmelden, damit man es neu eingeben kann.
       */
      closeDiscountEditor();

      if (
        typeof adminLogout === "function"
      ) {

        adminLogout();

      }

      alert(
        "❌ Die Rabatte wurden NICHT gespeichert.\n\n" +
        "Wahrscheinlich ist das Admin-Passwort falsch. " +
        "Bitte erneut anmelden."
      );

      return;

    }

    await loadDiscounts();

    closeDiscountEditor();

    if (
      typeof displayParts === "function" &&
      typeof parts !== "undefined"
    ) {

      /* Aktive Suche beibehalten */
      const searchInput =
        document.getElementById(
          "searchInput"
        );

      if (
        searchInput &&
        searchInput.value.trim() &&
        typeof searchParts === "function"
      ) {

        searchParts();

      } else {

        displayParts(
          parts
        );

      }

    }

    alert(
      "✅ Die Rabatte wurden gespeichert."
    );

  } catch (
    error
  ) {

    console.error(
      "Rabatte speichern Fehler:",
      error
    );

    alert(
      "❌ Die Rabatte konnten nicht gespeichert werden.\n\n" +
      (
        error.message ||
        "Unbekannter Fehler"
      )
    );

    if (
      saveButton
    ) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        "Speichern";

    }

  }

}


/* =========================================================
   GLOBAL
========================================================= */

window.loadDiscounts =
  loadDiscounts;

window.openDiscountEditor =
  openDiscountEditor;

window.updateDiscountAdminButton =
  updateDiscountAdminButton;
