/**
 * SKAPS Inventory -- Master List Google Apps Script
 *
 * Attach this script to the "Athens Inventory 2026" Google Sheet.
 * Whenever a user manually adds a new row to any of the 13 inventory
 * sheets, this script fires and sends the row to the /api/ingest-master
 * endpoint, which upserts the part in Supabase.
 *
 * SETUP: See MASTER_LIST_SETUP.md in the same folder.
 */

// ---------------------------------------------------------------------------
// Configuration -- set these as Script Properties (see SETUP.md)
// ---------------------------------------------------------------------------
var MASTER_ENDPOINT = PropertiesService.getScriptProperties().getProperty('MASTER_ENDPOINT') || '';
var SHARED_SECRET   = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET')   || '';
var DEBUG           = PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true';

/** Sheets that contain master inventory data (ignore Export and CATEGORY_SUB_LIST). */
var ALLOWED_SHEETS = [
  'PLC_CARDS', 'MOTORS', 'GEARMOTORS', 'GEARBOXES',
  'BEARINGS',  'INSERTS', 'BELTS',     'DRIVES',
  'MODULES',   'APRONS',  'GLOVES',    'BATTERIES', 'OIL'
];

// ---------------------------------------------------------------------------
// Installable trigger: fires on every spreadsheet edit.
// Only acts when an entire new row has a value in column A (SKAPSNo).
// ---------------------------------------------------------------------------
function onMasterListEdit(e) {
  if (!e || !e.range) {
    Logger.log('onMasterListEdit: no event range -- run via Triggers, not Run button.');
    return;
  }

  var sheet     = e.range.getSheet();
  var sheetName = sheet.getName();

  // Ignore sheets that aren't master-list data sheets
  if (ALLOWED_SHEETS.indexOf(sheetName) === -1) return;

  var editedRow = e.range.getRow();
  var editedCol = e.range.getColumn();

  // We only care about edits to column A (SKAPSNo) on data rows (row > 1).
  // This fires once when the user populates the SKAPSNo cell, indicating
  // a new row is being entered.
  if (editedRow < 2 || editedCol !== 1) return;

  var lastColumn = sheet.getLastColumn();
  var headers    = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var values     = sheet.getRange(editedRow, 1, 1, lastColumn).getValues()[0];

  // Skip if SKAPSNo cell is empty after the edit
  var skapsValue = values[0];
  if (!skapsValue || String(skapsValue).trim() === '') return;

  var payload = {
    rowId:     'master-' + sheet.getSheetId() + '-row-' + editedRow,
    sheetName: sheetName,
    headers:   headers,
    values:    values
  };

  if (DEBUG) {
    Logger.log('ingest-master payload: ' + JSON.stringify(payload, null, 2));
  }

  sendToIngest(payload);
}

// ---------------------------------------------------------------------------
// Helper: POST payload to /api/ingest-master
// ---------------------------------------------------------------------------
function sendToIngest(payload) {
  if (!MASTER_ENDPOINT) {
    Logger.log('ERROR: MASTER_ENDPOINT is not set. See MASTER_LIST_SETUP.md.');
    return;
  }
  if (!SHARED_SECRET) {
    Logger.log('ERROR: SHARED_SECRET is not set. See MASTER_LIST_SETUP.md.');
    return;
  }

  try {
    var response = UrlFetchApp.fetch(MASTER_ENDPOINT, {
      method:          'post',
      contentType:     'application/json',
      headers:         { 'x-skaps-secret': SHARED_SECRET },
      payload:         JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log('ingest-master returned ' + code + ': ' + response.getContentText());
    } else if (DEBUG) {
      Logger.log('ingest-master OK: ' + response.getContentText());
    }
  } catch (err) {
    Logger.log('ingest-master fetch error: ' + err);
  }
}

// ---------------------------------------------------------------------------
// Manual test helper -- run this from the Apps Script editor to verify
// the endpoint and secret are configured correctly.
// It re-sends the last data row of whichever sheet is currently active.
// ---------------------------------------------------------------------------
function manualTestMaster() {
  var sheet     = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  var lastRow   = sheet.getLastRow();

  if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
    Logger.log('Sheet "' + sheetName + '" is not a master-list sheet. Switch to one of the data sheets first.');
    return;
  }

  if (lastRow < 2) {
    Logger.log('No data rows on this sheet yet.');
    return;
  }

  var lastColumn = sheet.getLastColumn();
  var headers    = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var values     = sheet.getRange(lastRow, 1, 1, lastColumn).getValues()[0];

  var payload = {
    rowId:     'manual-test-' + sheet.getSheetId() + '-row-' + lastRow,
    sheetName: sheetName,
    headers:   headers,
    values:    values
  };

  Logger.log('Sending test payload for row ' + lastRow + ' of sheet "' + sheetName + '"...');
  sendToIngest(payload);
  Logger.log('Done. Check Apps Script logs and your admin panel notifications.');
}
