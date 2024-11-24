const { Telegraf } = require('telegraf');
const Redis = require('ioredis');
const express = require('express');
const app = express();
const port = 5000;

let NATS = require('nats');
let nats = NATS.connect();

app.use(express.json());

const bot = new Telegraf('7964205419:AAEEoro2M3ksJd-U3lwbLaWY3WDQKUdbjBA');
const redis = new Redis();
const CHAT_IDS_KEY = 'chat_ids';

async function saveData(key, value) {
  try {
    await redis.set(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error when saving data in Redis:', error);
  }
}

async function getData(key) {
  try {
    const data = await redis.get(key);
    return JSON.parse(data);
  } catch (error) {
    console.error('Error when retrieving data from Redis:', error);
    return null;
  }
}

// let chatIds = new Set(); 
// bot.start((ctx) => {
//   const chatId = ctx.chat.id;
//   chatIds.add(chatId);
//   ctx.reply('Вы подписались на уведомления!');
// });

// async function sendMessageToAll() {
//   try {
//     chatIds.forEach((chatId) => {
//       bot.telegram.sendMessage(chatId, 'Всем привет!').catch((err) => {
//         console.error(`Error sending a message to chat ${chatId}:`, err.message);
//       });
//     });
//     return 'success';
//   } catch (err) {
//     console.error('Error getting chatIds from Redis:', err);
//   }
// }

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  // const chatId = [472587496, 100]
  saveData(CHAT_IDS_KEY, Number(chatId));
  ctx.reply('Вы подписались на уведомления!');
});

async function sendMessageToAll(base_currency, to_currency, rate) {
  try {
    let data = await getData(CHAT_IDS_KEY)
    let arr = [data]
    let text = `Сегодняшний курс обмена ${base_currency} на ${to_currency} равен ${rate}`
    arr.forEach((chatId) => {
      bot.telegram.sendMessage(chatId, `Всем привет! ${text}`).catch((err) => {
        console.error(`Error sending a message to chat ${chatId}:`, err.message);
      });
    });
    return true;
  } catch (err) {
    console.error('Error getting chatIds from Redis:', err);
  }
}

bot.launch();
nats.subscribe('send-rates', async (msg, reply) => {
  const obs = JSON.parse(msg)
  console.log('obs', obs)

  const { base_currency, to_currency, rate } = obs
  let result = await sendMessageToAll(base_currency, to_currency, rate)

  // let rate = await getExchangeRate(obs.body.base_currency, obs.body.to_currency);
  nats.publish(reply, JSON.stringify(result));
});
console.log('Bot is running');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

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
  console.log(`Currency service running at http://localhost:${port}`);
});
