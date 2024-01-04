const video = document.getElementById("video");
const startBtn = document.getElementById("startAttendanceBtn");
const stopBtn = document.getElementById("stopAttendanceBtn");
const saveBtn = document.getElementById("saveAttendanceBtn");

const tableBody = document.getElementById("attendanceTableBody");

let isAttendanceStarted = false;

// Const Buffer
const attendanceToday = new Set();

startBtn.addEventListener("click", () => {
  isAttendanceStarted = true;
  attendanceToday.clear(); // Clear previous entries
});

stopBtn.addEventListener("click", () => {
  isAttendanceStarted = false;
  updateAttendanceTable();
});

saveBtn.addEventListener("click", () => {
  saveAttendanceToFile();
});

function saveAttendanceToFile() {
  const attendanceArray = Array.from(attendanceToday);

  const blob = new Blob([JSON.stringify(attendanceArray, space = 2)], { type: "application/json" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "attendance.json";
  link.click();

  console.log("Attendance saved to JSON file:", attendanceArray);
}

function updateAttendanceTable() {
  // Clear the table
  tableBody.innerHTML = "";

  // Populate the table with entries
  Array.from(attendanceToday).forEach((entry, index) => {
    const row = document.createElement("tr");
    const entryCell = document.createElement("td");
    entryCell.textContent = `${entry.label} ${entry.present} ${entry.timestamp}`;

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      attendanceToday.delete(entry);
      updateAttendanceTable();
      console.log("Attendance today:", Array.from(attendanceToday));
    });

    actionCell.appendChild(removeButton);
    row.appendChild(entryCell);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

// Face-API
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error("Error accessing webcam:", error);
    });
}

async function getLabeledFaceDescriptions() {
  try {
    const response = await fetch("./peeps/manifest.json");
    const data = await response.json();
    const labels = data.labels || [];

    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 3; i++) {
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
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  } catch (error) {
    console.error("Error fetching or parsing manifest.json:", error);
    return [];
  }
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  // Append Canvas
  const canvas = faceapi.createCanvasFromMedia(video);
  document.getElementById('video-frame').append(canvas);

  let lastFrameTime = 0;

  function animate() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrameTime;

    // Update the table
    if (isAttendanceStarted) {
      updateAttendanceTable();
    }

    detectFaces(); // Perform face detection

    lastFrameTime = currentTime;
    requestAnimationFrame(animate); // Request the next animation frame
  }

  function detectFaces() {
    faceapi.detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions()
      .then(async (detections) => {
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        const results = resizedDetections.map((d) => {
          const match = faceMatcher.findBestMatch(d.descriptor);
          if (match.label !== "unknown") {

            const entry = {
              label: match.label,
              timestamp: new Date().toISOString(),
              present: true,
            };

            const existingEntry = Array.from(attendanceToday).find((e) => e.label === entry.label);
            if (!existingEntry) {
              attendanceToday.add(entry);
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

          drawBox.draw(canvas);
        });


      })
      .catch((error) => {
        console.error("Error during face detection:", error);
      });
  }

  animate(); // Start the animation loop
});
