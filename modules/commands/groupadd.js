const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "groupadd",
  version: "1.1",
  hasPermssion: 2,
  credits: "rX",
  description: "Add group to thuebot.json with flexible period",
  commandCategory: "Admin",
  usages: "!group add <tid> <number+unit> (e.g., 2year, 10day, 6month)",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  if (args.length < 2) return api.sendMessage("Usage: !group add <tid> <number+unit> (e.g., 2year, 10day, 6month)", event.threadID);

  const tid = args[0];
  const periodInput = args[1].toLowerCase();

  // Match number + unit
  const match = periodInput.match(/^(\d+)(day|month|year)$/);
  if (!match) return api.sendMessage("Invalid format! Example: 2year, 10day, 6month", event.threadID);

  const number = parseInt(match[1]);
  const unit = match[2];

  let startDate = new Date();
  let endDate = new Date();

  switch (unit) {
    case "day":
      endDate.setDate(endDate.getDate() + number);
      break;
    case "month":
      endDate.setMonth(endDate.getMonth() + number);
      break;
    case "year":
      endDate.setFullYear(endDate.getFullYear() + number);
      break;
  }

  const formatDate = (d) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;

  const newEntry = {
    t_id: tid,
    user: "everyone",
    time_start: formatDate(startDate),
    time_end: formatDate(endDate)
  };

  const filePath = path.join(__dirname, "data", "thuebot.json");

  let data = [];
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.log("File not found or invalid JSON, creating new one.");
  }

  // Avoid duplicates
  if (data.find(e => e.t_id === tid)) {
    return api.sendMessage(`❌ Group ${tid} already exists!`, event.threadID);
  }

  data.push(newEntry);

  // Save in single-line format
  fs.writeFileSync(filePath, JSON.stringify(data), "utf-8");

  api.sendMessage(`✅ Group ${tid} added! Period: ${number} ${unit}`, event.threadID);
};
