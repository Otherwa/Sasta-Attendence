export default class PoseDetector {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.bodyPose = null;
        this.poses = [];
        this.connections = null;

        // Set canvas dimensions to match video dimensions
        this.canvas.width = this.video.width;
        this.canvas.height = this.video.height;
    }

    async setup() {
        // Initialize the bodyPose model
        this.bodyPose = ml5.bodyPose(this.video, this.modelLoaded.bind(this));

        // Get the skeleton connection information
        this.connections = this.bodyPose.getSkeleton();
    }

    modelLoaded() {
        console.log('Model loaded!');
        // Start detecting poses in the webcam video
        this.bodyPose.detectStart(this.video, this.gotPoses.bind(this));
    }

    async draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Check if video is playing and draw the skeleton connections
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            // Here, you can manipulate canvas drawing based on poses and connections
            for (let i = 0; i < this.poses.length; i++) {
                let pose = this.poses[i];
                console.log(pose)
                for (let j = 0; j < this.connections.length; j++) {
                    let pointAIndex = this.connections[j][0];
                    let pointBIndex = this.connections[j][1];
                    let pointA = pose.keypoints[pointAIndex];
                    let pointB = pose.keypoints[pointBIndex];
                    // Only draw a line if both points are confident enough
                    if (pointA.score > 0.5 && pointB.score > 0.5) {
                        this.drawLine(pointA.position.x, pointA.position.y, pointB.position.x, pointB.position.y);
                    }
                }
            }
        }

        // Request the next frame update
        requestAnimationFrame(this.draw.bind(this));
    }

    gotPoses(results) {
        this.poses = results;
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
}