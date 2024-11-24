const express = require('express');
const axios = require('axios');
const { connect } = require('nats');

const app = express();
const port = 4000;
const exchangeApiUrl = 'https://api.exchangerate-api.com/v4/latest'; 
const exchangeApiKey = 'your_api_key'; 
app.use(express.json());

async function getExchangeRate(baseCurrency, toCurrency) {
  try {
    const response = await axios.get(`${exchangeApiUrl}/${baseCurrency}?apiKey=${exchangeApiKey}`);
    return response.data.rates[toCurrency];
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
