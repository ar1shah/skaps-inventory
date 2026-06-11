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
  var lastColumn = sheet.getLastColumn();
  var rowNumber = e.range.getRow();

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

  var response = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-skaps-secret': SHARED_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log('Ingest endpoint returned ' + code + ': ' + response.getContentText());
  }
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

  var fakeEvent = {
    range: sheet.getRange(lastRow, 1)
  };
  onFormSubmitTrigger(fakeEvent);
}
