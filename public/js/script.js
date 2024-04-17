import FaceRecoHandler from './modules/FaceDetectionManager.js';
import PoseNetHandler from './modules/PoseNetManager.js';

// Entry point
const videoElement = document.getElementById("video");
const startBtn = document.getElementById("startAttendanceBtn");
const stopBtn = document.getElementById("stopAttendanceBtn");
const saveBtn = document.getElementById("saveAttendanceBtn");
const tableBody = document.getElementById("attendanceTableBody");
const stat = document.getElementById("Status");
const count = document.getElementById("Count");

// Initialize AttendanceManager
new FaceRecoHandler(videoElement, startBtn, stopBtn, saveBtn, tableBody, stat, count);

// new PoseNetHandler(videoElement);

