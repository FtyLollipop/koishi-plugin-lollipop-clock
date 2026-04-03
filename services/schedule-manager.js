const store = require("../store/store");
const Task = require("../models/task");

class ScheduleManager {
  #tasks;
  #db;

  constructor(db) {
    this.#tasks = new Map();
    this.#db = db;

    // 从数据库加载任务
    this.loadTasksFromDatabase();
  }

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
  }

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
  }

  removeTask(taskId) {
    this.getTaskById(taskId)?.stop();
    this.#tasks.delete(taskId);
    this.#db.deleteTaskById(taskId);
  }

  getTaskById(taskId) {
    return this.#tasks.get(taskId);
  }

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
