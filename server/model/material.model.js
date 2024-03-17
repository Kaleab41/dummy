const mongoose = require("mongoose");

const newSchema = new mongoose.Schema({
  id: String,
  sender: String,
  message: String,
  file: String,
});

module.exports = mongoose.model("material", newSchema);
