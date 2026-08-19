/* =========================================================
   REBRICKABLE CATEGORIES
   FabrikTracker
========================================================= */

/*
 * Die Kategorien kommen direkt aus unserer
 * Supabase-Tabelle:
 *
 *     part_categories
 *
 * Diese Tabelle basiert auf den Rebrickable
 * part_categories.
 *
 * Wir verwenden:
 *
 *     id
 *     name
 *
 * Keine eigene Kategorie-Erkennung anhand
 * von Teilnamen.
 */


/* =========================================================
   KONFIGURATION
========================================================= */

const PART_CATEGORIES_URL =
  SUPABASE_URL +
  "/rest/v1/part_categories";


/* =========================================================
   CACHE
========================================================= */

let rebrickableCategories = [];

let categoriesLoaded = false;


/* =========================================================
   KATEGORIEN LADEN
========================================================= */

async function loadPartCategories() {

  if (
    categoriesLoaded &&
    Array.isArray(
      rebrickableCategories
    )
  ) {

    return rebrickableCategories;

  }


  try {

    const url =
      PART_CATEGORIES_URL +
      "?select=id,name" +
      "&order=id.asc";


    const result =
      await supabaseRequest(
        url
      );


    if (
      !Array.isArray(
        result
      )
    ) {

      throw new Error(
        "Ungültige Rebrickable-Kategorien."
      );

    }


    /*
     * Nur gültige Kategorien übernehmen.
     */

    rebrickableCategories =
      result
        .filter(
          category =>
            category &&
            category.id !== null &&
            category.id !== undefined &&
            category.name
        )
        .map(
          category => ({

            id:
              Number(
                category.id
              ),

            name:
              String(
                category.name
              )

          })
        )
        .filter(
          category =>
            Number.isFinite(
              category.id
            )
        );


    /*
     * Rebrickable-Reihenfolge:
     * Kategorie-ID aufsteigend.
     */

    rebrickableCategories.sort(
      (
        a,
        b
      ) =>
        a.id -
        b.id
    );


    categoriesLoaded =
      true;


    return rebrickableCategories;

  } catch (
    error
  ) {

    console.error(
      "Fehler beim Laden der Rebrickable-Kategorien:",
      error
    );


    rebrickableCategories =
      [];

    categoriesLoaded =
      false;


    return [];

  }

}


/* =========================================================
   KATEGORIE NACH ID
========================================================= */

function getCategoryById(
  categoryId
) {

  if (
    categoryId === null ||
    categoryId === undefined ||
    categoryId === ""
  ) {

    return null;

  }


  const id =
    Number(
      categoryId
    );


  if (
    !Number.isFinite(
      id
    )
  ) {

    return null;

  }


  return (
    rebrickableCategories.find(
      category =>
        Number(
          category.id
        ) === id
    ) ||
    null
  );

}


/* =========================================================
   KATEGORIENAME NACH ID
========================================================= */

function getCategoryName(
  categoryId,
  fallback = "Sonstige"
) {

  const category =
    getCategoryById(
      categoryId
    );


  if (
    category
  ) {

    return category.name;

  }


  return fallback;

}


/* =========================================================
   KATEGORIE-INFORMATION
========================================================= */

function getRebrickableCategoryInfo(
  categoryId
) {

  const category =
    getCategoryById(
      categoryId
    );


  if (
    category
  ) {

    return {

      id:
        category.id,

      name:
        category.name

    };

  }


  return {

    id:
      null,

    name:
      "Sonstige"

  };

}


/* =========================================================
   TEILE NACH REBRICKABLE-KATEGORIE SORTIEREN
========================================================= */

function sortByRebrickableCategory(
  parts
) {

  if (
    !Array.isArray(
      parts
    )
  ) {

    return [];

  }


  return [
    ...parts
  ].sort(
    (
      a,
      b
    ) => {

      const categoryA =
        Number(
          a.category_id
        );


      const categoryB =
        Number(
          b.category_id
        );


      const validA =
        Number.isFinite(
          categoryA
        );


      const validB =
        Number.isFinite(
          categoryB
        );


      /*
       * Teile ohne Kategorie kommen
       * ganz nach hinten.
       */

      if (
        !validA &&
        !validB
      ) {

        return 0;

      }


      if (
        !validA
      ) {

        return 1;

      }


      if (
        !validB
      ) {

        return -1;

      }


      return (
        categoryA -
        categoryB
      );

    }
  );

}


/* =========================================================
   TEILE IN REBRICKABLE-KATEGORIEN GRUPPIEREN
========================================================= */

function groupPartsByRebrickableCategory(
  parts
) {

  if (
    !Array.isArray(
      parts
    )
  ) {

    return [];

  }


  const groups =
    new Map();


  parts.forEach(
    part => {

      const categoryId =
        Number(
          part.category_id
        );


      const validCategory =
        Number.isFinite(
          categoryId
        );


      const key =
        validCategory
          ? categoryId
          : null;


      if (
        !groups.has(
          key
        )
      ) {

        const category =
          validCategory
            ? getCategoryById(
                categoryId
              )
            : null;


        groups.set(
          key,
          {

            id:
              validCategory
                ? categoryId
                : null,

            name:
              category
                ? category.name
                : "Sonstige",

            parts:
              []

          }
        );

      }


      groups
        .get(
          key
        )
        .parts
        .push(
          part
        );

    }
  );


  /*
   * Kategorien exakt nach ihrer
   * Rebrickable-ID sortieren.
   */

  return Array.from(
    groups.values()
  ).sort(
    (
      a,
      b
    ) => {

      if (
        a.id === null &&
        b.id === null
      ) {

        return 0;

      }


      if (
        a.id === null
      ) {

        return 1;

      }


      if (
        b.id === null
      ) {

        return -1;

      }


      return (
        a.id -
        b.id
      );

    }
  );

}


/* =========================================================
   KATEGORIEN INITIALISIEREN
========================================================= */

async function initializeCategories() {

  return await loadPartCategories();

}


/* =========================================================
   DEBUG
========================================================= */

function getLoadedCategories() {

  return [
    ...rebrickableCategories
  ];

}
