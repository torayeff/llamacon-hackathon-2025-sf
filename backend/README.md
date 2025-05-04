# Video Event Detection API

A FastAPI application for video event detection using AI.

## Setup

1. Install dependencies:
```bash
pip install fastapi uvicorn pydantic python-dotenv
```

2. Set environment variables:
```
LLAMA_API_KEY=your_api_key_here
DATABASE_URL=your_database_url_here
```

## Running the API

Start the server:
```bash
cd backend
python app.py
```

The server will start on http://0.0.0.0:8000

## API Endpoints

### Start Service
```
POST /start
```

Request body example:
```json
{
  "model": "Llama-4-Maverick-17B-128E-Instruct-FP8",
  "base_url": "https://api.llama.com/compat/v1/",
  "rtsp_url": "rtsp://localhost:8554/hackathon",
  "chunk_duration": 5,
  "output_dir": "../localdata/video_chunks",
  "context": "These frames are sampled every 1 second from a video of a robotic arm.",
  "events": [
    {
      "event_code": "robot-is-idle",
      "event_description": "The robotic arm hasn't moved for the whole duration of the video.",
      "detection_guidelines": "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the green light is on."
    },
    {
      "event_code": "robot-in-error",
      "event_description": "The robot is in error state.",
      "detection_guidelines": "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the red light is on."
    }
  ]
}
```

### Stop Service
```
POST /stop
```

### Get Status
```
GET /status
```

## Interactive Documentation

FastAPI provides interactive documentation at:
- http://0.0.0.0:8000/docs
- http://0.0.0.0:8000/redoc 