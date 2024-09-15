import PoseDetector from './PoseNetManager.js';

// Display the progress bar initially
const progressBar = document.getElementById("myProgressBar");
progressBar.style.width = "0%";
progressBar.style.transition = "width 1s ease";

class FaceRecognition {
    constructor(video, attendanceToday, tableBody, count) {
        this.video = video;
        this.attendanceToday = attendanceToday;
        this.tableBody = tableBody;
        this.lastTableUpdateTime = 0;
        this.count = count;
        this.faceMatcher = null;
        this.isDetecting = false; // Flag to control the loop
        this.detectionFrameId = null; // To store the animation frame ID
        this.lastUpdate = 0; // To track the last update timestamp
        this.detectionInterval = 60000; // 60 seconds default
        this.detectionLimit = 5; // Default detection limit
        this.initialize();
    }

    async initialize() {
        await this.startWebcam();
        updateProgressBar(25);
        await this.initializeFaceAPI();
        updateProgressBar(50);
        await this.createCanvasFromMedia();
        updateProgressBar(65);
        await this.initializePoseNet();
        updateProgressBar(75);

        // Get user inputs for detection interval and limit
        const intervalInput = document.getElementById('detection-interval');
        const intervalValue = document.getElementById('detection-interval-value');
        const limitInput = document.getElementById('detection-limit');
        const limitValue = document.getElementById('detection-limit-value');

        // Set initial values
        intervalValue.innerText = intervalInput.value;
        this.detectionInterval = parseInt(intervalInput.value * 1000, 10) || 1000;

        limitValue.innerText = limitInput.value;
        this.detectionLimit = parseInt(limitInput.value, 10) || 5;

        // Listen for changes to the interval input
        intervalInput.addEventListener('input', (event) => {
            this.detectionInterval = parseInt(event.target.value, 10);
            intervalValue.innerText = this.detectionInterval;
            clearCanvas();
            this.restartDetectionLoop(); // Restart the loop with the new interval
        });

        // Listen for changes to the limit input
        limitInput.addEventListener('input', (event) => {
            this.detectionLimit = parseInt(event.target.value, 10);
            clearCanvas();
            limitValue.innerText = this.detectionLimit;
        });

        // Start the detection loop
        this.startDetectionLoop();

        updateProgressBar(100);
        await this.Running();
    }

    startDetectionLoop() {
        this.isDetecting = true; // Set flag to true
        this.detectFacesAndPose(); // Start detection
    }

    stopDetectionLoop() {
        this.isDetecting = false; // Set flag to false
        if (this.detectionFrameId) {
            cancelAnimationFrame(this.detectionFrameId); // Cancel the ongoing animation frame
            this.detectionFrameId = null; // Reset the ID
        }
    }

    restartDetectionLoop() {
        this.stopDetectionLoop(); // Ensure any ongoing detection stops
        this.lastUpdate = 0; // Reset the last update timestamp
        this.startDetectionLoop(); // Start the detection loop
    }

    async Running() {
        window.alert("Face-Api Up and Running");
    }

    createCanvasFromMedia = async () => {
        this.canvas_face = faceapi.createCanvasFromMedia(this.video);
        this.canvas_face.id = "video-rec";
        document.getElementById('video-frame').append(this.canvas_face);
        faceapi.matchDimensions(this.canvas_face, { width: this.video.width, height: this.video.height });

        this.canvas_pose = faceapi.createCanvasFromMedia(this.video);
        this.canvas_pose.id = "video-pose";
        document.getElementById('video-frame').append(this.canvas_pose);
        faceapi.matchDimensions(this.canvas_pose, { width: this.video.width, height: this.video.height });
    }

    startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.video.srcObject = stream;
        } catch (error) {
            console.error("Error accessing webcam:", error);
        }
    }

    async initializePoseNet() {
        this.Posenet = new PoseDetector(this.video, this.canvas_pose);
        await this.Posenet.setup();
    }

    async initializeFaceAPI() {
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                faceapi.nets.faceExpressionNet.loadFromUri("/models"),
            ]);

            const labeledFaceDescriptors = await this.getLabeledFaceDescriptions();
            this.faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
        } catch (error) {
            console.error("Error loading faceapi models:", error);
        }
    }

    async getLabeledFaceDescriptions() {
        try {
            let labeledFaceDescriptorsFromLocalStorage = localStorage.getItem('labeledFaceDescriptors');

            if (labeledFaceDescriptorsFromLocalStorage) {
                const parsedData = JSON.parse(labeledFaceDescriptorsFromLocalStorage);
                const labeledFaceDescriptors = parsedData.map(item => {
                    const descriptors = item._descriptors.map(descriptor => {
                        const values = Object.values(descriptor);
                        return new Float32Array(values);
                    });
                    return new faceapi.LabeledFaceDescriptors(item._label, descriptors);
                });

                return labeledFaceDescriptors;
            } else {
                const response = await fetch("./peeps/manifest.json");
                const data = await response.json();
                const labels = data.labels || [];

                const labeledFaceDescriptors = await Promise.all(
                    labels.map(async (label) => {
                        const descriptions = await this.getFaceDescriptors(label);
                        return new faceapi.LabeledFaceDescriptors(label[0], descriptions);
                    })
                );

                const serializedData = JSON.stringify(labeledFaceDescriptors);
                localStorage.setItem('labeledFaceDescriptors', serializedData);

                return labeledFaceDescriptors;
            }
        } catch (error) {
            console.error("Error fetching or parsing manifest.json:", error);
            return [];
        }
    }

    async getFaceDescriptors(labels) {
        const descriptions = [];
        try {
            for (let i = 1; i <= labels[1]; i++) {
                const imgPath = `./peeps/uploads/${labels[0]}/${i}.jpg`;
                try {
                    const img = await faceapi.fetchImage(imgPath);
                    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });
                    const detection = await faceapi
                        .detectSingleFace(img, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor()
                        .withFaceExpressions();

                    if (detection) {
                        descriptions.push(detection.descriptor);
                    }
                } catch (error) {
                    console.error(`Error processing image ${imgPath}:`, error);
                }
            }
        } catch (error) {
            console.error('Error iterating over labels:', error);
        }
        return descriptions;
    }

    saveAttendance = () => {
        this.saveToExcel(this.attendanceToday);
    }

    updateAttendanceTable = () => {
        this.tableBody.innerHTML = "";

        Array.from(this.attendanceToday).forEach((entry) => {
            const row = document.createElement("tr");
            const entryCell = document.createElement("td");
            entryCell.textContent = `${entry.label} - ${entry.attentiveness} - ${entry.timestamp}`;
            const actionCell = document.createElement("td");
            const removeButton = document.createElement("button");
            removeButton.className = "button is-warning";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", () => {
                this.attendanceToday.delete(entry);
                this.updateAttendanceTable();
            });

            actionCell.appendChild(removeButton);
            row.appendChild(entryCell);
            row.appendChild(actionCell);

            this.tableBody.appendChild(row);
        });
    }

    analyzeAttentiveness = async (detection, poses) => {
        let isAttentive = false;
        let attentivenessScore = 0;

        const confidenceThreshold = 0.5;

        if (detection.expressions) {
            const expressions = detection.expressions;
            const attentiveExpression = expressions.neutral > 0.6 || expressions.happy > 0.5;
            if (attentiveExpression) attentivenessScore += 1;
        }

        const landmarks = detection.landmarks?.positions;
        if (landmarks) {
            const nose = landmarks[30];
            const leftEye = landmarks[36];
            const rightEye = landmarks[45];

            if (nose && leftEye && rightEye) {
                const noseX = nose.x;
                const eyesMidX = (leftEye.x + rightEye.x) / 2;
                const headOrientationThreshold = 15;
                const headOrientation = Math.abs(noseX - eyesMidX);

                if (headOrientation < headOrientationThreshold) {
                    attentivenessScore += 1;
                }
            }
        }

        if (poses && poses[0]?.keypoints) {
            const keypoints = poses[0].keypoints;
            const leftWrist = keypoints.find(point => point.name === "left_wrist" && point.confidence > confidenceThreshold);
            const rightWrist = keypoints.find(point => point.name === "right_wrist" && point.confidence > confidenceThreshold);
            const nose = keypoints.find(point => point.name === "nose" && point.confidence > confidenceThreshold);

            if (leftWrist && rightWrist && nose) {
                const leftWristToNoseDist = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
                const rightWristToNoseDist = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);

                const handNearFaceThreshold = 100;

                if (leftWristToNoseDist < handNearFaceThreshold && rightWristToNoseDist < handNearFaceThreshold) {
                    attentivenessScore += 1;
                }
            }
        }

        if (landmarks) {
            const mouth = landmarks.slice(48, 60);
            if (mouth.length === 12) {
                const mouthOpenness = mouth[9].y - mouth[3].y;
                const mouthOpennessThreshold = 0.3;

                if (mouthOpenness < mouthOpennessThreshold) {
                    attentivenessScore += 1;
                }
            }
        }

        isAttentive = attentivenessScore >= 2;

        return isAttentive;
    };

    async detectFacesAndPose() {
        try {
            const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });
            const detections = await faceapi.detectAllFaces(this.video, options)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            const displaySize = { width: this.video.width, height: this.video.height };
            faceapi.matchDimensions(this.canvas_face, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const newEntries = [];
            const currentTime = new Date().getTime();

            if (currentTime - this.lastUpdate >= this.detectionInterval) {
                for (const detection of resizedDetections) {
                    const box = detection.detection.box;
                    const match = await this.faceMatcher.findBestMatch(detection.descriptor);
                    const label = match && match.label !== "unknown" ? match.label : "unknown";

                    const poses = await this.Posenet.draw();

                    const isAttentive = await this.analyzeAttentiveness(detection, poses);
                    const attentivenessStatus = isAttentive ? "Attentive" : "Not Attentive";

                    const labelWithStatus = label !== "unknown" ? `${label} (${attentivenessStatus})` : "unknown";

                    const drawBox = new faceapi.draw.DrawBox(box, { label: labelWithStatus });
                    drawBox.draw(this.canvas_face);

                    faceapi.draw.drawFaceExpressions(this.canvas_face, [detection]);
                    faceapi.draw.drawFaceLandmarks(this.canvas_face, [detection.landmarks]);

                    const requiredDetection = {
                        expressions: detection.expressions,
                        landmarks: detection.landmarks.positions,
                        descriptor: detection.descriptor,
                    };

                    let entry = Array.from(this.attendanceToday).find((e) => e.label === label);

                    if (entry) {
                        entry.timestamp = new Date().toISOString();
                        entry.attentiveness = attentivenessStatus;
                        entry.detections.push([requiredDetection, new Date().toISOString()]);
                        if (entry.detections.length > this.detectionLimit) entry.detections.shift();
                    } else {
                        entry = {
                            label: label,
                            attentiveness: attentivenessStatus,
                            timestamp: new Date().toISOString(),
                            detections: [[requiredDetection, new Date().toISOString()]],
                        };
                        if (entry.label !== "unknown") newEntries.push(entry);
                    }
                }

                newEntries.forEach(entry => {
                    const existingEntry = Array.from(this.attendanceToday).find(e => e.label === entry.label);
                    if (existingEntry) {
                        existingEntry.timestamp = entry.timestamp;
                        existingEntry.attentiveness = entry.attentiveness;
                        existingEntry.detections = entry.detections;
                    } else {
                        this.attendanceToday.add(entry);
                    }
                });

                this.count.innerText = "Detected: " + this.attendanceToday.size;
                this.updateAttendanceTable();
                this.lastUpdate = currentTime;
            }

            if (this.isDetecting) {
                this.detectionFrameId = requestAnimationFrame(() => this.detectFacesAndPose());
            }

        } catch (error) {
            console.warn("Error during face detection:", error);
        }
    }

    saveToExcel(attendanceSet) {
        const data = Array.from(attendanceSet).map(entry => ({
            Label: entry.label,
            Timestamp: entry.timestamp,
            Poses: JSON.stringify(entry.poses),
            Detections: JSON.stringify(entry.detections)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "attendance.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
        view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
}

function updateProgressBar(percentage) {
    progressBar.style.width = `${percentage}%`;
}

function clearCanvas() {
    const canvas = document.getElementById('video-rec');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}

export default class FaceRecoHandler {
    constructor(videoElement, saveBtn, tableBody, status, count) {
        this.video = videoElement;
        this.saveBtn = saveBtn;
        this.tableBody = tableBody;
        this.status = status;
        this.count = count;
        this.attendanceToday = new Set();

        this.saveBtn.addEventListener("click", () => this.saveAttendance());

        this.faceRecognition = new FaceRecognition(this.video, this.attendanceToday, this.tableBody, this.count);
    }

    saveAttendance = () => {
        this.faceRecognition.saveAttendance();
    }
}
