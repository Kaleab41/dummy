const express = require("express");
const path = require("path");
const Admin = require("../model/admin.model");
const studentModel = require("../model/student.model");
const payment = require("../model/payment.model");
const courseModel = require("../model/course.model");
const adminModel = require("../model/admin.model");
const router = express.Router();
const ExcelJS = require("exceljs");
const crypto = require("crypto");
const teacherModel = require("../model/teacher.model");
router.post("/verifypayment", (req, res) => {
  const studentId = req.body.id;

  // Check if the payment entry exists
  payment
    .findOne({ id: studentId })
    .then((paymentEntry) => {
      if (!paymentEntry) {
        // Payment entry not found
        return res.status(404).json({ error: "Payment entry not found" });
      }

      // Update the payment verification status
      paymentEntry.verified = true;
      paymentEntry
        .save()
        .then(() => {
          res.status(200).json({ message: "Payment verified successfully" });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});
router.post("/verifystudent", (req, res) => {
  const studentId = req.body.id;

  // Check if the student exists
  studentModel
    .findOne({ id: studentId })
    .then((student) => {
      if (!student) {
        // Student not found
        return res.status(404).json({ error: "Student not found" });
      }

      // Update the student's verification status
      student.restricted = false;
      student
        .save()
        .then(() => {
          res
            .status(200)
            .json({ message: "Student sign-up verified successfully" });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});

// Endpoint to retrieve all students with restricted value as true
router.get("/restricted", (req, res) => {
  // Find all students where restricted value is true
  studentModel
    .find({ restricted: true })
    .then((students) => {
      res.status(200).json(students);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});
// Endpoint to create a new course
router.post("/courses", async (req, res) => {
  try {
    // Extract course name and courseId from request body
    const { name, courseId, year } = req.body;

    // Check if the courseId already exists
    const existingCourse = await courseModel.findOne({ courseId });

    // If courseId already exists, return an error
    if (existingCourse) {
      return res.status(400).json({ error: "Course ID already exists" });
    }

    // Create a new course instance
    const newCourse = new courseModel({
      courseName: req.body.name,
      courseid: req.body.courseId,
      year: req.body.year,
    });

    // Save the new course to the database
    const savedCourse = await newCourse.save();

    // Return the saved course as the response
    res.status(201).json(savedCourse);
  } catch (error) {
    // If an error occurs, return an error response
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/restrictstudent", (req, res) => {
  const studentId = req.body.id;

  // Check if the student exists
  studentModel
    .findOne({ id: studentId })
    .then((student) => {
      if (!student) {
        // Student not found
        return res.status(404).json({ error: "Student not found" });
      }

      // Update the student's verification status
      student.restricted = true;
      student
        .save()
        .then(() => {
          res.status(200).json({ message: "Student banned successfully" });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});
router.get("/getbatches", async (req, res) => {
  try {
    const uniqueBatches = await studentModel.distinct("batch");
    res.status(200).json({ batches: uniqueBatches });
  } catch (error) {
    console.error("Error retrieving unique batches:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/getstudents", async (req, res) => {
  const { batch } = req.body;

  try {
    const studentsInBatch = await studentModel.find(
      { batch: batch },
      { name: 1, _id: 0 }
    );
    if (studentsInBatch.length === 0) {
      return res.status(404).json({ error: "No students found in the batch" });
    }
    const studentNames = studentsInBatch.map((student) => student.name);
    res.status(200).json({ students: studentNames });
  } catch (error) {
    console.error(`Error retrieving students in batch ${batch}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/signin", (req, res) => {
  adminModel
    .findOne({
      email: req.body.email,
    })
    .then((data) => {
      if (data) {
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
router.post("/signup", (req, res) => {
  const { email, password } = req.body;

  // Check if the email already exists
  adminModel
    .findOne({ email })
    .then((existingAdmin) => {
      if (existingAdmin) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash the provided password
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("base64");

      // Create a new admin
      const newAdmin = new adminModel({
        email,
        password: hashedPassword,
      });

      // Save the new admin to the database
      newAdmin
        .save()
        .then((savedAdmin) => {
          console.log("New admin created:", savedAdmin);
          res.status(201).json({ message: "Admin created successfully" });
        })
        .catch((error) => {
          console.error("Error saving admin:", error);
          res.status(500).json({ error: "Internal Server Error" });
        });
    })
    .catch((error) => {
      console.error("Error checking for existing admin:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
});
router.post("/verifyteacher", (req, res) => {
  const teacherEmail = req.body.email;

  // Check if the student exists
  teacherModel
    .findOne({ email: teacherEmail })
    .then((teacher) => {
      if (!teacher) {
        // Student not found
        return res.status(404).json({ error: "Teacher not found" });
      }

      // Update the student's verification status
      teacher.restricted = false;
      teacher
        .save()
        .then(() => {
          res
            .status(200)
            .json({ message: "Teacher sign-up verified successfully" });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});
// Function to fetch student data based on batch
async function getStudentsByBatch(batch) {
  try {
    const students = await studentModel.find({ batch: batch }).lean(); // Assuming batch is a field in your student model
    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}

// Function to generate Excel file
async function generateExcel(batch) {
  const students = await getStudentsByBatch(batch);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");

  // Define headers
  worksheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Name", key: "name", width: 20 },
    { header: "Mid", key: "mid", width: 10 },
    { header: "Final", key: "final", width: 10 },
    { header: "Assessment", key: "assessment", width: 15 },
    { header: "Total", key: "total", width: 10 },
    { header: "Grade", key: "grade", width: 10 },
  ];

  // Populate data
  students.forEach((student) => {
    worksheet.addRow({
      id: student.id.toString(), // Assuming ID is stored as _id in MongoDB
      name: student.name,
      mid: student.mid || "", // Handle cases where the values might be null or undefined
      final: student.final || "",
      assessment: student.assessment || "",
      total: student.total || "",
      grade: student.grade || "",
    });
  });

  // Save the workbook
  const folderPath = path.join(__dirname, "../uploads/generate");
  const fileName = `students_batch_${batch}.xlsx`;
  const filePath = path.join(folderPath, fileName);
  await workbook.xlsx.writeFile(filePath);
  console.log(`Excel file "${fileName}" generated successfully.`);
  return filePath;
}

// Route to generate Excel file using POST request
router.post("/generateExcel", async (req, res) => {
  const batch = req.body.batch;
  if (!batch) {
    return res.status(400).json({ error: "Batch parameter is required" });
  }

  try {
    const fileName = await generateExcel(batch);
    res.download(fileName);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Route to assign courses to a teacher
router.post("/assignCourses", async (req, res) => {
  try {
    const { email, course } = req.body;

    // Check if the provided teacher email exists
    const existingTeacher = await teacherModel.findOne({ email });
    if (!existingTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Update the assigned courses for the teacher
    existingTeacher.assignedCourses.push(course); // Push new courses to the existing array
    await existingTeacher.save();

    return res.status(200).json({ message: "Courses assigned successfully" });
  } catch (error) {
    console.error("Error assigning courses:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// router.get("/getteachers", async (req, res) => {
//   try {
//     const teachers = await teacherModel.find({}, { _id: 0, name: 1 });
//     return res.status(200).json(teachers.map(teacher => teacher.name));
//   } catch (error) {
//     console.error("Error fetching teachers:", error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// });
router.get("/getteachers", async (req, res) => {
  try {
    const teachers = await teacherModel.find({});
    return res.status(200).json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/sendnotifications", async (req, res) => {
  try {
    const { sender, message } = req.body;

    // Find all students
    const students = await studentModel.find({});

    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ error: "No students found." });
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
router.get("/courses", async (req, res) => {
  try {
    // Query the database to find all courses
    const courses = await courseModel.find(
      {},
      { _id: 0, courseName: 1, courseid: 1 }
    );

    // Return the retrieved courses as the response
    res.status(200).json(courses);
  } catch (error) {
    // If an error occurs, return an error response
    console.error("Error retrieving courses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
module.exports = router;
