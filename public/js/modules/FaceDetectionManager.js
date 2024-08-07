// ?  ! Original (O.G) File

// ?   ? Static variable to track attendance status
import PoseDetector from './PoseNetManager.js';

let isAttendanceStarted = false;

/**
 * *https://justadudewhohacks.github.io/face-api.js/docs/globals.html 
 * */

// ?  Display the progress bar initially
const progressBar = document.getElementById("myProgressBar");
progressBar.style.width = "0%";
progressBar.style.transition = "width 1s ease";


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

        // ?  * PoseNetHandler
    }

    async initialize() {
        await this.startWebcam();
        progressBar.style.width = "25%";
        await this.initializeFaceAPI();
        progressBar.style.width = "50%";
        await this.createCanvasFromMedia();
        progressBar.style.width = "65%";
        await this.initializePoseNet();
        progressBar.style.width = "75%";
        await this.detectFacesAndPose()
        progressBar.style.width = "100%";
        await this.Running();
    }

    async Running() {
        window.alert("Face-Api Up and Running");
    }

    /**
     * * Creates a canvas elements from the provided video stream and appends it to the document.
     */
    createCanvasFromMedia = async () => {
        // ?  * for face reco
        this.canvas_face = faceapi.createCanvasFromMedia(this.video);
        this.canvas_face.id = "video-rec";
        document.getElementById('video-frame').append(this.canvas_face);
        faceapi.matchDimensions(this.canvas_face, { width: this.video.width, height: this.video.height });

        // ?  * for face reco
        this.canvas_pose = faceapi.createCanvasFromMedia(this.video);
        this.canvas_pose.id = "video-pose";
        // this.canvas_pose.style = "left: 95px;";
        document.getElementById('video-frame').append(this.canvas_pose);
        faceapi.matchDimensions(this.canvas_pose, { width: this.video.width, height: this.video.height });
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
    * * Initializes the PoseNet from ml5.js
    */
    async initializePoseNet() {
        this.Posenet = new PoseDetector(this.video, this.canvas_pose);
        await this.Posenet.setup();
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
            this.faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);


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
            let labeledFaceDescriptorsFromLocalStorage = localStorage.getItem('labeledFaceDescriptors');

            if (labeledFaceDescriptorsFromLocalStorage) {
                // ?  Deserialize the data from localStorage
                const parsedData = JSON.parse(labeledFaceDescriptorsFromLocalStorage);

                // ?  Convert each index value to LabeledFaceDescriptors object
                const labeledFaceDescriptors = parsedData.map(item => {
                    // ?  ? Caching
                    const descriptors = item._descriptors.map(descriptor => {
                        const values = Object.values(descriptor);
                        return new Float32Array(values);
                    });
                    return new faceapi.LabeledFaceDescriptors(item._label, descriptors);
                });

                console.log(labeledFaceDescriptors);

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

                // ?  Serialize and save the data to localStorage
                const serializedData = JSON.stringify(labeledFaceDescriptors);
                localStorage.setItem('labeledFaceDescriptors', serializedData);

                console.log(labeledFaceDescriptors);
                return labeledFaceDescriptors;
            }
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
            // Increase the number of images per person
            for (let i = 1; i <= labels[1]; i++) {
                console.log(`Processing image ${i} for label ${labels[0]}`);

                // ? in index.js Route
                const imgPath = `./peeps/uploads/${labels[0]}/${i}.jpg`;
                try {
                    const img = await faceapi.fetchImage(imgPath);
                    console.log(`Image ${imgPath} loaded successfully`);

                    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });
                    const detection = await faceapi
                        .detectSingleFace(img, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor()
                        .withFaceExpressions();

                    if (detection) {
                        descriptions.push(detection.descriptor);
                        console.log(`Face descriptor for image ${i} added successfully`);
                    } else {
                        console.warn(`No face detected in image ${i} for label ${labels[0]}`);
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




    /**
    * * Saves the attendance records to a JSON file.
    */
    saveAttendance = () => {


        // ?  Call saveToExcel to update the Excel sheet continuously
        this.saveToExcel(this.attendanceToday);
    }


    /**
    * *  Updates the attendance table with the current attendance records.
    */
    updateAttendanceTable = () => {
        console.log(this.attendanceToday);
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
                console.log("Attendance today:", Array.from(this.attendanceToday));
            });

            actionCell.appendChild(removeButton);
            row.appendChild(entryCell);
            row.appendChild(actionCell);

            this.tableBody.appendChild(row);
        });
    }


    /**
     * * Analyzes the attentiveness of detected faces based on facial expressions, pose data, head orientation, eye openness, and mouth status.
     * * Updates the attendance records with attentiveness status.
     */
    analyzeAttentiveness = async (detection, poses) => {
        let isAttentive = false;

        // ?  Analyze face expressions
        if (detection.expressions) {
            const expressions = detection.expressions;
            console.log("EXPRESSIONS")
            console.log(expressions)
            const attentiveExpression = expressions.neutral || expressions.happy || 0;

        }

        // ?  Analyze head orientation
        const landmarks = detection.landmarks;
        if (landmarks) {
            const nose = landmarks.getNose();
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            console.log("NOSE")
            console.log(nose);
            console.log("LEFTEYE")
            console.log(leftEye);
            console.log("RIGHTEYE")
            console.log(rightEye);

        }

        // ?  Analyze eye openness
        if (landmarks) {
            const leftEyeOpenness = landmarks.getLeftEyeBrow().reduce((acc, point) => acc + point.y, 0) / landmarks.getLeftEyeBrow().length;
            const rightEyeOpenness = landmarks.getRightEyeBrow().reduce((acc, point) => acc + point.y, 0) / landmarks.getRightEyeBrow().length;
            const eyeOpennessThreshold = 0.2;
            console.log("LEFTEYEOPENESS");
            console.log(leftEyeOpenness);
            console.log("RIGHTEYEOPENESS");
            console.log(rightEyeOpenness);

        }

        // ?  Analyze mouth status
        if (landmarks) {
            const mouth = landmarks.getMouth();
            const mouthOpenness = mouth[6].y - mouth[2].y; // ?  Adjust the points as needed
            const mouthOpennessThreshold = 0.3; // ?  Adjust this threshold as needed
            console.log("MOUTH");
            console.log(mouth);
            console.log("MOUTHOPENESS");
            console.log(mouthOpenness);

        }

        return isAttentive;
    }


    /**
    * * Detects faces in the video stream and updates the attendance records accordingly.
    */
    async detectFacesAndPose() {
        try {
            const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 })

            const detections = await faceapi.detectAllFaces(this.video, options)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            const displaySize = { width: this.video.width, height: this.video.height };
            faceapi.matchDimensions(this.canvas_face, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const newEntries = [];

            for (const detection of resizedDetections) {
                const box = detection.detection.box;
                const match = await this.faceMatcher.findBestMatch(detection.descriptor);
                const label = match && match.label !== "unknown" ? match : "unknown";

                console.log(match);

                const drawBox = new faceapi.draw.DrawBox(box, { label });
                drawBox.draw(this.canvas_face);

                faceapi.draw.drawFaceExpressions(this.canvas_face, [detection]);
                faceapi.draw.drawFaceLandmarks(this.canvas_face, [detection.landmarks]);

                const poses = await this.Posenet.draw();
                const isAttentive = await this.analyzeAttentiveness(detection, poses);

                let entry = Array.from(this.attendanceToday).find((e) => e.label === label);

                if (entry) {
                    entry.timestamp = new Date().toISOString();
                    entry.poses = poses;
                    entry.attentiveness = isAttentive ? "Attentive" : "Not Attentive";

                    // ? Add the new detection and keep only the last 5
                    entry.detections.push([detection, new Date().toISOString()]);
                    if (entry.detections.length > 5) {
                        entry.detections.shift();
                    }
                } else {
                    entry = {
                        label: label.toString().split(' (')[0],
                        poses: poses,
                        detections: [[detection, new Date().toISOString()]],  // ? Start with the current detection
                        attentiveness: isAttentive ? "Attentive" : "Not Attentive",
                        timestamp: new Date().toISOString(),
                    };
                    if (entry.label !== "unknown") {
                        newEntries.push(entry);
                    }
                }
            }

            // ? Update existing entries or add new ones
            newEntries.forEach(entry => {
                const existingEntry = Array.from(this.attendanceToday).find(e => e.label === entry.label);
                if (existingEntry) {
                    // ? Update existing entry
                    existingEntry.timestamp = entry.timestamp;
                    existingEntry.poses = entry.poses;
                    existingEntry.attentiveness = entry.attentiveness;
                    existingEntry.detections = entry.detections;
                } else {
                    // ? Add new entry
                    this.attendanceToday.add(entry);
                }
            });

            this.count.innerText = "Detected: " + this.attendanceToday.size;
            this.updateAttendanceTable();

            requestAnimationFrame(() => this.detectFacesAndPose());

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


        // ?  Create a blob from the workbook
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });

        // ?  Create a link element to download the blob
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

export default class FaceRecoHandler {
    /**
   * FaceRecoHandler class manages the attendance system for a video stream with face recognition.
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


