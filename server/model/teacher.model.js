const mongoose = require("mongoose");

const newSchema = new mongoose.Schema({
  id: String,
  name: String,
  gender: String,
  email: String,
  password: String,
  phone: Number,
  restricted: {
    type: Boolean,
    default: true,
  },
  curriculumVitae: String,
  qualifications: String,
  certifications: String,
  interviewDate: Date,
  assignedCourses: [String],
  changeRequests: [
    {
      sender: String,
      message: String,
      approved: {
        type: Boolean,
        default: false,
      },
      time: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});
module.exports = mongoose.model("teacher", newSchema);
