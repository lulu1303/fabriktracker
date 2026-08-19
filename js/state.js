let parts = [];

let selectedPart = null;

let searchTimer = null;


/*
 * NEU:
 * Hier speichern wir die aktuellen
 * Suchergebnisse separat.
 *
 * Dadurch müssen wir keine kompletten
 * JavaScript-Objekte mehr direkt in
 * onclick schreiben.
 */

let legoSearchResults = [];


/* =========================================================
   PREIS
========================================================= */

const PRICE_PER_100G = 11;

const PRICE_PER_GRAM =
  PRICE_PER_100G / 100;

const DISCOUNT = 0.20;
