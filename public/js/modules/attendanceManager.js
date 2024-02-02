//  ? Static variable to track attendance status
// ! Original (O.G) File
let isAttendanceStarted = false;

export default class AttendanceManager {
    /**
     * AttendanceManager class manages the video feed, user events, and face recognition.
     * @param {video} videoElement - HTML video element for camera feed.
     * @param {input button} startBtn - Button to start attendance.
     * @param {input button} stopBtn - Button to stop attendance.
     * @param {input button} saveBtn - Button to save attendance.
     * @param {html element} tableBody - HTML table body for attendance entries.
     * @param {html element} status - HTML element to display attendance status.
     * @param {html element} count - HTML element to display the count of detected faces.
     */
    constructor(videoElement, startBtn, stopBtn, saveBtn, tableBody, status, count) {
        this.video = videoElement;
        this.startBtn = startBtn;
        this.stopBtn = stopBtn;
        this.saveBtn = saveBtn;
        this.tableBody = tableBody;
        this.status = status;
        this.count = count;
        // ! Make Private I Guess
        this.attendanceToday = new Set();

        // Event listeners for buttons
        this.startBtn.addEventListener("click", () => this.startAttendance());
        this.stopBtn.addEventListener("click", () => this.stopAttendance());
        this.saveBtn.addEventListener("click", () => this.saveAttendanceToFile());

        // FaceRecognition instance to handle face-related operations
        this.faceRecognition = new FaceRecognition(this.video, this.attendanceToday, this.tableBody, this.count);
    }

    // Method to start attendance
    startAttendance = () => {
        // Change Status
        this.status.innerText = "Active";
        isAttendanceStarted = true;
        this.attendanceToday.clear();
        this.faceRecognition.detectFaces();
    }

    // Method to stop attendance
    stopAttendance = () => {
        // Change Status
        this.status.innerText = "Inactive";
        isAttendanceStarted = false;
        this.updateAttendanceTable();
    }

    // Method to save attendance to a file
    saveAttendanceToFile = () => {
        this.faceRecognition.saveAttendanceToFile();
    }

    // Method to update the attendance table
    updateAttendanceTable() {
        this.faceRecognition.updateAttendanceTable();
    }
}

class FaceRecognition {
    /**
     * FaceRecognition class handles face recognition using the camera feed.
     * @param {cam input} video - HTML video element for camera feed.
     * @param {Set} attendanceToday - Set to store today's attendance.
     * @param {html element} tableBody - HTML table body for attendance entries.
     * @param {html element} count - HTML element to display the count of detected faces.
     */
    constructor(video, attendanceToday, tableBody, count) {
        this.video = video;
        this.attendanceToday = attendanceToday;
        this.tableBody = tableBody;
        this.lastTableUpdateTime = 0;
        this.count = count;

        // Initialize face recognition
        this.startWebcam();
        this.initializeFaceAPI();
        this.faceMatcher = null;

        // Set up animation loop
        this.lastFrameTime = 0;
        this.video.addEventListener('loadedmetadata', () => {
            // !! Call createCanvasFromMedia after video has finished loading
            this.createCanvasFromMedia();
        });

        this.animate();
    }

    // Method to create canvas from media
    createCanvasFromMedia = () => {
        // Use faceapi.createCanvasFromMedia after video has finished loading
        this.canvas = faceapi.createCanvasFromMedia(this.video);
        document.getElementById('video-frame').append(this.canvas);

        // Corrected line: use faceapi.matchDimensions, not this.faceapi.matchDimensions
        faceapi.matchDimensions(this.canvas, { width: this.video.width, height: this.video.height });
    }

    // Method to start webcam feed
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

    // Method to initialize face recognition models
    initializeFaceAPI = async () => {
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                faceapi.nets.faceExpressionNet.loadFromUri("/models"),
            ]);

            // Get labeled face descriptors
            const labeledFaceDescriptors = await this.getLabeledFaceDescriptions();
            this.faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

            // After loading models, call createCanvasFromMedia
            this.createCanvasFromMedia();
        } catch (error) {
            console.error("Error loading faceapi models:", error);
        }
    }

    // Method to get labeled face descriptors
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

    // Method to get face descriptors for a specific label
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

    // Method to save attendance to a file
    saveAttendanceToFile = () => {
        const attendanceArray = Array.from(this.attendanceToday);
        const blob = new Blob([JSON.stringify(attendanceArray, null, 2)], { type: "application/json" });
        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "attendance.json";
        link.click();

        console.log("Attendance saved to JSON file:", attendanceArray);
    }

    // Method to update the attendance table
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

    // Animation loop for face detection
    animate = () => {
        const currentTime = Date.now();

        if (isAttendanceStarted) {
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

    // Method to detect faces using faceapi
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

                const results = resizedDetections.map((d) => {
                    if (d.descriptor) {
                        const match = this.faceMatcher.findBestMatch(d.descriptor);
                        if (match && match.label !== "unknown") {
                            const entry = {
                                label: match.label,
                                timestamp: new Date().toISOString(),
                                present: true,
                            };

                            const existingEntry = Array.from(this.attendanceToday).find((e) => e.label === entry.label);
                            if (!existingEntry) {
                                if (isAttendanceStarted) {
                                    this.attendanceToday.add(entry);
                                    let totalCount = this.attendanceToday.size;
                                    this.count.innerText = "Detected: " + totalCount;
                                }
                            }
                        }
                        return { match, detection: d.detection };
                    }
                    return null; // Return null for detections with null descriptors
                }).filter(result => result !== null);

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

