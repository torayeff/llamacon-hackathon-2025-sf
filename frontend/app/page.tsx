"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Pencil,
  Trash2,
  Camera,
  ArrowLeft,
  Plus,
  ArrowRight,
  AlertTriangle,
  Settings,
  X,
} from "lucide-react";

type EventToDetect = {
  code: string;
  description: string;
  guidelines: string;
};

type AppState = {
  step: number;
  previewUrl: string;
  rtspUrl: string;
  eventsToDetect: EventToDetect[];
  detectedEvents: EventToDetect[];
  streamContext: string;
  chunkDuration: number;
  outputDir: string;
  llamaModel: string;
  baseUrl: string;
};

export default function Home() {
  const [state, setState] = useState<AppState>({
    step: 1,
    previewUrl: "http://localhost:1984/stream.html?src=hackathon",
    rtspUrl: "rtsp://localhost:8554/hackathon",
    eventsToDetect: [
      {
        code: "robot-is-idle",
        description:
          "The robotic arm hasn't moved for the whole duration of the video.",
        guidelines:
          "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the green light is on.",
      },
      {
        code: "robot-in-error",
        description: "The robot is in error state.",
        guidelines:
          "This event must be detected if and only if the robot hasn't moved for the whole duration of the video and the red light is on.",
      },
    ],
    detectedEvents: [],
    streamContext:
      "These frames are sampled every 1 second from a video of a robotic arm. The sequences depict a warehouse environment with a robotic arm and a conveyor belt.",
    chunkDuration: 5,
    outputDir: "/Users/torayeff/lab/localdata/video_chunks",
    llamaModel: "Llama-4-Maverick-17B-128E-Instruct-FP8",
    baseUrl: "https://api.llama.com/compat/v1/",
  });

  const [newEvent, setNewEvent] = useState<EventToDetect>({
    code: "",
    description: "",
    guidelines: "",
  });

  const [editingEvent, setEditingEvent] = useState<{
    index: number;
    event: EventToDetect;
  } | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Function to start detection
  const startDetection = async () => {
    try {
      setStatusMessage("Starting detection...");

      // Format the request body according to backend API
      const requestBody = {
        model: state.llamaModel,
        base_url: state.baseUrl,
        rtsp_url: state.rtspUrl,
        chunk_duration: state.chunkDuration,
        output_dir: state.outputDir,
        context: state.streamContext,
        events: state.eventsToDetect.map((event) => ({
          event_code: event.code,
          event_description: event.description,
          detection_guidelines: event.guidelines,
        })),
      };

      const response = await fetch("http://localhost:8000/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setIsDetecting(true);
        setStatusMessage("Detection started successfully");

        // Start polling for events
        pollForEvents();
      } else {
        const errorData = await response.json();
        setStatusMessage(
          `Error starting detection: ${errorData.detail || response.statusText}`
        );
      }
    } catch (error) {
      setStatusMessage(
        `Error starting detection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Function to stop detection
  const stopDetection = async () => {
    try {
      setStatusMessage("Stopping detection...");
      const response = await fetch("http://localhost:8000/stop", {
        method: "POST",
      });

      if (response.ok) {
        setIsDetecting(false);
        setStatusMessage("Detection stopped successfully");
      } else {
        const errorData = await response.json();
        setStatusMessage(
          `Error stopping detection: ${errorData.detail || response.statusText}`
        );
      }
    } catch (error) {
      setStatusMessage(
        `Error stopping detection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Function to poll for events
  const pollForEvents = async () => {
    try {
      const response = await fetch("http://localhost:8000/status");
      if (response.ok) {
        const data = await response.json();

        // If we have detected events from the server, update our state
        if (data.detected_events && Array.isArray(data.detected_events)) {
          const formattedEvents = data.detected_events.map(
            (event: {
              event_code: string;
              event_description: string;
              detection_guidelines: string;
            }) => ({
              code: event.event_code,
              description: event.event_description,
              guidelines: event.detection_guidelines,
            })
          );

          setState((prevState) => ({
            ...prevState,
            detectedEvents: formattedEvents,
          }));
        }

        // Continue polling if detection is active
        if (isDetecting) {
          setTimeout(pollForEvents, 2000); // Poll every 2 seconds
        }
      }
    } catch (error) {
      console.error("Error polling for events:", error);
      // Continue polling despite errors
      if (isDetecting) {
        setTimeout(pollForEvents, 5000); // Retry after 5 seconds on error
      }
    }
  };

  const nextStep = () => {
    setState({ ...state, step: state.step + 1 });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.previewUrl && state.rtspUrl) {
      nextStep();
    }
  };

  const handleLlamaSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.llamaModel && state.baseUrl) {
      nextStep();
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.code && newEvent.description && newEvent.guidelines) {
      if (editingEvent !== null) {
        // Update existing event
        const updatedEvents = [...state.eventsToDetect];
        updatedEvents[editingEvent.index] = { ...newEvent };
        setState({
          ...state,
          eventsToDetect: updatedEvents,
        });
        setEditingEvent(null);
      } else {
        // Add new event
        setState({
          ...state,
          eventsToDetect: [...state.eventsToDetect, { ...newEvent }],
        });
      }
      setNewEvent({ code: "", description: "", guidelines: "" });
    }
  };

  const handleDeleteEvent = (index: number) => {
    const updatedEvents = state.eventsToDetect.filter((_, i) => i !== index);
    setState({
      ...state,
      eventsToDetect: updatedEvents,
    });
  };

  const handleEditEvent = (index: number) => {
    setEditingEvent({
      index,
      event: state.eventsToDetect[index],
    });
    setNewEvent(state.eventsToDetect[index]);
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setNewEvent({ code: "", description: "", guidelines: "" });
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center space-y-8 max-w-2xl mx-auto p-8 min-h-[calc(100vh-2rem)]">
            <div className="rounded-full overflow-hidden w-64 h-64 relative mb-6">
              <Image
                src="/greeting_avatar.png"
                alt="Llama CCTV Operator"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
            <h1 className="text-4xl font-bold text-center text-white">
              Llama CCTV Operator
            </h1>
            <p className="text-xl text-center mb-6 text-gray-300">
              Intelligent monitoring for your camera feeds
            </p>
            <p className="text-center text-gray-400 mb-8 max-w-lg">
              Powered by Llama 4, Meta&apos;s advanced multimodal AI model.
              Experience state-of-the-art computer vision and intelligent event
              detection for your security cameras.
            </p>
            <button
              onClick={nextStep}
              className="px-8 py-4 bg-indigo-800 text-white rounded-full hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2 focus:ring-offset-black"
            >
              Get Started
            </button>
          </div>
        );

      case 2:
        return (
          <div className="max-w-3xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col justify-center">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <Settings size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Llama API Setup
                </h2>
              </div>

              <p className="text-gray-400 mb-8">
                Configure the Llama AI model settings for video event detection.
              </p>

              <form onSubmit={handleLlamaSetupSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    Model
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.llamaModel}
                      onChange={(e) =>
                        setState({ ...state, llamaModel: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="Llama-4-Maverick-17B-128E-Instruct-FP8"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    Base URL
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.baseUrl}
                      onChange={(e) =>
                        setState({ ...state, baseUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="https://api.llama.com/compat/v1/"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setState({ ...state, step: state.step - 1 })}
                    className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-3xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col justify-center">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <Camera size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">Camera Setup</h2>
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    Preview URL
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.previewUrl}
                      onChange={(e) =>
                        setState({ ...state, previewUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="https://example.com/preview"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    RTSP URL
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.rtspUrl}
                      onChange={(e) =>
                        setState({ ...state, rtspUrl: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="rtsp://camera.example.com/stream"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    Chunk Duration (s)
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      value={state.chunkDuration}
                      onChange={(e) =>
                        setState({
                          ...state,
                          chunkDuration: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="5"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="block text-sm font-medium text-gray-300 md:col-span-1">
                    Output Directory
                  </label>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={state.outputDir}
                      onChange={(e) =>
                        setState({ ...state, outputDir: e.target.value })
                      }
                      className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                      placeholder="/Users/torayeff/lab/localdata/video_chunks/"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setState({ ...state, step: state.step - 1 })}
                    className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-4xl mx-auto p-8 min-h-[calc(100vh-2rem)] flex flex-col">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-800/30 rounded-full">
                  <Plus size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Configure Events to Detect
                </h2>
              </div>

              <div className="mb-8 border border-gray-800 rounded-xl p-6 bg-gray-900/30">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  Stream Context
                </h3>
                <p className="text-gray-400 mb-4">
                  Provide general context about the video stream to help with
                  detection.
                </p>
                <textarea
                  value={state.streamContext}
                  onChange={(e) =>
                    setState({ ...state, streamContext: e.target.value })
                  }
                  className="w-full p-4 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                  placeholder="Describe the general environment, camera location, or specific conditions of this stream..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Add New Event
                  </h3>
                  <form
                    onSubmit={handleAddEvent}
                    className="space-y-4 p-6 border border-gray-800 rounded-xl bg-gray-900/50"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Event Code
                      </label>
                      <input
                        type="text"
                        value={newEvent.code}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, code: e.target.value })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="person_detected"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Event Description
                      </label>
                      <input
                        type="text"
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="Person detected in frame"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">
                        Detection Guidelines
                      </label>
                      <textarea
                        value={newEvent.guidelines}
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            guidelines: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                        placeholder="Look for human shapes, standing or walking"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                      >
                        {editingEvent !== null ? "Update Event" : "Add Event"}
                      </button>
                      {editingEvent !== null && (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div>
                  {state.eventsToDetect.length > 0 ? (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 text-white">
                        Events to Detect
                      </h3>
                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
                        {state.eventsToDetect.map((event, index) => (
                          <div
                            key={index}
                            className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm"
                          >
                            <div className="font-medium text-white">
                              {event.code}
                            </div>
                            <div className="text-sm text-gray-300">
                              {event.description}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEditEvent(index)}
                                className="p-1.5 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors"
                                aria-label="Edit event"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(index)}
                                className="p-1.5 bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                                aria-label="Delete event"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 border border-gray-800 rounded-xl bg-gray-900/20">
                      <AlertTriangle
                        size={40}
                        className="text-amber-500 mb-4"
                      />
                      <p className="text-center text-gray-400">
                        No events added yet. Please add at least one event to
                        detect.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setState({ ...state, step: state.step - 1 })}
                  className="px-4 py-2 flex items-center gap-2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={state.eventsToDetect.length === 0}
                  className={`px-5 py-3 bg-indigo-800 text-white rounded-lg flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700 ${
                    state.eventsToDetect.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-indigo-900"
                  }`}
                >
                  Start Monitoring
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">
                Llama 🦙 CCTV Monitoring
              </h2>
              <div className="flex items-center gap-3">
                {isDetecting ? (
                  <button
                    onClick={stopDetection}
                    className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X size={18} />
                    Stop Detection
                  </button>
                ) : (
                  <button
                    onClick={startDetection}
                    className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Camera size={18} />
                    Start Detection
                  </button>
                )}

                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {showConfig ? <X size={18} /> : <Settings size={18} />}
                  {showConfig ? "Hide Config" : "Re-configure"}
                </button>

                {showConfig && (
                  <button
                    onClick={() => {
                      if (isDetecting) {
                        stopDetection().then(() => startDetection());
                      } else {
                        startDetection();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-800 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <ArrowRight size={18} />
                    Re-start Detection
                  </button>
                )}
              </div>
            </div>

            {statusMessage && (
              <div
                className={`p-3 mb-6 rounded-lg text-white ${
                  statusMessage.includes("Error")
                    ? "bg-red-900/50 border border-red-800"
                    : "bg-green-900/50 border border-green-800"
                }`}
              >
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-black aspect-video rounded-2xl flex items-center justify-center mb-6 overflow-hidden border border-gray-800">
                  {/* Replace Video player placeholder with iframe */}
                  <iframe
                    src={state.previewUrl}
                    className="w-full h-full"
                    title="Camera Preview"
                    allow="autoplay; fullscreen"
                  ></iframe>
                </div>
                <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    Video Information
                  </h3>
                  <p className="text-sm text-gray-300">
                    RTSP URL: {state.rtspUrl}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {showConfig ? (
                  <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-3 text-white">
                      Configuration
                    </h3>

                    <div className="space-y-4">
                      {/* Llama API Settings - Moved to be first */}
                      <div>
                        <h4 className="text-md font-medium mb-3 text-white">
                          Llama API Settings
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              Model
                            </label>
                            <input
                              type="text"
                              value={state.llamaModel}
                              onChange={(e) =>
                                setState({
                                  ...state,
                                  llamaModel: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="Llama-4-Maverick-17B-128E-Instruct-FP8"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              Base URL
                            </label>
                            <input
                              type="text"
                              value={state.baseUrl}
                              onChange={(e) =>
                                setState({ ...state, baseUrl: e.target.value })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="https://api.llama.com/compat/v1/"
                            />
                          </div>
                        </div>
                      </div>

                      {/* URL Settings */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-md font-medium mb-3 text-white">
                          Stream URLs
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              Preview URL
                            </label>
                            <input
                              type="text"
                              value={state.previewUrl}
                              onChange={(e) =>
                                setState({
                                  ...state,
                                  previewUrl: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="http://localhost:1984/stream.html?src=hackathon"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              RTSP URL
                            </label>
                            <input
                              type="text"
                              value={state.rtspUrl}
                              onChange={(e) =>
                                setState({ ...state, rtspUrl: e.target.value })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="rtsp://localhost:8554/hackathon"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              Chunk Duration (s)
                            </label>
                            <input
                              type="number"
                              value={state.chunkDuration}
                              onChange={(e) =>
                                setState({
                                  ...state,
                                  chunkDuration: parseInt(e.target.value) || 5,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="5"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1 text-gray-300">
                              Output Directory
                            </label>
                            <input
                              type="text"
                              value={state.outputDir}
                              onChange={(e) =>
                                setState({
                                  ...state,
                                  outputDir: e.target.value,
                                })
                              }
                              className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                              placeholder="/Users/torayeff/lab/localdata/video_chunks/"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stream Context - Moved to be above the Events section */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-md font-medium mb-3 text-white">
                          Stream Context
                        </h4>
                        <textarea
                          value={state.streamContext}
                          onChange={(e) =>
                            setState({
                              ...state,
                              streamContext: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                          placeholder="Describe the environment..."
                          rows={3}
                        />
                      </div>

                      {/* Events List - Moved before Edit Event Form */}
                      {state.eventsToDetect.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h4 className="text-md font-medium mb-3 text-white">
                            Events
                          </h4>
                          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                            {state.eventsToDetect.map((event, index) => (
                              <div
                                key={index}
                                className="p-2 border border-gray-800 rounded-lg bg-gray-900 flex justify-between items-center"
                              >
                                <div>
                                  <div className="font-medium text-sm text-white">
                                    {event.code}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {event.description}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditEvent(index)}
                                    className="p-1 bg-indigo-800 text-white rounded hover:bg-indigo-900 transition-colors"
                                    aria-label="Edit event"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(index)}
                                    className="p-1 bg-red-800 text-white rounded hover:bg-red-900 transition-colors"
                                    aria-label="Delete event"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit Event Form - Now after Events List */}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-md font-medium mb-3 text-white">
                          {editingEvent !== null
                            ? "Edit Event"
                            : "Add New Event"}
                        </h4>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={newEvent.code}
                            onChange={(e) =>
                              setNewEvent({ ...newEvent, code: e.target.value })
                            }
                            className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                            placeholder="Event Code"
                          />
                          <input
                            type="text"
                            value={newEvent.description}
                            onChange={(e) =>
                              setNewEvent({
                                ...newEvent,
                                description: e.target.value,
                              })
                            }
                            className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                            placeholder="Event Description"
                          />
                          <textarea
                            value={newEvent.guidelines}
                            onChange={(e) =>
                              setNewEvent({
                                ...newEvent,
                                guidelines: e.target.value,
                              })
                            }
                            className="w-full p-2 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                            placeholder="Detection Guidelines"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (newEvent.code && newEvent.description) {
                                  if (editingEvent !== null) {
                                    // Update existing event
                                    const updatedEvents = [
                                      ...state.eventsToDetect,
                                    ];
                                    updatedEvents[editingEvent.index] = {
                                      ...newEvent,
                                    };
                                    setState({
                                      ...state,
                                      eventsToDetect: updatedEvents,
                                    });
                                    setEditingEvent(null);
                                  } else {
                                    // Add new event
                                    setState({
                                      ...state,
                                      eventsToDetect: [
                                        ...state.eventsToDetect,
                                        { ...newEvent },
                                      ],
                                    });
                                  }
                                  setNewEvent({
                                    code: "",
                                    description: "",
                                    guidelines: "",
                                  });
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-800 text-white text-sm rounded hover:bg-indigo-900 transition-colors"
                            >
                              {editingEvent !== null ? "Update" : "Add"}
                            </button>
                            {editingEvent !== null && (
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-3 text-white">
                      Detected Events
                    </h3>
                    <div className="max-h-80 overflow-y-auto pr-2">
                      {state.detectedEvents.length > 0 ? (
                        <div className="space-y-3">
                          {state.detectedEvents.map((event, index) => (
                            <div
                              key={index}
                              className="p-3 border border-gray-800 rounded-lg bg-gray-900"
                            >
                              <div className="font-medium text-white">
                                {event.code}
                              </div>
                              <div className="text-sm text-gray-300">
                                {event.description}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          No events detected yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">{renderStep()}</main>
  );
}
