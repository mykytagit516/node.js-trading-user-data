import TelegramBot from 'node-telegram-bot-api';

class Bot {
  constructor(token, chatId, options) {
    if (!chatId) throw Error('chatId must be not empty');
    try {
      this.bot = new TelegramBot(token, options || {});
      this.chatId = chatId;
    } catch (err) {
      throw Error(err);
    }
  }

  send(message, chatId) {
    return this.bot.sendMessage(chatId || this.chatId, message, { parse_mode: 'markdown' });
  }

  addListener(type, fn) {
    this.bot.on(type, fn);
  }
}

export default Bot;
