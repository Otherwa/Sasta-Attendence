const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const AdmZip = require('adm-zip');
const router = express.Router();

// Define the uploads folder path
const uploadsFolder = './public/peeps/uploads';

// Ensure the uploads folder exists
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the specified uploads folder
    cb(null, uploadsFolder);
  },
  filename: (req, file, cb) => {
    // Use the original file name
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve home page
router.get('/', (req, res) => {
  res.render('index');
});

// Serve input page
router.get('/input', (req, res) => {
  res.render('input');
});

// Handle file upload
router.post('/input', upload.single('file'), (req, res) => {
  // Extract file name and path from request
  const { originalname } = req.file;
  const nameWithoutExt = path.parse(originalname).name;

  // Define the destination folder
  const destinationFolder = path.join(uploadsFolder, nameWithoutExt);

  // Create folder if it doesn't exist
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  // Extract and move the uploaded file to the destination folder
  const zip = new AdmZip(req.file.path);
  zip.extractAllTo(destinationFolder, true);

  // Remove the uploaded ZIP file after extraction
  fs.unlink(req.file.path, (err) => {
    if (err) {
      console.error('Error deleting temporary file:', err);
      return res.status(500).send('Server Error');
    }
    res.send('File uploaded, extracted, and saved successfully');
  });
});

module.exports = router;
