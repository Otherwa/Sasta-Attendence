export default class PoseDetector {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.bodyPose = null;
        this.poses = [];
        this.connections = null;
    }

    async setup() {
        // ? Initialize the bodyPose model
        this.bodyPose = ml5.bodyPose(this.video, this.modelLoaded.bind(this));

        // ? Set canvas dimensions to match video dimensions
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
    }

    async modelLoaded() {
        console.log('Model loaded!');
        // ? Get the skeleton connection information
        this.connections = this.bodyPose.getSkeleton();
        // ? Start detecting poses in the webcam video
        await this.bodyPose.detectStart(this.video, await this.gotPoses.bind(this));
        // ? Start drawing frames
        requestAnimationFrame(await this.draw.bind(this));
    }

    async draw() {
        // ? Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ? Check if video is playing and draw the skeleton connections
        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.poses.forEach(pose => {

                // ? Draw skeleton
                this.connections.forEach(connection => {
                    const [partA, partB] = connection;
                    const pointA = pose.keypoints[partA];
                    const pointB = pose.keypoints[partB];
                    // ? if (pointA.score > 0.4 && pointB.score > 0.4) {
                    this.drawLine(pointA.x, pointA.y, pointB.x, pointB.y);
                    // ? }
                });

                // ? Draw keypoints
                pose.keypoints.forEach(keypoint => {
                    // ? if (keypoint.score > 0.4) {
                    this.drawKeypoint(keypoint.x, keypoint.y);
                    // ? }
                });
            });
        }

        // ? Request the next frame update
        requestAnimationFrame(await this.draw.bind(this));

        return this.poses;
    }

    async gotPoses(results) {
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

    drawKeypoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'blue';
        this.ctx.fill();
    }
  
    // ? Method to get detected poses
    async getDetectedPoses() {
        return this.poses;
    }
}
