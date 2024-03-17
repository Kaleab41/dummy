const mongoose = require("mongoose");

const newSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  password: String,
  phone: Number,
});

module.exports = mongoose.model("admin", newSchema);
