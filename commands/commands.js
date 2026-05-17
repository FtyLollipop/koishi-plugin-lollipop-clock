const { h } = require("koishi");
const dayjs = require("dayjs");
const store = require("../store/store");
const {
  isPrivateMessage,
  replyMessage,
  parseRecipients,
} = require("../utils/message");
const { getGuildMemberList, getMembersByUserIds } = require("../utils/guild");
const { parseCountdownTextToDate } = require("../utils/time");

function registerCommands() {
  // 创建提醒
  store.ctx
    .command(
      "clock <time:string> <message:string> [...recipients:text]",
      "新增定时提醒（倒计时）",
    )
    .usage(
      "time 时间，message 提醒消息，recipients 提醒人，手动at或QQ号；空格隔开；不填默认是自己",
    )
    .action(async (argv, time, message, recipients) => {
      if (time == null || time.trim() === "") {
        replyMessage(argv.session, "定时时间不能为空");
        return;
      }
      const privateMsg = isPrivateMessage(argv.session.event.channel.id);
      const taskTime = parseCountdownTextToDate(time);
      let taskRecipients;

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

      if (taskTime > new Date("2099-12-31")) {
        replyMessage(argv.session, "时间太远了，请设置在2099年12月31日之前");
        return;
      }

      if (message == null || message.trim() === "") {
        replyMessage(argv.session, "提醒消息不能为空");
        return;
      }

      let guildRecipients;

      // 如果是群聊，处理提醒人参数
      if (!privateMsg) {
        // 提取提醒人ID
        taskRecipients = recipients
          ? parseRecipients(recipients)
          : [argv.session.event.user.id];

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
        guildRecipients = await getMembersByUserIds(
          argv.session.event.platform,
          argv.session.event.channel.id,
          taskRecipients,
        );
        if (guildRecipients.nonMembers.length > 0) {
          return replyMessage(
            argv.session,
            `提醒人[QQ:${guildRecipients.nonMembers[0]}]不在当前群聊中，请检查后重新设置`,
          );
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
            `🚫无法创建定时提醒，定时提醒总数量已达到上限：${store.config.totalQuantityLimit}条`,
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
            `🚫无法创建定时提醒，你创建的定时提醒数量已达到上限：${store.config.userQuantityLimit}条`,
          );
          return;
        }
      }

      const task = await store.scheduleManager.addTask({
        platform: argv.session.event.platform,
        channelId: argv.session.event.channel.id,
        userId: argv.session.event.user.id,
        time: dayjs(taskTime).format("YYYY-MM-DD HH:mm:ss"),
        message: h.escape(message),
        recipients: taskRecipients,
      });
      replyMessage(
        argv.session,
        `✅定时设置成功\n[${task.id}] ${dayjs(taskTime).format("YYYY-MM-DD HH:mm:ss")}将会提醒${
          privateMsg
            ? "你"
            : guildRecipients.members
                .map((m) => {
                  return `[${m.user.id} ${m.user?.name ?? "未知"}]`;
                })
                .join(",")
        }`,
      );
    });

  // 查看提醒列表
  store.ctx
    .command(
      "clock.list [scope:string]",
      "提醒时间升序列出当前会话下自己的所有定时提醒",
    )
    .usage(
      "scope 查看列表范围，可选值为：self自己；all当前会话下全部；QQ号；手动at",
    )
    .action(async (argv, scope) => {
      const privateMsg = isPrivateMessage(argv.session.event.channel.id);

      let listScope = "self";
      let guildMembers;
      let scopeUser;
      // 如果是群聊
      if (!privateMsg) {
        // 解析列表范围选项参数
        if (!scope) {
          listScope = "self";
        } else if (scope === "self" || scope === "all") {
          listScope = scope;
        } else {
          const scopeIdList = parseRecipients(scope);
          if (!scopeIdList) {
            replyMessage(
              argv.session,
              "参数格式错误，列表范围应该只包含self；all；手动at或QQ号",
            );
            return;
          } else {
            listScope =
              scopeIdList[0] === argv.session.event.user.id
                ? "self"
                : scopeIdList[0];
          }
        }
        if (!store.config.allowQueryAll && listScope && listScope !== "self") {
          replyMessage(
            argv.session,
            "🚫插件设置不允许查询其他用户定时提醒列表",
          );
          return;
        }

        guildMembers = await getGuildMemberList(
          argv.session.event.platform,
          argv.session.event.channel.id,
        );
        scopeUser = guildMembers.filter((m) => m.user.id === listScope);

        if (listScope !== "self" && listScope !== "all") {
          // 验证指定用户是否在群聊中
          if (scopeUser.length === 0) {
            replyMessage(argv.session, "参数错误，指定的用户不在当前群聊中");
            return;
          }
        }
      }

      const tasks = await store.scheduleManager.getTasks(
        argv.session.event.platform,
        argv.session.event.channel.id,
        listScope === "all"
          ? undefined
          : listScope === "self"
            ? argv.session.event.user.id
            : listScope,
      );
      if (tasks.length === 0) {
        replyMessage(
          argv.session,
          `${
            listScope === "self"
              ? "你"
              : listScope === "all"
                ? "当前会话"
                : `[${listScope} ${scopeUser[0]?.user?.name ?? "未知"}]`
          }没有设置任何定时提醒`,
        );
        return;
      }
      let msg = `${
        listScope === "self"
          ? "你"
          : listScope === "all"
            ? "当前会话"
            : `[${listScope} ${scopeUser[0]?.user?.name ?? "未知"}]`
      }设置的定时提醒有：\n<message forward><message>`;
      tasks.sort((a, b) => a.time.localeCompare(b.time));
      tasks.forEach((task) => {
        msg += `⭐[${task.id}] ${task.time}\n💬 ${task.message}${
          privateMsg
            ? ""
            : "\n👤 " +
              task.recipients
                .map((id) => {
                  const member = guildMembers?.find((m) => m.user.id === id);
                  return `[${id} ${member ? member.user.name : "未知"}]`;
                })
                .join(",")
        }\n\n`;
      });
      msg += "</message></message>";
      replyMessage(argv.session, msg);
    });

  // 订阅提醒
  store.ctx
    .command(
      "clock.subscribe <id:number>",
      "订阅一个定时提醒（将自己加入提醒人列表中）",
    )
    .usage("id 定时提醒的ID，可从提醒列表中查看")
    .action(async (argv, id) => {
      if (isPrivateMessage(argv.session.event.channel.id)) return;
      const task = store.scheduleManager.getTaskById(id);
      if (!task) {
        replyMessage(argv.session, "未找到该定时提醒");
        return;
      }
      if (
        task.platform !== argv.session.event.platform ||
        task.channelId !== argv.session.event.channel.id
      ) {
        replyMessage(argv.session, "未找到该定时提醒");
        return;
      }
      if (
        !store.config.allowSubscribeOthers &&
        task.userId !== argv.session.event.user.id
      ) {
        replyMessage(argv.session, "插件设置不允许订阅其他用户定时提醒");
        return;
      }
      if (task.recipients.includes(argv.session.event.user.id)) {
        replyMessage(argv.session, "你已经存在于该定时提醒的提醒人列表中");
        return;
      }
      store.scheduleManager.subscribeTask(id, argv.session.event.user.id);
      replyMessage(argv.session, "定时提醒订阅成功");
    });

  // 取消订阅提醒
  store.ctx
    .command(
      "clock.unsubscribe <id:number>",
      "取消订阅一个定时提醒（将自己从提醒人列表中移除）",
    )
    .usage("id 定时提醒的ID，可从提醒列表中查看")
    .action(async (argv, id) => {
      if (isPrivateMessage(argv.session.event.channel.id)) return;
      const task = store.scheduleManager.getTaskById(id);
      if (!task) {
        replyMessage(argv.session, "未找到该定时提醒");
        return;
      }
      if (
        task.platform !== argv.session.event.platform ||
        task.channelId !== argv.session.event.channel.id
      ) {
        replyMessage(argv.session, "未找到该定时提醒");
        return;
      }
      if (!task.recipients.includes(argv.session.event.user.id)) {
        replyMessage(argv.session, "你不在该定时提醒的提醒人列表中");
        return;
      }
      store.scheduleManager.unsubscribeTask(id, argv.session.event.user.id);
      replyMessage(argv.session, "定时提醒取消订阅成功");
    });

  // 取消提醒
  store.ctx
    .command("clock.cancel <id:number>", "取消一个定时")
    .usage("id 定时提醒的ID，可从提醒列表中查看")
    .action(async (argv, id) => {
      const task = store.scheduleManager.getTaskById(id);
      if (!task) {
        replyMessage(argv.session, "未找到该定时提醒");
        return;
      }

      if (
        task.userId !== argv.session.event.user.id &&
        !store.config.superAdminList.includes(argv.session.event.user.id) &&
        store.config.enableGroupAdmin &&
        (argv.session.event.member?.roles?.includes("owner") ||
          argv.session.event.member?.roles?.includes("admin"))
      ) {
        replyMessage(argv.session, "你没有权限取消该定时提醒");
        return;
      }
      store.scheduleManager.removeTask(id);
      replyMessage(argv.session, "定时提醒取消成功");
    });

  // 清楚所有提醒
  store.ctx
    .command("clock.clear [scope:string]", "清除所有定时提醒")
    .usage(
      "只会清除当前会话的定时提醒。scope 清除范围，可选值为：self自己；all当前会话下全部；QQ号；手动at",
    )
    .action(async (argv, scope) => {
      const privateMsg = isPrivateMessage(argv.session.event.channel.id);

      let clearScope = "self";
      let scopeUser;
      // 如果是群聊
      if (!privateMsg) {
        // 解析列表范围选项参数
        if (!scope) {
          clearScope = "self";
        } else if (scope === "self" || scope === "all") {
          clearScope = scope;
        } else {
          const scopeIdList = parseRecipients(scope);
          if (!scopeIdList) {
            replyMessage(
              argv.session,
              "参数格式错误，清除范围应该只包含self；all；手动at或QQ号",
            );
            return;
          } else {
            clearScope =
              scopeIdList[0] === argv.session.event.user.id
                ? "self"
                : scopeIdList[0];
          }
        }

        if (
          !store.config.superAdminList.includes(argv.session.event.user.id) &&
          store.config.enableGroupAdmin &&
          (argv.session.event.member?.roles?.includes("owner") ||
            argv.session.event.member?.roles?.includes("admin"))
        ) {
          replyMessage(argv.session, "你没有权限清除该范围内的定时提醒");
          return;
        }

        if (clearScope !== "self" && clearScope !== "all") {
          // 验证指定用户是否在群聊中
          const guildMembers = await getGuildMemberList(
            argv.session.event.platform,
            argv.session.event.channel.id,
          );

          scopeUser = guildMembers.filter((m) => m.user.id === clearScope);
          if (scopeUser.length === 0) {
            replyMessage(argv.session, "参数错误，指定的用户不在当前群聊中");
            return;
          }
        }
      }

      const tasks = await store.scheduleManager.getTasks(
        argv.session.event.platform,
        argv.session.event.channel.id,
        clearScope === "self"
          ? argv.session.event.user.id
          : clearScope === "all"
            ? undefined
            : clearScope,
      );
      if (tasks.length === 0) {
        replyMessage(
          argv.session,
          `${
            clearScope === "self"
              ? "你"
              : clearScope === "all"
                ? "所有用户"
                : `[${clearScope} ${scopeUser[0]?.user?.name ?? "未知"}]`
          }没有设置任何定时提醒`,
        );
        return;
      }
      tasks.forEach((task) => {
        store.scheduleManager.removeTask(task.id);
      });
      replyMessage(
        argv.session,
        `${
          clearScope === "self"
            ? "你"
            : clearScope === "all"
              ? "所有用户"
              : `[${clearScope} ${scopeUser[0]?.user?.name ?? "未知"}]`
        }的定时提醒已清除`,
      );
    });
}

module.exports = { registerCommands };
