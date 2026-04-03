const dayjs = require("dayjs");

function parseCountdownTextToDate(text) {
  const now = new Date();
  const result = new Date(now);

  const patterns = {
    year: /(\d+)\s*(?:年|y|yr|year)/,
    month: /(\d+)\s*(?:月|个月|mon|month)/,
    week: /(\d+)\s*(?:周|星期|w|wk|week)/,
    day: /(\d+)\s*(?:天|d|day)/,
    hour: /(\d+)\s*(?:小时|时|h|hr|hour)/,
    minute: /(\d+)\s*(?:分(?:钟)?|min|m|minute)/,
    second: /(\d+)\s*(?:秒(?:钟)?|s|sec|second)/,
  };

  const matches = {
    year: text.match(patterns.year),
    month: text.match(patterns.month),
    week: text.match(patterns.week),
    day: text.match(patterns.day),
    hour: text.match(patterns.hour),
    minute: text.match(patterns.minute),
    second: text.match(patterns.second),
  };

  // Check for irrelevant content
  let cleanedText = text;
  for (const key in patterns) {
    cleanedText = cleanedText.replace(patterns[key], "");
  }
  cleanedText = cleanedText.trim();
  if (cleanedText !== "") {
    return null;
  }

  if (matches.year)
    result.setFullYear(result.getFullYear() + parseInt(matches.year[1]));
  if (matches.month)
    result.setMonth(result.getMonth() + parseInt(matches.month[1]));
  if (matches.week)
    result.setDate(result.getDate() + parseInt(matches.week[1]) * 7);
  if (matches.day) result.setDate(result.getDate() + parseInt(matches.day[1]));
  if (matches.hour)
    result.setHours(result.getHours() + parseInt(matches.hour[1]));
  if (matches.minute)
    result.setMinutes(result.getMinutes() + parseInt(matches.minute[1]));
  if (matches.second)
    result.setSeconds(result.getSeconds() + parseInt(matches.second[1]));

  return result;
}

module.exports = { parseCountdownTextToDate };
