/**
 * SKAPS Parts Inventory -- Google Apps Script trigger.
 *
 * This script lives on the "Maintenance Parts Requests (Responses)" sheet.
 * Whenever the form attached to the sheet writes a new row, the
 * onFormSubmitTrigger() function below fires and POSTs the row to the
 * Next.js /api/ingest endpoint, which writes it to Supabase.
 *
 * To install: see SETUP.md in the same folder.
 */

// ---------------------------------------------------------------------------
// Configuration -- set these as Script Properties (see SETUP.md), not here.
// Project settings (gear icon) -> Script Properties -> Add script property.
// ---------------------------------------------------------------------------
var ENDPOINT       = PropertiesService.getScriptProperties().getProperty('ENDPOINT')       || '';
var SHARED_SECRET  = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET')  || '';
var DEBUG          = PropertiesService.getScriptProperties().getProperty('DEBUG') === 'true';

/** How many times to retry a failed fetch before giving up on a row. */
var MAX_RETRIES  = 2;
var RETRY_DELAY_MS = 2000;

/**
 * Called on every form submission. The `e` event has the cell range that
 * was just appended; we grab the entire row and the header row and ship
 * both to our endpoint so it can match by column name (not index).
 */
function onFormSubmitTrigger(e) {
  if (!e || !e.range) {
    Logger.log('No event payload -- run from the Triggers UI, not the Run button.');
    return;
  }

  var sheet = e.range.getSheet();
  var rowNumber = e.range.getRow();

  Logger.log('onFormSubmitTrigger: row ' + rowNumber + ' on sheet "' + sheet.getName() + '"');

  syncRow(sheet, rowNumber);
}

/**
 * Reads a row + the header row and POSTs it to the ingest endpoint.
 * Shared by the form-submit trigger and the manual recovery helpers below.
 */
function syncRow(sheet, rowNumber) {
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var values  = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];

  var payload = {
    rowId: 'sheet-' + sheet.getSheetId() + '-row-' + rowNumber,
    headers: headers,
    values: values
  };

  if (DEBUG) {
    Logger.log(JSON.stringify(payload, null, 2));
  }

  sendToIngest(payload);
}

// ---------------------------------------------------------------------------
// Helper: POST payload to /api/ingest, with config validation and retries.
// ---------------------------------------------------------------------------
function sendToIngest(payload) {
  if (!ENDPOINT) {
    Logger.log('ERROR: ENDPOINT is not set. See SETUP.md.');
    return;
  }
  if (!SHARED_SECRET) {
    Logger.log('ERROR: SHARED_SECRET is not set. See SETUP.md.');
    return;
  }

  for (var attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      var response = UrlFetchApp.fetch(ENDPOINT, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-skaps-secret': SHARED_SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var code = response.getResponseCode();
      if (code >= 200 && code < 300) {
        if (DEBUG) {
          Logger.log('Ingest OK (row ' + payload.rowId + '): ' + response.getContentText());
        }
        return;
      }

      Logger.log('Ingest endpoint returned ' + code + ' for ' + payload.rowId + ': ' + response.getContentText());
      // Don't retry on 4xx (bad payload / auth) -- retrying won't help.
      if (code >= 400 && code < 500) return;
    } catch (err) {
      Logger.log('Ingest fetch error for ' + payload.rowId + ' (attempt ' + attempt + '): ' + err);
    }

    if (attempt <= MAX_RETRIES) {
      Utilities.sleep(RETRY_DELAY_MS);
    }
  }

  Logger.log('Giving up on ' + payload.rowId + ' after ' + (MAX_RETRIES + 1) + ' attempts. Re-send later with resyncRow().');
}


/**
 * One-off helper you can run from the Apps Script editor to make sure the
 * endpoint and the secret are configured correctly. Picks the latest row
 * of the sheet and re-sends it.
 */
function manualTest() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('Sheet has no data rows yet.');
    return;
  }

  syncRow(sheet, lastRow);
}

/**
 * Recovery helper -- re-sends a single row by number. Use this when a
 * submission failed to reach the app (e.g. the "JavaScript runtime exited
 * unexpectedly" error) so you don't have to wait for a new form submission.
 * Safe to re-run: the ingest endpoint upserts on rowId.
 *
 * Run from the Apps Script editor: select resyncRow from the function
 * dropdown, or call it directly, e.g. resyncRow(482).
 */
function resyncRow(rowNumber) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  Logger.log('Resyncing row ' + rowNumber + '...');
  syncRow(sheet, rowNumber);
  Logger.log('Done. Check the executions log above and confirm the row shows up in the app.');
}
