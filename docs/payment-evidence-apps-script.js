/* Bind this script to the private review Sheet. Set APPS_SCRIPT_SECRET in Script
 * Properties; deploy a versioned web app that executes as the deployer. Keep its
 * /exec URL only in Vercel server environment variables. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'submitPaymentEvidence') return json_({ success: false });
    const timestamp = Number(body.timestamp);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return json_({ success: false });
    const data = body.data || {};
    const secret = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_SECRET');
    const material = `${body.timestamp}.${body.requestId}.${JSON.stringify(data)}`;
    const expected = toHex_(Utilities.computeHmacSha256Signature(material, secret));
    if (!secret || !constantTimeEquals_(expected, String(body.signature || ''))) return json_({ success: false });
    const cache = CacheService.getScriptCache();
    if (cache.get(`payment-request:${body.requestId}`)) return json_({ success: false });
    cache.put(`payment-request:${body.requestId}`, '1', 300);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
    if (ids.includes(data.submissionId)) return json_({ success: true, duplicate: true });
    sheet.appendRow([data.submissionId, data.submittedAt, data.firebaseUid, data.fullName, data.phone, data.email, data.course, data.semester, data.amountPaid, data.utr, data.screenshotStoragePath, 'Pending', '']);
    return json_({ success: true });
  } catch (_) { return json_({ success: false }); }
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function constantTimeEquals_(a, b) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
function toHex_(bytes) { return bytes.map(function(byte) { const value = byte < 0 ? byte + 256 : byte; return (`0${value.toString(16)}`).slice(-2); }).join(''); }
