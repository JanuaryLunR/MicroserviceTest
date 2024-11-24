const express = require('express');
const axios = require('axios');


let NATS = require('nats');
let nats = NATS.connect();

nats.subscribe('getPairRate', async (msg, reply) => {
  const obs = JSON.parse(msg)
  let rate = await getExchangeRate(obs.body.base_currency, obs.body.to_currency);
  let msgToBs = {
    base_currency: obs.body.base_currency,
    to_currency: obs.body.to_currency,
    rate: rate
  }
  nats.request('send-rates', JSON.stringify(msgToBs), (response) => {
    console.log(`Service cs received response: ${response}`);
  });

  nats.publish(reply, JSON.stringify(rate));
});


const app = express();
const port = 4000;
const exchangeApiUrl = 'https://api.exchangerate-api.com/v4/latest';
const exchangeApiKey = 'your_api_key';

app.use(express.json());

async function getExchangeRate(baseCurrency, toCurrency) {
  try {
    const response = await axios.get(`${exchangeApiUrl}/${String(baseCurrency).toUpperCase()}?apiKey=${String(exchangeApiKey).toUpperCase()}`);
    return response.data.rates[String(toCurrency).toUpperCase()];
  } catch (error) {
    throw new Error('Failed to get exchange rate');
  }
}

app.post('/getPairRate', async (req, res) => {
  try {
    const { base_currency, to_currency } = req.body;

    const rate = await getExchangeRate(base_currency, to_currency);

    res.json({ success: true, rate });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Currency service running at http://localhost:${port}`);
});
