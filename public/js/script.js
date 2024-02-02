//  ? static var
isAttendanceStarted = false;

class AttendanceManager {
  /**
   * 
   * @param {video} videoElement 
   * @param {inpt btn} startBtn 
   * @param {inpt btn} stopBtn 
   * @param {inpt btn} saveBtn 
   * @param {html ele} tableBody 
   * 
   * 1. To start cam feed
   * 2. User Events
   */
  constructor(videoElement, startBtn, stopBtn, saveBtn, tableBody, status, count) {
    this.video = videoElement;
    this.startBtn = startBtn;
    this.stopBtn = stopBtn;
    this.saveBtn = saveBtn;
    this.tableBody = tableBody;
    this.status = status;
    this.count = count;
    // ! Make Private i Guess
    this.attendanceToday = new Set();

    this.startBtn.addEventListener("click", () => this.startAttendance());
    this.stopBtn.addEventListener("click", () => this.stopAttendance());
    this.saveBtn.addEventListener("click", () => this.saveAttendanceToFile());

    this.faceRecognition = new FaceRecognition(this.video, this.attendanceToday, isAttendanceStarted, this.tableBody, this.count);
  }

  startAttendance = () => {
    // Change Status
    this.status.innerText = "Active"
    isAttendanceStarted = true;
    this.attendanceToday.clear();
    this.faceRecognition.detectFaces();
  }

  stopAttendance = () => {
    // Change Status
    this.status.innerText = "InActive"
    isAttendanceStarted = false;
    this.updateAttendanceTable();
  }

  saveAttendanceToFile = () => {
    this.faceRecognition.saveAttendanceToFile();
  }

  updateAttendanceTable() {
    this.faceRecognition.updateAttendanceTable();
  }
}

class FaceRecognition {
  /**
   * 
   * @param {cam input} video 
   * @param {Set} attendanceToday 
   * @param {html ele} tableBody 
   * @param {html ele} count 
   * @param {AttendanceManager var} totalCount 
   */
  constructor(video, attendanceToday, isAttendanceStarted, tableBody, count) {
    this.video = video;
    this.attendanceToday = attendanceToday;
    this.tableBody = tableBody;
    this.lastTableUpdateTime = 0;
    this.count = count;

    this.canvas = document.createElement("canvas");
    document.getElementById('video-frame').append(this.canvas);

    this.startWebcam();
    this.initializeFaceAPI();
    this.faceMatcher = null;

    this.lastFrameTime = 0;
    this.video.addEventListener('loadedmetadata', () => {
      // !! Call createCanvasFromMedia after video has finished loading
      this.createCanvasFromMedia();
    });

    this.animate();
  }

  createCanvasFromMedia = () => {
    // Use faceapi.createCanvasFromMedia after video has finished loading
    this.canvas = faceapi.createCanvasFromMedia(this.video);
    document.getElementById('video-frame').append(this.canvas);

    // Corrected line: use faceapi.matchDimensions, not this.faceapi.matchDimensions
    faceapi.matchDimensions(this.canvas, { width: this.video.width, height: this.video.height });
  }

  startWebcam = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        this.video.srcObject = stream;
      })
      .catch((error) => {
        console.error("Error accessing webcam:", error);
      });
  }

  initializeFaceAPI = async () => {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);

      const labeledFaceDescriptors = await this.getLabeledFaceDescriptions();
      this.faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      // After loading models, call createCanvasFromMedia
      this.createCanvasFromMedia();
    } catch (error) {
      console.error("Error loading faceapi models:", error);
    }
  }

  getLabeledFaceDescriptions = async () => {
    // Fetch labeled face descriptions from the server
    try {
      const response = await fetch("./peeps/manifest.json");
      const data = await response.json();
      const labels = data.labels || [];

      return Promise.all(
        labels.map(async (label) => {
          const descriptions = await this.getFaceDescriptors(label);
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    } catch (error) {
      console.error("Error fetching or parsing manifest.json:", error);
      return [];
    }
  }

  getFaceDescriptors = async (label) => {
    // Fetch face descriptors for a specific label
    const descriptions = [];
    for (let i = 1; i <= 1; i++) {
      const img = await faceapi.fetchImage(`./peeps/${label}/${i}.jpg`);
      try {
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor()
          .withFaceExpressions();

        if (detection) {
          descriptions.push(detection.descriptor);
        }
      } catch (error) {
        console.error(`Error detecting face for ${label} (${i}.jpg):`, error);
      }
    }
    return descriptions;
  }

  saveAttendanceToFile = () => {
    const attendanceArray = Array.from(this.attendanceToday);
    const blob = new Blob([JSON.stringify(attendanceArray, null, 2)], { type: "application/json" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "attendance.json";
    link.click();

    console.log("Attendance saved to JSON file:", attendanceArray);
  }

  updateAttendanceTable = () => {
    // Update the table with entries
    this.tableBody.innerHTML = "";

    Array.from(this.attendanceToday).forEach((entry, index) => {
      const row = document.createElement("tr");
      const entryCell = document.createElement("td");
      entryCell.textContent = `${entry.label} ${entry.present} ${entry.timestamp}`;

      const actionCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.className = "button is-warning";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        this.attendanceToday.delete(entry);
        this.updateAttendanceTable();
        console.log("Attendance today:", Array.from(this.attendanceToday));
      });

      actionCell.appendChild(removeButton);
      row.appendChild(entryCell);
      row.appendChild(actionCell);

      this.tableBody.appendChild(row);
    });
  }

  animate = () => {
    const currentTime = Date.now();

    if (this.isAttendanceStarted) {
      // Update the attendance table every 2 seconds
      if (currentTime - this.lastTableUpdateTime >= 2000) {
        this.updateAttendanceTable();
        this.lastTableUpdateTime = currentTime;
      }
    }

    this.detectFaces();

    this.lastFrameTime = currentTime;
    requestAnimationFrame(() => this.animate());
  }

  detectFaces() {
    faceapi.detectAllFaces(this.video)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions()
      .then(async (detections) => {
        const displaySize = { width: this.video.width, height: this.video.height };
        faceapi.matchDimensions(this.canvas, displaySize);

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);

        // !! If Started or Not

        const results = resizedDetections.map((d) => {
          const match = this.faceMatcher.findBestMatch(d.descriptor);
          if (match.label !== "unknown") {
            const entry = {
              label: match.label,
              timestamp: new Date().toISOString(),
              present: true,
            };

            const existingEntry = Array.from(this.attendanceToday).find((e) => e.label === entry.label);
            if (!existingEntry) {
              if (isAttendanceStarted) {
                // ? Update the Count
                this.attendanceToday.add(entry);
                let totalCount = this.attendanceToday.size;
                this.count.innerText = "Deteceted : " + totalCount;
              }
            }
          }
          return { match, detection: d.detection };
        });

        results.forEach((result) => {
          const { match, detection } = result;
          const box = detection.box;

          const drawBox = new faceapi.draw.DrawBox(box, {
            label: match.toString(),
          });

          drawBox.draw(this.canvas);
        });
      })
      .catch((error) => {
        console.error("Error during face detection:", error);
      });
  }
}

// ? Entry
const videoElement = document.getElementById("video");
const startBtn = document.getElementById("startAttendanceBtn");
const stopBtn = document.getElementById("stopAttendanceBtn");
const saveBtn = document.getElementById("saveAttendanceBtn");
const tableBody = document.getElementById("attendanceTableBody");
const stat = document.getElementById("Status");
const count = document.getElementById("Count");

const attendanceManager = new AttendanceManager(videoElement, startBtn, stopBtn, saveBtn, tableBody, stat, count);
