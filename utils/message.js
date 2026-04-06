const store = require("../store/store");

// 发送群消息
async function sendMessage(
  platform,
  channelId,
  message,
  at = [],
  quote,
) {
  try {
    const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
    if (bot) {
      let msg = "";
      let atMsg = "";
      if (at.length > 0) {
        if (at.filter((id) => id === "all").length > 0) {
          atMsg = '<at type="all"/>';
        } else {
          atMsg = at.map((id) => `<at id="${id}"/>`).join("");
        }
        msg = `${atMsg} ${message}`;
      } else {
        msg = message;
      }
      if (quote) {
        msg = `<quote id="${quote}"/>${msg}`;
      }
      const ids = await bot.sendMessage(channelId, msg);
      return ids;
    } else {
      console.error("发送群消息失败: 未找到对应平台的机器人");
      return null;
    }
  } catch (error) {
    console.error("发送群消息失败:\n", error);
    return null;
  }
}

// 发送私信
async function sendPrivateMessage(
  platform,
  userId,
  message,
  guildId,
  quote,
) {
  try {
    const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
    if (bot) {
      let msg = message;
      if (quote) {
        msg = `<quote id="${quote}"/>${msg}`;
      }
      const ids = await bot.sendPrivateMessage(userId, msg, guildId);
      return ids;
    } else {
      console.error("发送私信失败: 未找到对应平台的机器人");
      return null;
    }
  } catch (error) {
    console.error("发送私信失败:\n", error);
    return null;
  }
}

// 判断是否为私信
function isPrivateMessage(channelId) {
  return /^private:/.test(channelId);
}

// 发送任务消息
function sendTaskMessage(task) {
  if (isPrivateMessage(task.channelId)) {
    sendPrivateMessage(task.platform, task.userId, task.message);
  } else {
    sendMessage(task.platform, task.channelId, task.message, task.recipients);
  }
}

// 回复消息
function replyMessage(session, message) {
  session.send(`<quote id="${session.event.message.id}"/>${message}`);
}

// 解析recipients参数，提取出纯数字id列表，若字符串不合法则返回null
function parseRecipients(recipients) {
  if (recipients) {
    // 验证recipients是否只包含at标签、基础id和空格
    let cleaned = recipients
      .replace(/<at\s+[^>]*?\bid\s*=\s*"\d+"[^>]*?>/g, "")
      .replace(/\b\d+\b/g, "")
      .trim();
    if (cleaned) {
      return null;
    }
    // 抓取<at id="..."/>里的id
    const atIds = [
      ...recipients.matchAll(/<at\s+[^>]*?\bid\s*=\s*"(\d+)"[^>]*?>/g),
    ].map((m) => m[1]);

    // 去掉at标签后，剩下的纯数字id
    const withoutAt = recipients.replace(
      /<at\s+[^>]*?\bid\s*=\s*"\d+"[^>]*?>/g,
      " ",
    );
    const plainIds = withoutAt.match(/\b\d+\b/g) || [];

    return [...atIds, ...plainIds];
  } else {
    return null;
  }
}

module.exports = { sendMessage, sendPrivateMessage, isPrivateMessage, sendTaskMessage, replyMessage, parseRecipients };
