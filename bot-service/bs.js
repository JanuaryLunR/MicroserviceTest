const { Telegraf } = require('telegraf');
const Redis = require('ioredis');
require('dotenv').config();

let NATS = require('nats');
let nats = NATS.connect(process.env.NATS_CONNECT);

nats.subscribe('send-rates', async (msg, reply) => {
  const obs = JSON.parse(msg)

  const { base_currency, to_currency, rate } = obs
  let result = await sendMessageToAll(base_currency, to_currency, rate)

  nats.publish(reply, JSON.stringify(result));
});

const bot = new Telegraf(process.env.BOT_TOKEN);
const redis = new Redis();
const CHAT_ID_COUNTER_KEY = 'chat_id_counter';

async function saveData(value) {
  try {
    const uniqueNumber = await redis.incr(CHAT_ID_COUNTER_KEY);
    const uniqueChatKey = `chat_id-${uniqueNumber}`;
    await redis.set(uniqueChatKey, JSON.stringify(value));
  } catch (error) {
    console.error('Error when saving data in Redis:', error);
  }
}

async function getData() {
  try {
    const keys = await redis.keys('chat_id-*');
    const chatIds = await Promise.all(keys.map((key) => redis.get(key)));

    return chatIds.map(Number);
  } catch (error) {
    console.error('Error when retrieving data from Redis:', error);
    return null;
  }
}

bot.start(async (ctx) => {
  const chatId = ctx.chat.id;

  saveData(Number(chatId));
  ctx.reply('Вы подписались на уведомления!');
});

async function sendMessageToAll(base_currency, to_currency, rate) {
  try {
    let data = await getData()
    let text = `Сегодняшний курс обмена ${base_currency} на ${to_currency} равен ${rate}`
    data.forEach((chatId) => {
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
console.log('Bot is running');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = {
  sendMessageToAll
};
