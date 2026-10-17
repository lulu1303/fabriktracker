/* =========================================================
   CONFIG
========================================================= */

const SUPABASE_URL =
  "https://nmsoppdibanqfaeqtube.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_rcf_aY1AfeyRmumUDiNhBw_7LUWdVBD";

const PARTS_URL =
  SUPABASE_URL +
  "/rest/v1/parts";

const LEGO_PARTS_URL =
  SUPABASE_URL +
  "/rest/v1/lego_parts";

const WEIGHTS_URL =
  SUPABASE_URL +
  "/rest/v1/lego_part_weights";

const PRICE_PER_GRAM =
  0.11;

/*
 * Standard-Rabatte (Fallback).
 * Die echten Rabatte werden aus Supabase geladen und im
 * Admin-Bereich über den Button "Rabatte" bearbeitet
 * (js/discounts.js). Diese Liste gilt nur, wenn Supabase
 * nicht erreichbar ist.
 *
 * Rabatte, die bei jedem Teil angezeigt werden.
 * Jeder Rabatt wird vom normalen Preis berechnet
 * (die Rabatte werden NICHT miteinander verrechnet).
 *
 * rate  = 0.2 bedeutet 20 %
 * emoji = Symbol vor dem Prozentwert
 * title = Erklärung (Tooltip am Computer)
 *
 */
let DISCOUNTS = [

  {
    rate: 0.2,
    emoji: "🎟️",
    title: "Jahreskarten-Rabatt"
  },

  {
    rate: 0.4,
    emoji: "🎃",
    title: "Halloween-Sale"
  }

];
