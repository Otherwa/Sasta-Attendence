//  ? Static variable to track attendance status
// ! Original (O.G) File
let isAttendanceStarted = false;

export default class AttendanceManager {
    /**
   * AttendanceManager class manages the attendance system for a video stream with face recognition.
   * It provides functionality to start, stop, and save attendance, as well as update the attendance table.
   * 
   * @param {HTMLElement} videoElement - The HTML video element where the video stream is displayed.
   * @param {HTMLElement} startBtn - The button element used to start attendance tracking.
   * @param {HTMLElement} stopBtn - The button element used to stop attendance tracking.
   * @param {HTMLElement} saveBtn - The button element used to save attendance to a file.
   * @param {HTMLElement} tableBody - The tbody element of the table where attendance data will be displayed.
   * @param {HTMLElement} status - The element displaying the current status of attendance (e.g., Active/Inactive).
   * @param {number} count - The count of attendees for the current session.
   */


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
        // await this.faceRecognition.detectFaces();
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

    /**
     * FaceRecognition class handles face detection and attendance management based on the provided video stream.
     * 
     * @param {HTMLElement} video - The HTML video element where the video stream is displayed.
     * @param {Set} attendanceToday - The set containing the attendance records for the current session.
     * @param {HTMLElement} tableBody - The tbody element of the table where attendance data will be displayed.
     * @param {number} count - The count of attendees for the current session.
     */


    constructor(video, attendanceToday, tableBody, count) {
        this.video = video;
        this.attendanceToday = attendanceToday;
        this.tableBody = tableBody;
        this.lastTableUpdateTime = 0;
        this.count = count;
        this.faceMatcher = null;
        this.lastFrameTime = 0;
        this.initialize();
    }

    async initialize() {
        await this.startWebcam();
        await this.initializeFaceAPI();
        this.createCanvasFromMedia();
        await this.animate();
    }

    /**
     * * Creates a canvas element from the provided video stream and appends it to the document.
     */
    createCanvasFromMedia = async () => {
        this.canvas = faceapi.createCanvasFromMedia(this.video);
        document.getElementById('video-frame').append(this.canvas);
        faceapi.matchDimensions(this.canvas, { width: this.video.width, height: this.video.height });
    }

    /**
    * * Initializes the webcam and starts streaming video to the provided video element.
    */
    startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            this.video.srcObject = stream;
        } catch (error) {
            console.error("Error accessing webcam:", error);
        }
    }

    /**
    * * Initializes the FaceAPI models required for face recognition.
    */
    async initializeFaceAPI() {
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                faceapi.nets.faceExpressionNet.loadFromUri("/models"),
            ]);

            const labeledFaceDescriptors = await this.getLabeledFaceDescriptions();
            this.faceMatcher = await new faceapi.FaceMatcher(labeledFaceDescriptors);

            this.createCanvasFromMedia();
            window.alert("Face-Api Up and Running");
        } catch (error) {
            console.error("Error loading faceapi models:", error);
        }
    }


    /**
    * * Retrieves labeled face descriptors from the provided manifest file.
    * * @returns {Promise<faceapi.LabeledFaceDescriptors[]>} A promise that resolves to an array of labeled face descriptors.
    */

    async getLabeledFaceDescriptions() {
        try {
            const response = await fetch("./peeps/manifest.json");
            const data = await response.json();
            const labels = data.labels || [];

            return Promise.all(
                labels.map(async (label) => {
                    const descriptions = await this.getFaceDescriptors(label);
                    return new faceapi.LabeledFaceDescriptors(label[0], descriptions);
                })
            );
        } catch (error) {
            console.error("Error fetching or parsing manifest.json:", error);
            return [];
        }
    }

    /**
    * * Retrieves face descriptors for a given label from the provided image files.
    * * @param {string} label - The label corresponding to the person's face.
    * * @returns {Promise<faceapi.Descriptor[]>} A promise that resolves to an array of face descriptors.
    */

    async getFaceDescriptors(labels) {
        const descriptions = [];
        console.warn(labels);
        try {
            // * enum number of images
            for (let i = 1; i <= labels.length; i++) {
                const img = await faceapi.fetchImage(`./peeps/${labels[0]}/${labels[1]}.jpg`);

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
        } catch (error) {
            console.error('Error iterating over labels:', error);
        }
        return descriptions;
    }


    /**
    * * Saves the attendance records to a JSON file.
    */
    saveAttendanceToFile = () => {
        const attendanceArray = Array.from(this.attendanceToday);
        const blob = new Blob([JSON.stringify(attendanceArray, null, 2)], { type: "application/json" });
        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = "attendance.json";
        link.click();

        console.log("Attendance saved to JSON file:", attendanceArray);
    }


    /**
    * *  Updates the attendance table with the current attendance records.
    */
    updateAttendanceTable = () => {
        this.tableBody.innerHTML = "";

        Array.from(this.attendanceToday).forEach((entry) => {
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

    /**
    * * Animates the face detection process by continuously detecting faces in the video stream.
    */
    animate = async () => {
        const currentTime = Date.now();

        if (isAttendanceStarted) {
            if (currentTime - this.lastTableUpdateTime >= 2000) {
                this.updateAttendanceTable();
                this.lastTableUpdateTime = currentTime;
            }
        }

        await this.detectFaces(); // Wait for detectFaces to complete before continuing

        this.lastFrameTime = currentTime;
        requestAnimationFrame(async () => await this.animate());
    }

    /**
    * * Detects faces in the video stream and updates the attendance records accordingly.
    */
    async detectFaces() {
        try {
            const detections = await faceapi.detectAllFaces(this.video)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            console.info(detections);

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

                const entry = {
                    label: match.label,
                    timestamp: new Date().toISOString(),
                    present: true,
                };

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
            console.warn("Error during face detection:", error);
        }
    }


}
