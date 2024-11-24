const express = require('express');
const Redis = require('ioredis');

let NATS = require('nats');
let nats = NATS.connect();

const app = express();
const port = 3000;

const redis = new Redis();

app.use(express.json());

app.post('/gateway', async (req, res) => {
  try {
    const { header, body } = req.body;

    if (!header || !body) {
      return res.status(400).json({ success: false, error: 'Invalid request format' });
    }

    const { service, method } = header;
    const { base_currency, to_currency } = body

    if (service === 'currency-service' && method === 'getPairRate') {
      const obj = {
        header: {
          service: service,
          method: method
        },
        body: {
          base_currency: base_currency,
          to_currency: to_currency
        }
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
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported service or method' });
    }
  } catch (error) {
    console.error('Here Error processing request:', error.message);
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