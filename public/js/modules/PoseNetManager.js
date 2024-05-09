export default class PoseNetHandler {
    constructor(videoElement, canvas) {
        this.video = videoElement;
        this.canvas = canvas;
        this.ctx = null;
        this.poseNet = null;
        this.options = {
            architecture: 'MobileNetV1',
            imageScaleFactor: 0.3,
            outputStride: 16,
            flipHorizontal: false,
            minConfidence: 0.5,
            maxPoseDetections: 5,
            scoreThreshold: 0.5,
            nmsRadius: 20,
            detectionType: 'multiple',
            inputResolution: 513,
            multiplier: 0.75,
            quantBytes: 2,
        };
        this.initialize();
    }

    async initialize() {
        await this.waitForVideoLoad();

        this.ctx = this.canvas.getContext('2d');

        // Set up PoseNet
        this.poseNet = ml5.poseNet(this.video, this.options, this.modelLoaded.bind(this));
    }

    waitForVideoLoad() {
        return new Promise((resolve) => {
            if (this.video.readyState >= 3) {
                resolve();
            } else {
                this.video.addEventListener('loadeddata', resolve);
            }
        });
    }

    modelLoaded() {
        console.log('Model Loaded!');
    }

    async drawPoses() {
        return new Promise((resolve, reject) => {
            this.poseNet.on('pose', (results) => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                if (results) {
                    results.forEach((pose) => {


                        const keypoints = pose.pose.keypoints;
                        keypoints.forEach((keypoint) => {
                            const x = keypoint.position.x;
                            const y = keypoint.position.y;
                            this.ctx.beginPath();
                            this.ctx.arc(x, y, 7, 0, 2 * Math.PI);
                            this.ctx.fillStyle = 'yellow';
                            this.ctx.fill();
                            this.ctx.fillStyle = 'black';
                            this.ctx.font = '10px Arial';
                            this.ctx.fillText('Confidence: ' + keypoint.score.toFixed(2), x + 10, y - 10);
                            this.ctx.fillText('Part: ' + keypoint.part, x + 20, y - 20);
                        });
                    });
                    resolve(results);
                } else {
                    resolve([]); // Return an empty array if no poses are detected
                }
            });
        });
    }


}
