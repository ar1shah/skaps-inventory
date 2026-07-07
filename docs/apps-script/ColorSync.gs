/**
 * SKAPS Parts Inventory -- Row color sync.
 *
 * Staff manually color rows on the "Maintenance Parts Requests (Responses)"
 * sheet to mark expense status:
 *
 *   green      -- expensed out
 *   bright red -- not expensed out (needs review)
 *   yellow     -- check inventory / stock balance
 *   pink       -- already shows 0 on Datatex (not tracked in software)
 *
 * This file reads column G's row background color (always filled when a row
 * is marked) and POSTs the mapped status to /api/sync-expense-status, which
 * stores it on the matching `submissions` row (matched by the same rowId
 * used by Code.gs).
 *
 * SETUP: See SETUP.md in the same folder. In short:
 *   1. Run logDistinctRowColors() once and adjust COLOR_MAP below to match
 *      the hex codes actually used in your sheet.
 *   2. Run backfillAllRowColors() once to sync existing colored rows.
 *   3. Install the onSheetFormatChange trigger (On change) and the
 *      syncRecentRowColors trigger (time-driven, every 30 minutes).
 *
 * Uses the same ENDPOINT-style Script Properties as Code.gs: STATUS_ENDPOINT
 * and the existing SHARED_SECRET / DEBUG properties.
 */

// ---------------------------------------------------------------------------
// Configuration -- set STATUS_ENDPOINT as a Script Property (see SETUP.md).
// Reuses SHARED_SECRET and DEBUG from Code.gs (same Script Properties store).
// ---------------------------------------------------------------------------
var STATUS_ENDPOINT = PropertiesService.getScriptProperties().getProperty('STATUS_ENDPOINT') || '';

/** Column whose row fill color reflects expense status (G = 7). */
var COLOR_COLUMN = 7;

/**
 * Hex fill color -> expense status. Keys are UPPERCASE hex without '#'.
 * Google Sheets' fill picker can return codes that don't match what you
 * see by eye -- run logDistinctRowColors() against the live sheet and
 * update these to match exactly before relying on this mapping.
 */
var COLOR_MAP = {
  '00FF00': 'expensed',         // green -- expensed out
  '38761D': 'expensed',
  '93C47D': 'expensed',
  'FF0000': 'not_expensed',     // bright red -- needs review
  'CC0000': 'not_expensed',
  'FFFF00': 'check_inventory',  // yellow -- check inventory / stock balance
  'FFD966': 'check_inventory',
  'FF00FF': 'datatex_zero',     // pink -- already 0 on Datatex
  'F4CCCC': 'datatex_zero',
  'EAD1DC': 'datatex_zero',
  'E06666': 'datatex_zero',
  'EA9999': 'datatex_zero',
  '0000FF': 'testing'           // blue -- test rows, not a real expense status
};

/** Backgrounds that mean "uncolored" -- never mapped to a status. */
var BLANK_COLORS = ['#FFFFFF', '#ffffff', ''];

/** How many of the most recent rows the timer-based safety net rescans. */
var RECENT_ROW_WINDOW = 400;

/**
 * Earliest row backfillAllRowColors() should touch. The web app only
 * started logging submissions from row 657 onward (June 11, 2026) --
 * anything before that has no matching submission in Supabase, so there's
 * nothing for a color sync to attach to. Adjust this if the ingest
 * start point ever changes.
 */
var BACKFILL_START_ROW = 657;

// ---------------------------------------------------------------------------
// Installable trigger: fires on any spreadsheet change, including manual
// fill-color edits (onEdit does NOT see color-only changes).
// ---------------------------------------------------------------------------
function onSheetFormatChange(e) {
  if (!e || e.changeType !== 'FORMAT') return;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange();
  if (!range) return;

  var startRow = range.getRow();
  var numRows = range.getNumRows();

  for (var i = 0; i < numRows; i++) {
    var rowNumber = startRow + i;
    if (rowNumber < 2) continue; // skip header
    syncRowColor(sheet, rowNumber);
  }
}

// ---------------------------------------------------------------------------
// Time-driven safety net -- FORMAT change events are known to be missed by
// Google occasionally, so we periodically re-check the most recent rows.
// ---------------------------------------------------------------------------
function syncRecentRowColors() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var startRow = Math.max(2, lastRow - RECENT_ROW_WINDOW + 1);
  Logger.log('syncRecentRowColors: scanning rows ' + startRow + '-' + lastRow);

  for (var rowNumber = startRow; rowNumber <= lastRow; rowNumber++) {
    syncRowColor(sheet, rowNumber);
  }
}

// ---------------------------------------------------------------------------
// One-time backfill -- syncs every colored row in the sheet. Can take a
// while on a large sheet; run manually once, ideally off-hours.
// ---------------------------------------------------------------------------
function backfillAllRowColors() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('Sheet has no data rows yet.');
    return;
  }

  var startRow = Math.max(2, BACKFILL_START_ROW);
  if (startRow > lastRow) {
    Logger.log('BACKFILL_START_ROW (' + BACKFILL_START_ROW + ') is past the last row (' + lastRow + ') -- nothing to do.');
    return;
  }

  Logger.log('backfillAllRowColors: scanning rows ' + startRow + '-' + lastRow + ' (column G)...');
  var synced = 0;
  for (var rowNumber = startRow; rowNumber <= lastRow; rowNumber++) {
    var status = detectExpenseStatus(sheet, rowNumber);
    if (status) {
      syncRowColor(sheet, rowNumber);
      synced++;
    }
  }
  Logger.log('backfillAllRowColors: done. Synced ' + synced + ' colored rows out of ' + (lastRow - startRow + 1) + ' scanned.');
}

// ---------------------------------------------------------------------------
// Calibration helper -- run once against the live sheet and check the
// Executions log to see every distinct fill color in column G. Colors
// already in COLOR_MAP are marked "mapped"; add any "UNMAPPED" ones.
// ---------------------------------------------------------------------------
function logDistinctRowColors() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('Sheet has no data rows yet.');
    return;
  }

  var backgrounds = sheet.getRange(2, COLOR_COLUMN, lastRow - 1, 1).getBackgrounds();
  var seen = {};
  for (var i = 0; i < backgrounds.length; i++) {
    var color = backgrounds[i][0];
    if (isBlank(color)) continue;
    var key = color.toUpperCase();
    if (!seen[key]) {
      seen[key] = { count: 0, exampleRow: i + 2 };
    }
    seen[key].count++;
  }

  Logger.log('Distinct non-blank colors in column G:');
  var unmapped = 0;
  for (var hex in seen) {
    var mapKey = hex.replace('#', '').toUpperCase();
    var status = COLOR_MAP[mapKey];
    var tag = status ? 'mapped -> ' + status : 'UNMAPPED -- add to COLOR_MAP';
    if (!status) unmapped++;
    Logger.log(hex + '  (x' + seen[hex].count + ', e.g. row ' + seen[hex].exampleRow + ')  ' + tag);
  }
  if (unmapped === 0) {
    Logger.log('All colors above are mapped. You can run backfillAllRowColors().');
  } else {
    Logger.log(unmapped + ' unmapped color(s) -- add them to COLOR_MAP (hex without #).');
  }
}

// ---------------------------------------------------------------------------
// Core: detect a row's expense status from its fill color and POST it.
// ---------------------------------------------------------------------------
function syncRowColor(sheet, rowNumber) {
  var status = detectExpenseStatus(sheet, rowNumber);
  var rowId = 'sheet-' + sheet.getSheetId() + '-row-' + rowNumber;

  if (DEBUG) {
    Logger.log('syncRowColor: ' + rowId + ' -> ' + (status || 'null (uncolored)'));
  }

  postExpenseStatus(rowId, status);
}

function detectExpenseStatus(sheet, rowNumber) {
  var color = sheet.getRange(rowNumber, COLOR_COLUMN).getBackground();
  if (isBlank(color)) return null;

  var key = color.replace('#', '').toUpperCase();
  var status = COLOR_MAP[key];
  if (!status && DEBUG) {
    Logger.log('Unmapped row color ' + color + ' on row ' + rowNumber + ' col G -- add it to COLOR_MAP.');
  }
  return status || null;
}

function isBlank(color) {
  if (!color) return true;
  for (var i = 0; i < BLANK_COLORS.length; i++) {
    if (color.toUpperCase() === BLANK_COLORS[i].toUpperCase()) return true;
  }
  return false;
}

function postExpenseStatus(rowId, status) {
  if (!STATUS_ENDPOINT) {
    Logger.log('ERROR: STATUS_ENDPOINT is not set. See SETUP.md.');
    return;
  }
  if (!SHARED_SECRET) {
    Logger.log('ERROR: SHARED_SECRET is not set. See SETUP.md.');
    return;
  }

  try {
    var response = UrlFetchApp.fetch(STATUS_ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-skaps-secret': SHARED_SECRET },
      payload: JSON.stringify({ rowId: rowId, expenseStatus: status }),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log('sync-expense-status returned ' + code + ' for ' + rowId + ': ' + response.getContentText());
    } else if (DEBUG) {
      Logger.log('sync-expense-status OK for ' + rowId + ': ' + response.getContentText());
    }
  } catch (err) {
    Logger.log('sync-expense-status fetch error for ' + rowId + ': ' + err);
  }
}
