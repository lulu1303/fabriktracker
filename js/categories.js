/* =========================================================
   REBRICKABLE CATEGORIES
========================================================= */

/*
 * Zentrale Verwaltung der Rebrickable-Kategorien.
 *
 * Die IDs entsprechen direkt den IDs aus
 * Rebrickable / part_categories.csv.
 *
 * Die Daten kommen aus unserer Supabase-Tabelle:
 *
 *   part_categories
 *
 * Dadurch müssen wir die Kategorien nicht mehr
 * selbst anhand von Namen erraten.
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

  /*
   * Wenn bereits geladen:
   * vorhandenen Cache verwenden.
   */
  if (
    categoriesLoaded
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
      !Array.isArray(result)
    ) {

      throw new Error(
        "Ungültige Kategorie-Daten."
      );

    }


    rebrickableCategories =
      result;


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


  const numericId =
    Number(
      categoryId
    );


  return (
    rebrickableCategories.find(
      category =>
        Number(
          category.id
        ) === numericId
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
    category &&
    category.name
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
        Number(
          category.id
        ),

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
   KATEGORIEN SORTIEREN
========================================================= */

function sortByRebrickableCategory(
  parts
) {

  if (
    !Array.isArray(parts)
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


      /*
       * Teile ohne Kategorie kommen
       * ans Ende.
       */
      if (
        Number.isNaN(
          categoryA
        )
      ) {

        return 1;

      }


      if (
        Number.isNaN(
          categoryB
        )
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
   KATEGORIEN GRUPPIEREN
========================================================= */

function groupPartsByRebrickableCategory(
  parts
) {

  const groups =
    new Map();


  if (
    !Array.isArray(parts)
  ) {

    return [];

  }


  parts.forEach(
    part => {

      const categoryId =
        Number(
          part.category_id
        );


      /*
       * Falls keine gültige Rebrickable-ID
       * vorhanden ist, verwenden wir
       * eine separate "Sonstige"-Gruppe.
       */
      const key =
        Number.isFinite(
          categoryId
        )
          ? categoryId
          : null;


      if (
        !groups.has(
          key
        )
      ) {

        const category =
          key !== null
            ? getCategoryById(
                key
              )
            : null;


        groups.set(
          key,
          {

            id:
              key,

            name:
              category?.name ||
              "Sonstige",

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
   * Nach Rebrickable-ID sortieren.
   */
  return Array.from(
    groups.values()
  )
  .sort(
    (
      a,
      b
    ) => {

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

  await loadPartCategories();

}


/* =========================================================
   DEBUG
========================================================= */

function getLoadedCategories() {

  return [
    ...rebrickableCategories
  ];

}

