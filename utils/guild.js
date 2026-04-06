const store = require("../store/store");

async function getGuildMemberList(platform, guildId) {
  const bot = store.ctx.bots.filter((bot) => bot.platform === platform)[0];
  if (bot) {
    const guildMemberData = await bot.getGuildMemberList(guildId)
    return guildMemberData?.data ?? null;
  } else {
    console.error("获取群成员失败: 未找到对应平台的机器人");
    return null;
  }
}

async function getMembersByUserIds(platform, guildId, userIds) {
  let result = {
    members: [],
    nonMembers: []
  }
  const memberList = await getGuildMemberList(platform, guildId)
  if(memberList === null) return result;
  userIds.forEach(id => {
    const memberFound = memberList.find(m => m.user.id === id)
    if(memberFound) {
      result.members.push(memberFound)
    } else {
      result.nonMembers.push(id)
    }
  })
  return result;
}

module.exports = { getGuildMemberList, getMembersByUserIds };
