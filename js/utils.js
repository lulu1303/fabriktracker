/* =========================================================
   UTILS
========================================================= */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function euro(v) {
  return v == null || isNaN(v)
    ? "–"
    : Number(v).toLocaleString(
        "de-DE",
        {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
}


function date(v) {
  try {
    return v
      ? new Date(v).toLocaleString("de-DE")
      : "";
  } catch {
    return "";
  }
}


function cat(c, n) {

  let x =
    (c + " " + n).toLowerCase();

  let ct =
    String(c || "").toLowerCase();


  if (ct === "11")
    return {
      key: "bricks",
      name: "Bricks",
      icon: "🧱"
    };


  if (x.includes("plate"))
    return {
      key: "plates",
      name: "Plates",
      icon: "▰"
    };


  if (x.includes("tile"))
    return {
      key: "tiles",
      name: "Tiles",
      icon: "▫️"
    };


  if (x.includes("brick"))
    return {
      key: "bricks",
      name: "Bricks",
      icon: "🧱"
    };


  if (
    x.includes("slope") ||
    x.includes("wedge")
  )
    return {
      key: "slopes",
      name: "Slopes",
      icon: "🔺"
    };


  if (x.includes("technic"))
    return {
      key: "technic",
      name: "Technic",
      icon: "⚙️"
    };


  if (x.includes("minifig"))
    return {
      key: "minifigs",
      name: "Minifiguren",
      icon: "👤"
    };


  if (
    x.includes("wheel") ||
    x.includes("tire")
  )
    return {
      key: "wheels",
      name: "Räder & Reifen",
      icon: "⚫"
    };


  return {
    key: "other",
    name: "Sonstige",
    icon: "🧩"
  };

}


/* =========================================================
   EXAKTE MASSSUCHE
========================================================= */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(
      /[×✕]/g,
      "x"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


function dims(s) {

  let m =
    norm(s).match(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s|$)/
    );

  return m
    ? {
        a: +m[1].replace(",", "."),
        b: +m[2].replace(",", ".")
      }
    : null;
}


function exactDims(p, q) {

  let a =
    dims(q);

  let b =
    dims(p.name);

  return !!a &&
         !!b &&
         a.a === b.a &&
         a.b === b.b;
}


function dimensionQuery(q) {
  return !!dims(q);
}
