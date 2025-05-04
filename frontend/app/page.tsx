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
};

export default function Home() {
  const [state, setState] = useState<AppState>({
    step: 1,
    previewUrl: "http://localhost:1984/stream.html?src=hackathon",
    rtspUrl: "rtsp://localhost:8554/hackathon",
    eventsToDetect: [],
    detectedEvents: [],
    streamContext: "",
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

  const nextStep = () => {
    setState({ ...state, step: state.step + 1 });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.previewUrl && state.rtspUrl) {
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
                  <Camera size={28} className="text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">Camera Setup</h2>
              </div>

              <p className="text-gray-400 mb-8">
                Your camera URLs have been pre-configured for this demo. You can
                modify them if needed.
              </p>

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

      case 4:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">
                Llama 🦙 CCTV Monitoring
              </h2>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showConfig ? <X size={18} /> : <Settings size={18} />}
                {showConfig ? "Hide Config" : "Configuration"}
              </button>
            </div>

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
                  {state.streamContext && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <h4 className="text-md font-medium mb-2 text-white">
                        Context
                      </h4>
                      <p className="text-sm text-gray-300">
                        {state.streamContext}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {showConfig ? (
                  <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-3 text-white">
                      Configuration
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">
                          Stream Context
                        </label>
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
                        </div>
                      </div>

                      {/* Edit Event Form */}
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

                      {/* Events List */}
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
