const axios = require('axios');
const config = require('../../config');

// Per KaCyber Pay API docs (Data bundles / Airtime v1.0):
// Production base_url = https://kacyberpay.com/api, endpoints are {{base_url}}/v1/...
const BASE_URL = config.kacyberPay.environment === 'sandbox'
  ? 'https://sandbox.kacyber.africa/api/v1'
  : 'https://kacyberpay.com/api/v1';

function headers() {
  return {
    'X-app-id': config.kacyberPay.appId,
    'X-API-Key': config.kacyberPay.apiKey,
    'Content-Type': 'application/json'
  };
}

// ── Both APIs require msisdn in E.164 format, e.g. "+256771234567" ──
// (Airtime doc 4.1 Request Body, Data doc 4.2 Request Body). Our internal
// validators.normalizePhoneNumber() returns bare digits like "256771234567",
// so this adds the "+" right before it hits the wire.
function toE164(msisdn) {
  const digits = String(msisdn).replace(/[^\d]/g, '');
  return `+${digits}`;
}

// ── Airtime Send API — POST /v1/airtime/send (doc 4.1) ──
// Minimum amount is 500 UGX per docs. maxNumRetry is optional, 0-3, default 1.
async function sendAirtime({ externalReferenceID, msisdn, network, amount, currency = 'UGX', maxNumRetry = 2 }) {
  const response = await axios.post(
    `${BASE_URL}/airtime/send`,
    {
      externalReferenceID,
      Currency: currency,
      recipients: [{ msisdn: toE164(msisdn), network, amount }],
      maxNumRetry
    },
    { headers: headers() }
  );
  return response.data;
}

// ── Airtime Status API — GET /v1/airtime/status (doc 4.2) ──
async function getAirtimeStatus(reference) {
  const response = await axios.get(`${BASE_URL}/airtime/status`, {
    headers: headers(),
    params: { reference, includeDetails: true }
  });
  return response.data;
}

// ── Data Products Catalog API — GET /v1/data-products (doc 4.1) ──
async function getDataProducts(telco) {
  const response = await axios.get(`${BASE_URL}/data-products`, {
    headers: headers(),
    params: telco ? { telco } : undefined
  });
  return response.data;
}

// ── Data Bundle Purchase API — POST /v1/data/bundles (doc 4.2) ──
// quantity/unit/validity must match a real combination from the catalog —
// see 4.7 error code KC03 "Invalid request or validation failure".
async function purchaseDataBundle({ externalReferenceID, msisdn, network, quantity, unit, validity, currency = 'UGX' }) {
  const response = await axios.post(
    `${BASE_URL}/data/bundles`,
    {
      externalReferenceID,
      Currency: currency,
      recipients: [{ msisdn: toE164(msisdn), network, quantity, unit, validity }]
    },
    { headers: headers() }
  );
  return response.data;
}

// ── Data Bundle Status API — GET /v1/data/bundles/status (doc 4.3) ──
async function getDataBundleStatus(reference) {
  const response = await axios.get(`${BASE_URL}/data/bundles/status`, {
    headers: headers(),
    params: { reference, includeDetails: true }
  });
  return response.data;
}

module.exports = {
  sendAirtime,
  getAirtimeStatus,
  getDataProducts,
  purchaseDataBundle,
  getDataBundleStatus
};
