# Sasta Attendance System

[![CodeFactor](https://www.codefactor.io/repository/github/otherwa/sasta-attendence/badge)](https://www.codefactor.io/repository/github/otherwa/sasta-attendence)
[![DeepSource](https://app.deepsource.com/gh/Otherwa/Sasta-Attendence.svg/?label=code+coverage&show_trend=true&token=JS8-u3rZnXk42g9Oo5MzWKl8)](https://app.deepsource.com/gh/Otherwa/Sasta-Attendence/)

## Prototype 
![Prototype Image](https://github.com/Otherwa/Sasta-Attendence/assets/67428572/409f2393-5b29-4134-831b-9f021a26ddae)

## Major Dependency
[face-api.js](https://github.com/justadudewhohacks/face-api.js)

## Bug Fixes
- `navigator.mediaDevices.getUserMedia` is deprecated and has been replaced with `navigator.mediaDevices.getUserMedia`.
- Fixed low-end devices bug by replacing the `play` event listener with the `playing` event listener.

## Code Logic
```javascript
// Place your main code logic here
async function detectFaces() {
    // Your face detection logic goes here
}

// Example snippet for users to copy and paste
const videoElement = document.getElementById('videoElement');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const attendanceManager = new AttendanceManager(videoElement, startButton, stopButton);
