const dayjs = require("dayjs");
const store = require("../store/store");
const {
  isPrivateMessage,
  replyMessage,
  parseRecipients,
} = require("../utils/message");
const { getGuildMemberList } = require("../utils/guild");
const { parseCountdownTextToDate } = require("../utils/time");

function registerCommands() {
  // 创建提醒
  store.ctx
    .command("clock <time:string> <message:string> [...recipients:text]")
    .action(async (argv, time, message, recipients) => {
      const privateMsg = isPrivateMessage(argv.session.event.channel.id);
      const taskTime = parseCountdownTextToDate(time);
      let taskRecipients = recipients
        ? parseRecipients(recipients)
        : [argv.session.event.user.id];

      if (taskTime === null) {
        replyMessage(
          argv.session,
          "时间格式错误，请使用类似于“1时30分10秒”或“3h12m20s”的格式",
        );
        return;
      }

      if (taskTime <= new Date()) {
        replyMessage(argv.session, "时间必须是未来的时间，请检查后重新设置");
        return;
      }

      let guildMembers;

      // 如果是群聊，处理提醒人参数
      if (!privateMsg) {
        guildMembers = await getGuildMemberList(
          argv.session.event.platform,
          argv.session.event.channel.id,
        );

        if (taskRecipients === null) {
          replyMessage(
            argv.session,
            "参数格式错误，提醒人应该只包含手动at和QQ号",
          );
          return;
        }

        // 去重提醒人
        taskRecipients = Array.from(new Set(taskRecipients));

        // 验证提醒人是否在群聊中
        let recipientsCheckPassed = true;
        taskRecipients.forEach((recipient) => {
          if (
            !guildMembers.data ||
            !guildMembers.data.some(
              (member) => member.user.id === recipient,
            )
          ) {
            replyMessage(
              argv.session,
              `提醒人[QQ:${recipient}]不在当前群聊中，请检查后重新设置`,
            );
            recipientsCheckPassed = false;
          }
        });
        if (!recipientsCheckPassed) {
          return;
        }
      }

      // 数量限制
      if (store.config.enableQuantityLimit) {
        if (
          store.scheduleManager.getTasks().length >=
          store.config.totalQuantityLimit
        ) {
          replyMessage(
            argv.session,
            `无法创建定时提醒，定时提醒总数量已达到上限：${store.config.totalQuantityLimit}条`,
          );
          return;
        }

        if (
          store.scheduleManager.getTasks(
            argv.session.event.platform,
            undefined,
            argv.session.event.user.id,
          ).length >= store.config.userQuantityLimit
        ) {
          replyMessage(
            argv.session,
            `无法创建定时提醒，你创建的定时提醒数量已达到上限：${store.config.userQuantityLimit}条`,
          );
          return;
        }
      }

      store.scheduleManager.addTask({
        platform: argv.session.event.platform,
        channelId: argv.session.event.channel.id,
        userId: argv.session.event.user.id,
        time: dayjs(taskTime).format("YYYY-MM-DD HH:mm:ss"),
        message,
        recipients: taskRecipients,
      });
      replyMessage(
        argv.session,
        !privateMsg
          ? `⏰定时设置成功，${dayjs(taskTime).format("YYYY-MM-DD HH:mm:ss")}将会提醒${taskRecipients.map(
              (id) => {
                const member = guildMembers.data?.find(
                  (m) => m.user.id === id,
                );
                return `[${id} ${member ? member.user.name : "未知"}]`;
              },
            )}。`
          : `⏰定时设置成功，${dayjs(taskTime).format("YYYY-MM-DD HH:mm:ss")}将会提醒你`,
      );
    });

  // 查看提醒列表
  store.ctx.command("clock.list").action(async (argv) => {
    const privateMsg = isPrivateMessage(argv.session.event.channel.id);

    const tasks = await store.scheduleManager.getTasks(
      argv.session.event.platform,
      argv.session.event.channel.id,
      argv.session.event.user.id,
    );
    if (tasks.length === 0) {
      replyMessage(argv.session, "你没有设置任何定时提醒");
      return;
    }
    let guildMembers;
    if (!privateMsg) {
      guildMembers = await getGuildMemberList(
        argv.session.event.platform,
        argv.session.event.channel.id,
      );
    }
    let msg = "你设置的定时提醒有：\n";
    tasks.sort((a, b) => a.time.localeCompare(b.time));
    tasks.forEach((task) => {
      msg += !privateMsg ? `⭐[${task.id}] ${task.time} 内容: ${task.message} 提醒人: ${task.recipients
        .map((id) => {
          const member = guildMembers.data?.find((m) => m.user.id === id);
          return `[${id} ${member ? member.user.name : "未知"}]`;
        })
        .join(",")}\n\n` :
        `⭐[${task.id}] ${task.time} 内容: ${task.message}`;
    });
    replyMessage(argv.session, msg);
  });

  // 取消提醒
  store.ctx.command("clock.cancel <id:number>").action(async (argv, id) => {
    const task = store.scheduleManager.getTaskById(id);
    if (!task) {
      replyMessage(argv.session, "未找到该定时提醒");
      return;
    }
    if (task.userId !== argv.session.event.user.id) {
      replyMessage(argv.session, "你没有权限取消该定时提醒");
      return;
    }
    store.scheduleManager.removeTask(id);
    replyMessage(argv.session, "定时提醒取消成功");
  });

  // 取消所有提醒
  store.ctx.command("clock.clear").action(async (argv) => {
    const tasks = await store.scheduleManager.getTasks(
      argv.session.event.platform,
      argv.session.event.channel.id,
      argv.session.event.user.id,
    );
    if (tasks.length === 0) {
      replyMessage(argv.session, "你没有设置任何定时提醒");
      return;
    }
    tasks.forEach((task) => {
      store.scheduleManager.removeTask(task.id);
    });
    replyMessage(argv.session, "所有定时提醒已清除");
  });
}

module.exports = { registerCommands };
