# LlamaCon Hackathon 2025 – San Francisco

## Project Title: ACCRO – AI CCTV Control Room Operator

### Project Objectives
1. Integrate RTSP stream
2. Define and track specific events
3. Generate real-time alerts
4. Compile actionable reports

### Technology Stack
- **Backend:** Python (FastAPI), LLaMA 4  
- **Frontend:** Next.js

### TODO
- [x] Check Llama 4 video capabilities - Max 128k, Max 9 frames at 640x360.
- [x] Test simple video event detection - Kinda works.
- [x] Develop logic for stream
- [x] Develop logic for alerting
- [ ] Implement Video Stream Chunker
- [ ] Implement Database Writer
- [ ] Think about frontend

```mermaid
flowchart LR
  %% ── Core stages ──
  subgraph Core stages
    RTSP["RTSP Stream"]
    Chunker["Video Stream Chunker (saves N-second files)"]
    Detector["Video Event Detector"]
    DBWriter["Database Writer"]
  end

  %% ── Supporting resources ──
  subgraph Supporting resources
    FS[(Filesystem)]
    ChunkQueue["Chunk Queue (file paths)"]
    EventQueue["Event Queue (event JSON)"]
    DB[(Database)]
  end

  %% ── Data flow ──
  RTSP --> Chunker

  %% writes video files
  Chunker --> FS

  %% enqueues file paths
  Chunker --> ChunkQueue

  ChunkQueue --> Detector

  %% enqueues detected events
  Detector --> EventQueue

  EventQueue --> DBWriter

  %% persists events
  DBWriter --> DB

```