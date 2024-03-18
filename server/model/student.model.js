const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  id: String,
  batch: String,
  name: String,
  gender: String,
  email: String,
  password: {
    type: String,
    default: null,
  },
  phone: String, // Changed to String for better handling of phone numbers
  guardianPhone: String,
  guardianName: String,
  department: String,
  aboutYou: String,
  academicRecord: {
    data: Buffer, // Changed to lowercase for Buffer type
    contentType: {
      type: String,
      default: "application/octet-stream", // Default MIME type
    },
  },
  restricted: {
    type: Boolean,
    default: true,
  },
  notifications: [
    {
      sender: String,
      message: String,
      file: String,
      time: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("Student", studentSchema); // Changed model name to uppercase convention
