import FaceRecoHandler from './modules/FaceDetectionManager.js';

// const FaceRecoHandler = new Worker('./modules/FaceDetectionManager.js');

// Entry point
const videoElement = document.getElementById("video");
const saveBtn = document.getElementById("saveAttendanceBtn");
const tableBody = document.getElementById("attendanceTableBody");
const stat = document.getElementById("Status");
const count = document.getElementById("Count");

// Initialize AttendanceManager
new FaceRecoHandler(videoElement, saveBtn, tableBody, stat, count)

