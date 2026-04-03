const store = require("../store/store");

function getGuildMemberList(platform, guildId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    return bot.getGuildMemberList(guildId);
  } else {
    console.error("获取群成员失败: 未找到对应平台的机器人");
    return null;
  }
}

module.exports = { getGuildMemberList };
