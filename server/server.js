const express = require("express");
const cors = require("cors");
const bodyParses = require("body-parser");

const app = express();
const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();
const PORT = 8000 || process.env.PORT;
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL);

app.use(cors());
app.use(bodyParses.urlencoded({ extended: true }));
app.use(bodyParses.json());

app.use("/teacher", require("./router/teacher.router"));
app.use("/admin", require("./router/admin.router"));
app.use("/student", require("./router/student.router"));
app.listen(PORT, () => {
  console.log(`Listening to port ${PORT}`);
});
