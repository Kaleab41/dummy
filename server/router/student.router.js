const express = require("express");
const studentModel = require("../model/student.model");
const payment = require("../model/payment.model");
const courseModel = require("../model/course.model");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const gradeModel = require("../model/grade.model");
const teacherModel = require("../model/teacher.model");
const getHashedPassword = (password) => {
  const sha256 = crypto.createHash("sha256");
  const hash = sha256.update(password).digest("base64");
  return hash;
};

function generateID() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";

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
function changeRequestID() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";

  // Generate two random letters
  for (let i = 0; i < 2; i++) {
    id += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate four random numbers
  for (let i = 0; i < 4; i++) {
    id += Math.floor(Math.random() * 10);
  }

  return "CR" + id;
}
function generateBatch() {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().substr(2, 2); // Get the last two digits of the year
  const month = currentDate.getMonth() + 1; // Months are zero-indexed, so add 1

  // Check if it's before or after half the year
  const batchSuffix = month <= 6 ? "01" : "02";

  const batch = `DRB${year}${batchSuffix}`;
  return batch;
}

// Configure Multer to restrict the maximum file size to 5MB

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/files"); // Define the destination directory for file uploads
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname); // Define the filename for the uploaded file
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});
const uploadpayment = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/payments"); // Define the destination directory for file uploads
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname); // Define the filename for the uploaded file
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

const storage = multer.memoryStorage(); // Store files in memory
const uploading = multer({ storage: storage });

// POST route to register a new student with academic record file upload
router.post(
  "/register",
  uploading.single("academicRecord"),
  async (req, res) => {
    try {
      // Check if the provided email already exists
      const existingEmail = await studentModel.findOne({
        email: req.body.email,
      });
      if (existingEmail) {
        return res.status(409).json({ error: "Email already exists" });
      }

      // Check if the provided ID already exists
      const existingID = await studentModel.findOne({ id: "AB2132" });
      if (existingID) {
        return res.status(409).json({ error: "ID already exists" });
      }

      // Save academic record file to MongoDB
      const academicRecordFile = req.file;
      if (!academicRecordFile) {
        return res
          .status(400)
          .json({ error: "No academic record file uploaded" });
      }

      const newStudent = new studentModel({
        id: "Ab3444",
        batch: req.body.batch,
        name: req.body.name,
        gender: req.body.gender,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
        guardianPhone: req.body.guardianPhone,
        guardianName: req.body.guardianName,
        department: req.body.department,
        aboutYou: req.body.aboutYou,
        academicRecord: {
          data: academicRecordFile.buffer, // Store file buffer as binary data
          contentType: academicRecordFile.mimetype, // Set MIME type
        },
      });

      // Save the new student to the database
      await newStudent.save();

      return res.status(201).json(newStudent);
    } catch (error) {
      console.error("Error during registration:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

//TODO: Make sure to add frontend comparison of password and confirmation
router.post("/signup", async (req, res) => {
  try {
    const id = req.body.id;
    const restriction = req.body.restriction;
    const hashedPassword = getHashedPassword(req.body.password);

    // Find the student by ID and fetch the academic record
    const student = await studentModel.findOne({ id: id });
    if (!student) {
      return res.status(404).json({ error: "User doesn't exist!" });
    }

    // Check whether student is restricted or not
    if (student.restricted && restriction) {
      return res.status(403).json({ error: "Access restricted" });
    }

    // Check if academic record exists
    if (!student.academicRecord || !student.academicRecord.data) {
      return res.status(404).json({ error: "Academic record not found" });
    }

    // Set appropriate content type for the response
    res.contentType(student.academicRecord.contentType);

    // Send the binary data as response
    res.send(student.academicRecord.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/signin", (req, res) => {
  studentModel
    .findOne({
      id: req.body.id,
    })
    .then((data) => {
      if (data) {
        // Check if account is restricted
        if (data.restricted === true) {
          // Account is restricted, prompt user to contact admin
          return res.status(403).json({
            error:
              "Your account is restricted. Please contact the system administrator.",
          });
        } else {
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

router.post(
  "/uploadpayment",
  uploadpayment.single("paymentReceipt"),
  async (req, res) => {
    try {
      const studentId = req.body.id;

      // Check if the provided ID already exists in the studentModel
      const existingStudent = await studentModel.findOne({ id: studentId });

      if (!existingStudent) {
        // ID does not exist, return an error
        return res.status(404).json({ error: "ID does not exist" });
      }

      // Create and save the new payment with the student's name
      const newPayment = new payment({
        id: studentId,
        studentName: existingStudent.name,
        paymentReceipt: req.file ? req.file.filename : null,
        // Add any other fields related to payment schema here
      });

      const savedPayment = await newPayment.save();
      return res.status(201).json(savedPayment);
    } catch (error) {
      console.error("Error uploading payment:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Define route to get payments by student ID
// Endpoint to search payment model by ID
router.get("/payment", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ error: "ID is required in the request body" });
  }

  // Search the payment model by ID
  payment
    .findOne({ id: id })
    .then((payment) => {
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.status(200).json(payment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
});
router.get("/grades", (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ error: "ID is required in the request body" });
  }

  // Search the payment model by ID
  gradeModel
    .findOne({ id: id })
    .then((grade) => {
      if (!grade) {
        return res.status(404).json({ error: "Grade not found" });
      }
      res.status(200).json(grade);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });
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
router.post("/gradeChangeRequest", async (req, res) => {
  try {
    const { studentId, teacherId, message } = req.body;

    // Find the student by ID
    const student = await studentModel.findOne({ id: studentId });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create the grade change request object
    const changeRequest = {
      sender: studentId,
      message: message,
      approved: false,
      time: Date.now(),
    };

    // Find the teacher by ID
    const teacher = await teacherModel.findOne({ id: teacherId });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Add the grade change request to the teacher's changeRequests array
    teacher.changeRequests.push(changeRequest);

    // Save the updated teacher document
    await teacher.save();

    return res
      .status(200)
      .json({ message: "Grade change request submitted successfully" });
  } catch (error) {
    console.error("Error submitting grade change request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
