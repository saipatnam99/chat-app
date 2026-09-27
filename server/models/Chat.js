const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  name: String,
  users: [String],
  isGroup: Boolean,
});

module.exports = mongoose.model("Chat", chatSchema);