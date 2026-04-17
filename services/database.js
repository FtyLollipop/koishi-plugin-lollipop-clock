const TABLE_NAME = "lollipop-clock";

class Database {
  #ctx = null;

  constructor(ctx) {
    this.#ctx = ctx;

    ctx.model.extend(
      TABLE_NAME,
      {
        id: "unsigned",
        platform: "string",
        channelId: "string",
        userId: "string",
        time: "string",
        message: "string",
        recipients: "list",
      },
      {
        primaryKey: "id",
        autoInc: true,
      },
    );
  }

  getTaskById(id) {
    return this.#ctx.database.get(TABLE_NAME, id);
  }

  getTasks(platform, channelId, userId) {
    let query = {};
    if (platform) query.platform = platform;
    if (channelId) query.channelId = channelId;
    if (userId) query.userId = userId;
    return this.#ctx.database.get(TABLE_NAME, query);
  }

  saveTask({ platform, channelId, userId, time, message, recipients }) {
    return this.#ctx.database.create(TABLE_NAME, {
      platform,
      channelId,
      userId,
      time,
      message,
      recipients,
    });
  }

  updateTask({ id, platform, channelId, userId, time, message, recipients }) {
    return this.#ctx.database.set(
      TABLE_NAME,
      { id },
      { platform, channelId, userId, time, message, recipients },
    );
  }

  deleteTaskById(id) {
    try {
      return this.#ctx.database.remove(TABLE_NAME, { id });
    } catch (error) {
      this.#ctx.logger.error("删除任务失败:\n", error);
      return false;
    }
  }

  deleteTasks(platform, channelId, userId) {
    try {
      let query = {};
      if (platform) query.platform = platform;
      if (channelId) query.channelId = channelId;
      if (userId) query.userId = userId;
      if (Object.keys(query).length === 0) {
        return false;
      }
      this.#ctx.database.remove(TABLE_NAME, query);
      return true;
    } catch (error) {
      this.#ctx.logger.error("删除任务失败:\n", error);
      return false;
    }
  }
}

module.exports = Database;
