//  ? Static variable to track attendance status
// ! Original (O.G) File
let isAttendanceStarted = false;

export default class AttendanceManager {
    constructor(videoElement, startBtn, stopBtn, saveBtn, tableBody, status, count) {
        this.video = videoElement;
        this.startBtn = startBtn;
        this.stopBtn = stopBtn;
        this.saveBtn = saveBtn;
        this.tableBody = tableBody;
        this.status = status;
        this.count = count;
        this.attendanceToday = new Set();

        this.startBtn.addEventListener("click", () => this.startAttendance());
        this.stopBtn.addEventListener("click", () => this.stopAttendance());
        this.saveBtn.addEventListener("click", () => this.saveAttendanceToFile());

        this.faceRecognition = new FaceRecognition(this.video, this.attendanceToday, this.tableBody, this.count);
    }

    startAttendance = async () => {
        this.status.innerText = "Active";
        isAttendanceStarted = true;
        this.attendanceToday.clear();
        await this.faceRecognition.detectFaces();
    }

    stopAttendance = () => {
        this.status.innerText = "Inactive";
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
    constructor(video, attendanceToday, tableBody, count) {
        this.video = video;
        this.attendanceToday = attendanceToday;
        this.tableBody = tableBody;
        this.lastTableUpdateTime = 0;
        this.count = count;

        this.startWebcam();
        this.initializeFaceAPI();
        this.faceMatcher = null;

        this.lastFrameTime = 0;
        this.animate();
    }

    createCanvasFromMedia = () => {
        this.canvas = faceapi.createCanvasFromMedia(this.video);
        document.getElementById('video-frame').append(this.canvas);
        faceapi.matchDimensions(this.canvas, { width: this.video.width, height: this.video.height });
    }

    startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.video.srcObject = stream;
        } catch (error) {
            console.error("Error accessing webcam:", error);
        }
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

            this.createCanvasFromMedia();
            window.alert("Face-Api Up and Running");
        } catch (error) {
            console.error("Error loading faceapi models:", error);
        }
    }

    async getLabeledFaceDescriptions() {
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

    async getFaceDescriptors(label) {
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

        if (isAttendanceStarted) {
            if (currentTime - this.lastTableUpdateTime >= 2000) {
                this.updateAttendanceTable();
                this.lastTableUpdateTime = currentTime;
            }
        }

        this.detectFaces();

        this.lastFrameTime = currentTime;
        requestAnimationFrame(() => this.animate());
    }

    async detectFaces() {
        try {

            // ? from video get detections
            const detections = await faceapi.detectAllFaces(this.video)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            const displaySize = { width: this.video.width, height: this.video.height };
            faceapi.matchDimensions(this.canvas, displaySize);

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);

            resizedDetections.forEach((detection) => {
                const box = detection.detection.box;

                const match = this.faceMatcher.findBestMatch(detection.descriptor);
                const label = match && match.label !== "unknown" ? match.toString() : "unknown";

                const drawBox = new faceapi.draw.DrawBox(box, { label });
                drawBox.draw(this.canvas);


                // ? Inbuit Expression and Landmark shard model weights

                // Draw expressions
                // faceapi.draw.drawFaceExpressions(this.canvas, [detection]);

                // Draw landmarks
                // faceapi.draw.drawFaceLandmarks(this.canvas, [detection.landmarks]);

                const entry = {
                    label: match.label,
                    timestamp: new Date().toISOString(),
                    present: true,
                };

                // ? check if exisit
                const existingEntry = Array.from(this.attendanceToday).find((e) => e.label === entry.label);

                if (!existingEntry && isAttendanceStarted && entry.label !== "unknown") {
                    this.attendanceToday.add(entry);
                    let totalCount = this.attendanceToday.size;
                    this.count.innerText = "Detected: " + totalCount;
                }

            });

            // Update attendance table if needed
            if (isAttendanceStarted) {
                this.updateAttendanceTable();
            }
        } catch (error) {
            console.error("Error during face detection:", error);
        }
    }


}
