const store = require("../store/store");
const Task = require("../models/task");

class ScheduleManager {
  #tasks;
  #db;

  constructor(db) {
    this.#tasks = new Map();
    this.#db = db;
    this.loadTasksFromDatabase();
  }

  // 从数据库加载任务
  async loadTasksFromDatabase() {
    const tasksData = await this.#db.getTasks();
    if (tasksData.length === 0) return;
    tasksData.forEach((taskData) => {
      const task = new Task({
        ...taskData,
        callback: (id) => {
          this.removeTask(id);
        },
      });
      // 如果启用了错过执行补偿，并且任务时间已经过去了，那么立即执行任务并删除
      if (store.config.enableMissedRun) {
        const now = new Date();
        const taskTime = new Date(taskData.time);
        if (taskTime <= now) {
          setTimeout(() => {
            task.execute();
            this.removeTask(taskData.id);
          }, 5000);
          return;
        }
      } else {
        this.removeTask(taskData.id);
      }
      this.#tasks.set(task.id, task);
      task.start();
    });
    store.ctx.logger.info(`已从数据库加载 ${tasksData.length} 个定时任务`);
  }

  // 添加
  async addTask({
    id,
    platform,
    channelId,
    userId,
    time,
    message,
    recipients,
  }) {
    const task = new Task({
      id,
      platform,
      channelId,
      userId,
      time,
      message,
      recipients,
      callback: (id) => {
        this.removeTask(id);
      },
    });
    const savedTask = await this.#db.saveTask(task);
    task.id = savedTask.id;
    this.#tasks.set(savedTask.id, task);
    task.start();
    return task;
  }

  // 订阅
  async subscribeTask(taskId, userId) {
    const task = this.getTaskById(taskId)
    task.stop()
    task.recipients.push(userId)
    await this.#db.updateTask(task)
    task.start()
  }

  // 取消订阅
  async unsubscribeTask(taskId, userId) {
    const task = this.getTaskById(taskId)
    task.stop()
    task.recipients = task.recipients.filter(id => id !== userId)
    await this.#db.updateTask(task)
    task.start()
  }

  // 删除
  removeTask(taskId) {
    if(taskId == undefined) return;
    const task = this.getTaskById(taskId);
    if(!task) return;
    task.stop();
    this.#tasks.delete(taskId);
    this.#db.deleteTaskById(taskId);
  }

  // 通过ID获取
  getTaskById(taskId) {
    return this.#tasks.get(taskId);
  }

  // 获取列表
  getTasks(platform, channelId, userId) {
    let tasks = Array.from(this.#tasks.values());
    if (platform) {
      tasks = tasks.filter((task) => task.platform === platform);
    }
    if (channelId) {
      tasks = tasks.filter((task) => task.channelId === channelId);
    }
    if (userId) {
      tasks = tasks.filter((task) => task.userId === userId);
    }
    return tasks;
  }
}

module.exports = ScheduleManager;
