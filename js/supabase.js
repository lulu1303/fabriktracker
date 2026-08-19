/* =========================================================
   SUPABASE REQUEST
========================================================= */

async function supabaseRequest(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {

        ...options,

        headers: {

          "apikey":
            SUPABASE_KEY,

          "Authorization":
            "Bearer " +
            SUPABASE_KEY,

          "Content-Type":
            "application/json",

          ...(options.headers || {})

        }

      }
    );


  let data = null;


  try {

    data =
      await response.json();

  } catch {

    data = null;

  }


  if (!response.ok) {

    const message =
      data?.message ||
      data?.error ||
      ("HTTP Fehler " +
       response.status);


    const error =
      new Error(message);


    error.code =
      data?.code ||
      String(
        response.status
      );


    throw error;

  }


  return data;

}
