const { Schema } = require("koishi");
const store = require("./store/store");
const Database = require("./services/database");
const ScheduleManager = require("./services/schedule-manager");
const { registerCommands } = require("./commands/commands");

const name = "koishi-plugin-lollipop-clock";
const inject = ["database"];

const defaultConfig = {
  superAdminList: [],
  enableGroupAdmin: false,
  enableRunMissedJob: false,
  allowQueryAll: false,
  allowSubscribeOthers: false,
  enableQuantityLimit: false,
  totalQuantityLimit: 5000,
  userQuantityLimit: 50,
};

const Config = Schema.intersect([
  Schema.object({
    superAdminList: Schema.array(String)
      .default(defaultConfig.superAdminList)
      .description("超级管理员QQ号列表"),
    enableGroupAdmin: Schema.boolean()
      .default(defaultConfig.enableGroupAdmin)
      .description("是否允许群主和管理员管理群内定时"),
    enableRunMissedJob: Schema.boolean()
      .default(defaultConfig.enableRunMissedJob)
      .description("启动后已错过的定时提醒是否执行"),
    allowQueryAll: Schema.boolean()
      .default(defaultConfig.allowQueryAll)
      .description("允许查看当前会话其他用户的定时列表"),
    allowSubscribeOthers: Schema.boolean()
      .default(defaultConfig.allowSubscribeOthers)
      .description("允许订阅当前会话下其他人的定时提醒"),
  }).description("基础配置"),
  Schema.object({
    enableQuantityLimit: Schema.boolean()
      .default(false)
      .description("开启数量限制"),
  }).description("数量限制"),
  Schema.union([
    Schema.object({
      enableQuantityLimit: Schema.const(true).required(),
      totalQuantityLimit: Schema.number()
        .default(defaultConfig.totalQuantityLimit)
        .min(0)
        .step(1)
        .required()
        .description("最大定时总量限制"),
      userQuantityLimit: Schema.number()
        .default(defaultConfig.userQuantityLimit)
        .min(0)
        .step(1)
        .required()
        .description("每人最大定时数量"),
    }),
    Schema.object({}),
  ]),
]);

function apply(ctx, config) {
  store.ctx = ctx;
  store.config = config;
  // 初始化数据库
  store.db = new Database(ctx);

  // 初始化任务列表
  store.scheduleManager = new ScheduleManager(store.db);

  // 注册指令
  registerCommands();
}

module.exports = { name, inject, Config, apply };
