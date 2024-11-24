const express = require('express');
const { getExchangeRate } = require('../currency-service/cs')
const { sendMessageToAll } = require('../bot-service/bs')
require('dotenv').config();

let NATS = require('nats');
let nats = NATS.connect(process.env.NATS_CONNECT);

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

app.post('/gateway', async (req, res) => {
  try {
    const { header, body } = req.body;

    if (!header || !body) {
      return res.status(400).json({ success: false, error: 'Invalid request format' });
    }

    const { service, method } = header;
    try {
      switch (service) {
        case 'currency-service':
          switch (method) {
            case 'getPairRate':
              const { base_currency, to_currency } = body;

              if (!base_currency || !to_currency) {
                return res.status(400).json({ error: 'Currency not specified' });
              }

              const obj = {
                base_currency: base_currency,
                to_currency: to_currency
              }

              let response = await makeNatsRequest('getPairRate ', JSON.stringify(obj))
              if (response) {
                return res.json({ success: true, data: response });
              } else {
                return res.status(500).json({
                  success: false,
                  error: 'Failed to process NATS request.',
                });
              }


            default:
              return res.status(400).json({ error: `Method ${method} doesn't work` });
          }

        default:
          return res.status(400).json({ error: `Service: ${service} doesn't work` });
      }
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: 'Error' });
    };

  } catch (error) {
    console.error('Here Error processing request:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/getPairRate', async (req, res) => {
  try {
    const { base_currency, to_currency } = req.body;

    const rate = await getExchangeRate(base_currency, to_currency);

    res.json({ success: true, rate });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/bot', async (req, res) => {
  try {
    const { base_currency, to_currency, rate } = req.body
    let result = await sendMessageToAll(base_currency, to_currency, rate)
    if (result === true)
      return res.json({ success: true });
    else
      return res.json({ success: false });
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Gateway service running at http://localhost:${port}`);
});

const makeNatsRequest = async (topic, payload) => {
  const requestPromise = new Promise((resolve, reject) => {
    nats.request(topic, payload, (response) => {
      if (response.error) {
        return reject(new Error(response.error));
      }
      resolve(response);
    });
  })

  const response = await Promise.resolve(requestPromise);
  return response;
}