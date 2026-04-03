const schedule = require("node-schedule");
const { sendTaskMessage } = require("../utils/message");

class Task {
  #callback = null;
  #job = null;
  id;
  platform;
  channelId;
  userId;
  time;
  message;
  recipients;

  constructor({
    id,
    platform,
    channelId,
    userId,
    time,
    message,
    recipients,
    callback,
  }) {
    this.id = id;
    this.platform = platform;
    this.channelId = channelId;
    this.userId = userId;
    this.time = time;
    this.message = message;
    this.recipients = recipients;
    this.#callback = callback;
  }

  execute() {
    sendTaskMessage(this);

    if (this.#callback) {
      this.#callback(this.id);
    }
  }

  start() {
    this.#job = schedule.scheduleJob(new Date(this.time), () => {
      this.execute();
    });
  }

  stop() {
    if (this.#job) {
      this.#job.cancel();
      this.#job = null;
    }
  }
}

module.exports = Task;
