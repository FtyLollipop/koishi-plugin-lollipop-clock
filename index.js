const { Schema } = require("koishi");
const store = require("./store/store");
const Database = require("./services/database");
const ScheduleManager = require("./services/schedule-manager");
const { registerCommands } = require("./commands/commands");

const name = "koishi-plugin-lollipop-clock";
const inject = ["database"];

const defaultConfig = {
  enableRunMissedJob: false,
  enableQuantityLimit: false,
  totalQuantityLimit: 5000,
  userQuantityLimit: 50
};

const Config = Schema.intersect([
  Schema.object({
    enableRunMissedJob: Schema.boolean()
      .default(defaultConfig.enableRunMissedJob)
      .description("启动后已错过的定时提醒是否执行"),
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
