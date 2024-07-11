let video;
let bodyPose;
let poses = [];
let connections;

function setup() {
    // Create the video element
    video = document.createElement('video');
    video.width = 640;
    video.height = 480;
    video.autoplay = true; // Ensure video starts playing
    document.body.appendChild(video);

    // Initialize the bodyPose model
    bodyPose = ml5.bodyPose(video, modelLoaded);

    // Get the skeleton connection information
    connections = bodyPose.getSkeleton();
}

function modelLoaded() {
    console.log('Model loaded!');
    // Start detecting poses in the webcam video
    bodyPose.detectStart(video, gotPoses);
}

function draw() {
    // Check if video is playing and draw the skeleton connections
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Here, you can manipulate DOM elements or other visualizations
        // Use poses and connections to draw or manipulate as needed
        for (let i = 0; i < poses.length; i++) {
            let pose = poses[i];
            for (let j = 0; j < connections.length; j++) {
                let pointAIndex = connections[j][0];
                let pointBIndex = connections[j][1];
                let pointA = pose.pose.keypoints[pointAIndex];
                let pointB = pose.pose.keypoints[pointBIndex];
                // Only draw a line if both points are confident enough
                if (pointA.score > 0.5 && pointB.score > 0.5) {
                    // Example: draw line using DOM or other visual elements
                    drawLine(pointA.position.x, pointA.position.y, pointB.position.x, pointB.position.y);
                }
            }
        }
    }
    console.log(poses)
    // Request the next frame update
    requestAnimationFrame(draw);
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
    poses = results;
}

// Example function to draw line (replace with your own DOM manipulation or visualization method)
function drawLine(x1, y1, x2, y2) {
    let line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.width = `${Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)}px`;
    line.style.height = '2px';
    line.style.backgroundColor = 'red';
    line.style.left = `${Math.min(x1, x2)}px`;
    line.style.top = `${Math.min(y1, y2)}px`;
    line.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
    document.body.appendChild(line);
}

// Start the setup process when the window loads
window.onload = setup;
