const axios = require('axios');
require('dotenv').config();

let NATS = require('nats');
let nats = NATS.connect(process.env.NATS_CONNECT);

nats.subscribe('getPairRate', async (msg, reply) => {
  const obj = JSON.parse(msg)
  let rate = await getExchangeRate(obj.base_currency, obj.to_currency);
  let msgToBs = {
    base_currency: obj.base_currency,
    to_currency: obj.to_currency,
    rate: rate
  }
  nats.request('send-rates', JSON.stringify(msgToBs), (response) => {
    console.log(`Service cs received response: ${response}`);
  });

  nats.publish(reply, JSON.stringify(rate));
});

const exchangeApiUrl = process.env.EXCHANGEAPIURL;
const exchangeApiKey = process.env.EXCHANGEAPIKEY;


async function getExchangeRate(baseCurrency, toCurrency) {
  try {
    const response = await axios.get(`${exchangeApiUrl}/${String(baseCurrency).toUpperCase()}?apiKey=${String(exchangeApiKey).toUpperCase()}`);
    return response.data.rates[String(toCurrency).toUpperCase()];
  } catch (error) {
    throw new Error('Failed to get exchange rate');
  }
}

module.exports = { getExchangeRate };
