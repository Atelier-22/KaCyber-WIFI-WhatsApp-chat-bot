const crypto = require('crypto');
const config = require('./config');

// ── Confirms an airtime/data result callback really came from KaCyber ──
// Per both API docs (Airtime 4.4/4.5, Data 4.5): KaCyber signs the callback
// body with your callback secret and sends it as X-KaCyber-Signature.
// Uses the same req.rawBody captured globally in server.js for the
// WhatsApp webhook — no extra middleware needed.
function isValidSignature(req) {
  const secret = config.kacyberPay.callbackSecret;

  if (!secret) {
    console.warn('KACYBER_CALLBACK_SECRET not set — skipping KaCyber delivery callback signature check (dev mode only)');
    return true;
  }

  const signatureHeader = req.get('X-KaCyber-Signature');
  if (!signatureHeader || !req.rawBody) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  let expectedBuffer;
  let receivedBuffer;
  try {
    expectedBuffer = Buffer.from(expected, 'hex');
    receivedBuffer = Buffer.from(signatureHeader, 'hex');
  } catch (error) {
    return false;
  }

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

module.exports = { isValidSignature };
