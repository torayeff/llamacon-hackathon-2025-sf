# Streamer Demo

This is a streamer demo using [go2rtc](https://github.com/AlexxIT/go2rtc/) for demonstration purposes.

## Getting Started

1. **Download `go2rtc`**

   Visit the [releases page](https://github.com/AlexxIT/go2rtc/releases/) and download the appropriate version for your operating system.

2. **Extract the Archive**

   Unzip the downloaded file to a directory of your choice.

3. **Configure `go2rtc.yaml`**

   Edit the `go2rtc.yaml` file to define your media stream. Here's a sample configuration to stream a local file:

   ```yaml
   streams:
     hackathon: ffmpeg:../localdata/hackathon_demo.mp4#video=h264
    ```

This example sets up a stream named `hackathon` using an MP4 file located at `../localdata/hackathon_demo.mp4`. The `#video=h264` parameter specifies the video codec.

4. **Start the Server**

   Run `go2rtc` from the command line:

   ```bash
   ./go2rtc
   ```

5. **Access the Stream**

   Open your browser and navigate to:

   ```
   http://localhost:1984/stream.html?src=hackathon
   ```

   RTSP Stream:
   ```
   rtsp://localhost:8554/hackathon
   ```
---

For more advanced configurations or camera streaming, refer to the official [go2rtc documentation](https://github.com/AlexxIT/go2rtc#readme).
