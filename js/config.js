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
 * Aktueller Rabatt (0.4 = 40 %).
 *
 * Aktion: Halloween-Sale.
 * Nach der Aktion einfach DISCOUNT auf den normalen Wert
 * (z.B. 0.2) und DISCOUNT_EMOJI auf "" stellen.
 */
const DISCOUNT =
  0.4;

const DISCOUNT_EMOJI =
  "🎃";
