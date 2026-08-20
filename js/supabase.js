/* =========================================================
   SUPABASE
========================================================= */

async function req(
  url,
  opt = {}
) {

  let r =
    await fetch(
      url,
      {
        ...opt,

        headers: {

          apikey:
            SUPABASE_KEY,

          Authorization:
            "Bearer " +
            SUPABASE_KEY,

          "Content-Type":
            "application/json",

          ...(opt.headers || {})

        }

      }
    );


  let d =
    null;


  try {

    d =
      await r.json();

  } catch (
    error
  ) {

    // Antwort enthält kein JSON.

  }


  if (
    !r.ok
  ) {

    let e =
      new Error(
        d?.message ||
        d?.error ||
        "HTTP Fehler " +
        r.status
      );


    e.code =
      d?.code ||
      r.status;


    throw e;

  }


  return d;

}


/* =========================================================
   KOMPATIBILITÄTS-ALIAS
========================================================= */

const supabaseRequest =
  req;
