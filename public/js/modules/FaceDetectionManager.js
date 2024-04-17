//  ? Static variable to track attendance status

import PoseNetHandler from "./PoseNetManager.js";
// ! Original (O.G) File
let isAttendanceStarted = false;

// Display the progress bar initially
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

        // * PoseNetHandler
        this.Posenet = null;
    }

    async initialize() {
        await this.startWebcam();
        progressBar.style.width = "25%";
        await this.initializeFaceAPI();
        progressBar.style.width = "50%";
        this.createCanvasFromMedia();
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
     * * Creates a canvas element from the provided video stream and appends it to the document.
     */
    createCanvasFromMedia = async () => {
        // * for face reco
        this.canvas_face = faceapi.createCanvasFromMedia(this.video);
        this.canvas_face.id = "video-rec";
        document.getElementById('video-frame').append(this.canvas_face);
        faceapi.matchDimensions(this.canvas_face, { width: this.video.width, height: this.video.height });

        // * for pose net
        this.canvas_pos = faceapi.createCanvasFromMedia(this.video);
        this.canvas_pos.id = "video-pose";
        document.getElementById('video-frame').append(this.canvas_pos);
        faceapi.matchDimensions(this.canvas_pos, { width: this.video.width, height: this.video.height });
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
    * * Initializes the PoseNet from ml5.kjs
    */
    async initializePoseNet() {
        this.Posenet = new PoseNetHandler(this.video, this.canvas_pos);
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
                // Deserialize the data from localStorage
                const parsedData = JSON.parse(labeledFaceDescriptorsFromLocalStorage);

                // Convert each index value to LabeledFaceDescriptors object
                const labeledFaceDescriptors = parsedData.map(item => {
                    // ? Caching
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

                // Serialize and save the data to localStorage
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
    saveAttendance = () => {

        // * get session name 
        const sessionname = document.getElementById("sessionname");
        let sessName = sessionname.value

        async function postData(url, data) {
            // Default options are marked with *
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: "tatakae",
                    name: sessName,
                    students: data
                })
            });
            return await response.json();
        }

        // *function to get cookies
        function getCookie(cname) {
            let name = cname + "=";
            let ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        }

        const attendanceArray = Array.from(this.attendanceToday);
        const URL = getCookie("REMOTEURL");

        postData(decodeURIComponent(URL) + "/create-session", attendanceArray)
            .then((res) => {
                console.log(res);
                alert("Attendance saved to JSON file:", attendanceArray);
            })
    }


    /**
    * *  Updates the attendance table with the current attendance records.
    */
    updateAttendanceTable = () => {
        this.tableBody.innerHTML = "";

        Array.from(this.attendanceToday).forEach((entry) => {
            const row = document.createElement("tr");
            const entryCell = document.createElement("td");
            entryCell.textContent = `${entry.label} ${entry.present} ${entry.timestamp} ${entry.pose}`;

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
    * * Detects faces in the video stream and updates the attendance records accordingly.
    */
    async detectFacesAndPose() {
        try {
            const detections = await faceapi.detectAllFaces(this.video)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            const displaySize = { width: this.video.width, height: this.video.height };
            faceapi.matchDimensions(this.canvas_face, displaySize);

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Call drawPoses only once and store the result
            const pose = await this.Posenet.drawPoses();

            resizedDetections.forEach(async (detection) => {
                this.canvas_face.getContext("2d").clearRect(0, 0, this.canvas_face.width, this.canvas_face.height);

                const box = detection.detection.box;

                const match = await this.faceMatcher.findBestMatch(detection.descriptor);
                const label = match && match.label !== "unknown" ? match.toString() : "unknown";

                const drawBox = new faceapi.draw.DrawBox(box, { label });

                await drawBox.draw(this.canvas_face);

                // Draw face expressions
                faceapi.draw.drawFaceExpressions(this.canvas_face, [detection]);

                // Draw face landmarks (if needed)
                // faceapi.draw.drawFaceLandmarks(this.canvas_face, [detection.landmarks]);

                // Use the stored pose variable
                if (pose) {
                    console.log("Pose Data: " + pose);
                }
                console.log(pose);

                const entry = {
                    label: match.label,
                    timestamp: new Date().toISOString(),
                    pose: pose,
                    present: true,
                };

                console.log(entry);

                const existingEntry = Array.from(this.attendanceToday).find((e) => e.label === entry.label);

                if (!existingEntry && entry.label !== "unknown") {
                    this.attendanceToday.add(entry);
                    let totalCount = this.attendanceToday.size;
                    this.count.innerText = "Detected: " + totalCount;
                }
            });

            // Update attendance table if needed
            this.updateAttendanceTable();

            // Request the next animation frame to continue detecting faces
            requestAnimationFrame(() => this.detectFacesAndPose());
        } catch (error) {
            console.warn("Error during face detection:", error);
        }
    }

}

// Define a variable to control the frame rate




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
        this.saveBtn.addEventListener("click", () => this.saveAttendance());

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

    saveAttendance = () => {
        this.faceRecognition.saveAttendance();
    }

    updateAttendanceTable() {
        this.faceRecognition.updateAttendanceTable();
    }
}


