[![CodeFactor](https://www.codefactor.io/repository/github/otherwa/sasta-attendence/badge)](https://www.codefactor.io/repository/github/otherwa/sasta-attendence)
[![DeepSource](https://app.deepsource.com/gh/Otherwa/Sasta-Attendence.svg/?label=code+coverage&show_trend=true&token=JS8-u3rZnXk42g9Oo5MzWKl8)](https://app.deepsource.com/gh/Otherwa/Sasta-Attendence/)

# Prototype 
![image](https://github.com/Otherwa/Sasta-Attendence/assets/67428572/409f2393-5b29-4134-831b-9f021a26ddae)

# Major Dependency
[https://github.com/justadudewhohacks/face-api.js](https://github.com/justadudewhohacks/face-api.js)
# IMPORTANT: Bug Fixes

## `navigator.mediaDevices.getUserMedia`

## insights


## [![Repography logo](https://images.repography.com/logo.svg)](https://repography.com) / Recent activity [![Time period](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_badge.svg)](https://repography.com)
[![Timeline graph](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_timeline.svg)](https://github.com/Otherwa/Sasta-Attendence/commits)
[![Issue status graph](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_issues.svg)](https://github.com/Otherwa/Sasta-Attendence/issues)
[![Pull request status graph](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_prs.svg)](https://github.com/Otherwa/Sasta-Attendence/pulls)
[![Trending topics](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_words.svg)](https://github.com/Otherwa/Sasta-Attendence/commits)
[![Top contributors](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_users.svg)](https://github.com/Otherwa/Sasta-Attendence/graphs/contributors)
[![Activity map](https://images.repography.com/25186133/Otherwa/Sasta-Attendence/recent-activity/jm4ViL-FdH5OLKhxEjvGcobP5jY2n8y3H_RT3csUKaQ/69t4X1TTCcfrH30zm7xDcA6k8n0mStEaJ_agQ1gDLvI_map.svg)](https://github.com/Otherwa/Sasta-Attendence/commits)



`navigator.mediaDevices.getUserMedia` is now deprecated and is replaced by `navigator.mediaDevices.getUserMedia`. To fix this bug replace all versions of `navigator.mediaDevices.getUserMedia` with `navigator.mediaDevices.getUserMedia`

## Low-end Devices Bug

The video eventListener for `play` fires up too early on low-end machines, before the video is fully loaded, which causes errors to pop up from the Face API and terminates the script (tested on Debian [Firefox] and Windows [Chrome, Firefox]). Replaced by `playing` event, which fires up when the media has enough data to start playing.
