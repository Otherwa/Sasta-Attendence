# Prototype 
![image](https://github.com/Otherwa/Sasta-Attendence/assets/67428572/409f2393-5b29-4134-831b-9f021a26ddae)



# IMPORTANT: Bug Fixes

## `navigator.mediaDevices.getUserMedia`

`navigator.mediaDevices.getUserMedia` is now deprecated and is replaced by `navigator.mediaDevices.getUserMedia`. To fix this bug replace all versions of `navigator.mediaDevices.getUserMedia` with `navigator.mediaDevices.getUserMedia`

## Low-end Devices Bug

The video eventListener for `play` fires up too early on low-end machines, before the video is fully loaded, which causes errors to pop up from the Face API and terminates the script (tested on Debian [Firefox] and Windows [Chrome, Firefox]). Replaced by `playing` event, which fires up when the media has enough data to start playing.
