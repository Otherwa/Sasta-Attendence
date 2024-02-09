import AttendanceManager from './modules/attendanceManager.js'

// ? Entry point
const videoElement = document.getElementById("video");
const startBtn = document.getElementById("startAttendanceBtn");
const stopBtn = document.getElementById("stopAttendanceBtn");
const saveBtn = document.getElementById("saveAttendanceBtn");
const tableBody = document.getElementById("attendanceTableBody");
const stat = document.getElementById("Status");
const count = document.getElementById("Count");

// ? Initialize AttendanceManager
const myAttendanceManager = new AttendanceManager(videoElement, startBtn, stopBtn, saveBtn, tableBody, stat, count);
