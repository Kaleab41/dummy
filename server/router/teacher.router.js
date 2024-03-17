const express = require("express");
const teacherModel = require("../model/teacher.model");
const studentModel = require("../model/student.model");
const materialModel = require("../model/material.model");
const router = express.Router();
const gradeModel = require("../model/grade.model");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const multer = require("multer");
const crypto = require("crypto");
function generateID() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "TR" + "";

  // Generate two random letters
  for (let i = 0; i < 2; i++) {
    id += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate four random numbers
  for (let i = 0; i < 4; i++) {
    id += Math.floor(Math.random() * 10);
  }

  return id;
}
router.get("/response", (req, res) => {
  res.status(200).json({ reponse: "Responds Perfectly" });
});

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/teacher"); // Save uploaded files to the 'uploads/teacher' directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

// Initialize multer upload with defined storage
const upload = multer({ storage: storage });

router.post(
  "/register",
  upload.fields([
    { name: "curriculumVitae", maxCount: 1 },
    { name: "qualifications", maxCount: 1 },
    { name: "certifications", maxCount: 1 },
  ]),
  
  (req, res) => {
    // Check if the provided email already exists
    teacherModel
      .findOne({ email: req.body.email })
      .then((existingEmail) => {
        if (existingEmail) {
          // Email already exists
          return res.status(409).json({ error: "Email already exists" });
        } else {
          // Check if the provided ID already exists
          teacherModel
            .findOne({ id: generateID() })
            .then((existingID) => {
              if (existingID) {
                // ID already exists
                return res.status(409).json({ error: "ID already exists" });
              } else {
                // Both email and ID are unique, perform file upload
                // Retrieve uploaded files
                const files = req.files;
                const uploadedCV = files["curriculumVitae"][0];
                const uploadedQualifications = files["qualifications"][0];
                const uploadedCertifications = files["certifications"][0];

                // Create and save the new teacher
                const newTeacher = new teacherModel({
                  id: generateID(), // Use provided ID
                  name: req.body.name,
                  gender: req.body.gender,
                  email: req.body.email,
                  phone: req.body.phone,
                  curriculumVitae: uploadedCV ? uploadedCV.filename : null,
                  qualifications: uploadedQualifications
                    ? uploadedQualifications.filename
                    : null,
                  certifications: uploadedCertifications
                    ? uploadedCertifications.filename
                    : null,
                  interviewDate: req.body.date,
                });

                newTeacher
                  .save()
                  .then((savedTeacher) => {
                    res.status(201).json(savedTeacher);
                  })
                  .catch((err) => {
                    console.error(err);
                    res.status(500).json({ error: "Internal server error" });
                  });
              }
            })
            .catch((err) => {
              console.error(err);
              res.status(500).json({ error: "Internal server error" });
            });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      });
  }
);

router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    console.log("File name:", fileName); // Log the file name

    // Extract instructor name, course name, and batch from the file name
    const fileNameParts = fileName.split("-");
    console.log("File name parts:", fileNameParts); // Log the file name parts

    if (fileNameParts.length !== 3 || !fileName.endsWith(".xlsx")) {
      return res.status(400).json({ error: "Invalid file name format" });
    }

    const instructorName = fileNameParts[0].trim();
    const course = fileNameParts[1].trim();
    const batch = fileNameParts[2].trim().split(".")[0];

    // Read the uploaded Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Process the data and populate fields accordingly
    data.forEach((row) => {
      const { Name, ID, Grade, Mid, Final, Assessment, Total } = row;

      // Populate fields and save to database
      const newGrade = new gradeModel({
        instructor: instructorName,
        course: course,
        batch: batch,
        studentName: Name,
        id: ID,
        grade: Grade,
        mid: Mid,
        final: Final,
        assessment: Assessment,
        total: Total,
        file: req.file ? req.file.filename : null, // Use req.file.filename to get the file name
      });

      // Save the grade to the database
      newGrade.save().then(() => {
        console.log("Grade uploaded:", row);
      });
    });

    // Delete the uploaded file after processing
    fs.unlinkSync(filePath);

    res
      .status(200)
      .json({ message: "Excel data uploaded and grades added successfully" });
  } catch (error) {
    console.error("Error uploading file and processing data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/sendnotifications", async (req, res) => {
  try {
    const { batch, sender, message } = req.body;

    // Find all students in the specified batch
    const students = await studentModel.find({ batch });

    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ error: "No students found in the specified batch." });
    }

    // Add the notification to each student's notifications array
    for (const student of students) {
      student.notifications.push({ sender, message, time: Date.now() });
      await student.save();
    }

    return res
      .status(200)
      .json({ message: "Notifications sent successfully." });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/signin", (req, res) => {
  teacherModel
    .findOne({
      email: req.body.email,
    })
    .then((data) => {
      if (data) {
        // Check if the user is restricted
        if (data.restricted) {
          return res.status(403).json({ error: "User is restricted." });
        }

        // Hash the provided password
        const hashedPassword = crypto
          .createHash("sha256")
          .update(req.body.password)
          .digest("base64");

        // Compare hashed password
        if (hashedPassword === data.password) {
          console.log(data);
          return res.status(200).json(data);
        } else {
          // Password incorrect
          return res.status(401).json({ error: "Password incorrect." });
        }
      } else {
        // User ID doesn't exist
        return res.status(404).json({ error: "User doesn't exist." });
      }
    })
    .catch((error) => {
      // Handle any other errors
      console.error("Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    });
});

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the email already exists
    const existingTeacher = await teacherModel.findOne({ email });

    if (existingTeacher) {
      // Email already exists, assign the password to the existing teacher
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("base64");

      existingTeacher.password = hashedPassword;
      await existingTeacher.save();

      return res
        .status(200)
        .json({ message: "Password assigned successfully" });
    }

    // Hash the provided password
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("base64");

    // Create a new teacher
    const newTeacher = new teacherModel({
      email,
      password: hashedPassword,
    });

    // Save the new teacher to the database
    const savedTeacher = await newTeacher.save();

    console.log("New teacher created:", savedTeacher);
    return res.status(201).json({ message: "Teacher created successfully" });
  } catch (error) {
    console.error("Error saving teacher:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/allocatedCourses", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the provided email exists
    const existingTeacher = await teacherModel.findOne({ email });
    if (!existingTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Retrieve assigned courses for the teacher
    const allocatedCourses = existingTeacher.assignedCourses;

    return res.status(200).json({ allocatedCourses });
  } catch (error) {
    console.error("Error retrieving allocated courses:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// Route to upload file and send notifications to all students
const materialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/material"); // Save uploaded files to the 'uploads/material' directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const uploadMaterial = multer({ storage: materialStorage });

router.post("/uploadmaterial", uploadMaterial.single("file"), async (req, res) => {
  try {
    // Extract notification message, sender, and batch from request body
    const { message, sender, batch } = req.body;

    // Save the uploaded file path in the database
    const newMaterial = new materialModel({
      sender: sender, // Assuming admin is sending the notification
      message: message,
      file: req.file.path, // File path returned by Multer
    });
    await newMaterial.save();

    // Fetch students belonging to the specified batch from the database
    const students = await studentModel.find({ batch: batch });

    // Iterate over each student and send notification
    students.forEach(async (student) => {
      // Update student's notifications array with the new message
      student.notifications.push({ message: message,sender: sender , file:req.file.path });
      await student.save();
    });

    // Return success response
    res.status(200).json({ message: "File uploaded and notifications sent to students in the specified batch." });
  } catch (error) {
    console.error("Error uploading file and sending notifications:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});
router.post("/uploadattendance", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const fileName = req.file.originalname;
    const fileNameParts = fileName.split("-");
    const batch = fileNameParts[1]; // Assuming batch name is in the second part
    const courseCode = fileNameParts[2]; // Assuming course code is in the third part

    // Load the attendance Excel file
    const workbook = xlsx.readFile(req.file.path);

    // Assuming the attendance data is in the first sheet and has columns "ID" and "Attendance"
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const attendanceData = xlsx.utils.sheet_to_json(worksheet);

    // Iterate over each attendance record and update attendance in the grade model
    for (const record of attendanceData) {
      const { ID, Attendance } = record;

      // Update attendance for the student's grade using the ID, batch, and course code
      let updatedGrade = await gradeModel.findOneAndUpdate(
        { id: ID, batch: batch, course: courseCode },
        { $set: { "attendance.0": { date: new Date(), status: Attendance } } },
        { new: true } // Return the updated document
      );

      // If grade document doesn't exist, create a new one
      if (!updatedGrade) {
        updatedGrade = new gradeModel({
          id: ID,
          batch: batch,
          course: courseCode,
          attendance: [{ date: new Date(), status: Attendance }],
        });
        await updatedGrade.save();
      }
    }

    // Delete the uploaded file after processing
    fs.unlinkSync(req.file.path);

    return res.status(200).json({ message: "Attendance updated successfully." });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
