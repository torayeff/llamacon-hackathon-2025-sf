"use client";

import { useState } from "react";

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
};

export default function Home() {
  const [state, setState] = useState<AppState>({
    step: 1,
    previewUrl: "",
    rtspUrl: "",
    eventsToDetect: [],
    detectedEvents: [],
  });

  const [newEvent, setNewEvent] = useState<EventToDetect>({
    code: "",
    description: "",
    guidelines: "",
  });

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
      setState({
        ...state,
        eventsToDetect: [...state.eventsToDetect, { ...newEvent }],
      });
      setNewEvent({ code: "", description: "", guidelines: "" });
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 max-w-2xl mx-auto p-8">
            <div className="rounded-lg overflow-hidden w-64 h-64 relative mb-4 bg-blue-100 flex items-center justify-center">
              {/* Placeholder for Llama image */}
              <div className="text-3xl font-bold text-blue-700">🦙</div>
            </div>
            <h1 className="text-3xl font-bold text-center">
              Hello, I am Llama CCTV Operator
            </h1>
            <p className="text-xl text-center mb-6">
              I will help you monitor events through your camera feeds.
            </p>
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        );

      case 2:
        return (
          <div className="max-w-2xl mx-auto p-8">
            <h2 className="text-2xl font-bold mb-6">Camera Setup</h2>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Preview URL
                </label>
                <input
                  type="text"
                  value={state.previewUrl}
                  onChange={(e) =>
                    setState({ ...state, previewUrl: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com/preview"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  RTSP URL
                </label>
                <input
                  type="text"
                  value={state.rtspUrl}
                  onChange={(e) =>
                    setState({ ...state, rtspUrl: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="rtsp://camera.example.com/stream"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        );

      case 3:
        return (
          <div className="max-w-3xl mx-auto p-8">
            <h2 className="text-2xl font-bold mb-6">
              Configure Events to Detect
            </h2>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Add New Event</h3>
              <form
                onSubmit={handleAddEvent}
                className="space-y-4 p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Code
                  </label>
                  <input
                    type="text"
                    value={newEvent.code}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, code: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="person_detected"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Description
                  </label>
                  <input
                    type="text"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Person detected in frame"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Detection Guidelines
                  </label>
                  <textarea
                    value={newEvent.guidelines}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, guidelines: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Look for human shapes, standing or walking"
                    rows={3}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Event
                </button>
              </form>
            </div>

            {state.eventsToDetect.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  Events to Detect:
                </h3>
                <div className="space-y-2">
                  {state.eventsToDetect.map((event, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-md"
                    >
                      <div className="font-medium">{event.code}</div>
                      <div className="text-sm">{event.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={nextStep}
                disabled={state.eventsToDetect.length === 0}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md transition-colors ${
                  state.eventsToDetect.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"
                }`}
              >
                Start Monitoring
              </button>
              {state.eventsToDetect.length === 0 && (
                <p className="text-sm text-red-500">
                  Please add at least one event to detect
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-7xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">CCTV Monitoring</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-black aspect-video rounded-lg flex items-center justify-center mb-4">
                  {/* Video player placeholder */}
                  <div className="text-white text-center p-6">
                    <div className="text-4xl mb-2">📹</div>
                    <p>Preview URL: {state.previewUrl}</p>
                    <p className="text-sm mt-2 text-gray-400">
                      Video stream would be integrated here
                    </p>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Video Information
                  </h3>
                  <p className="text-sm">RTSP URL: {state.rtspUrl}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Events to Detect
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {state.eventsToDetect.map((event, index) => (
                      <div
                        key={index}
                        className="p-2 border border-gray-200 rounded-md"
                      >
                        <div className="font-medium">{event.code}</div>
                        <div className="text-sm">{event.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">
                    Detected Events
                  </h3>
                  <div className="max-h-80 overflow-y-auto">
                    {state.detectedEvents.length > 0 ? (
                      <div className="space-y-2">
                        {state.detectedEvents.map((event, index) => (
                          <div
                            key={index}
                            className="p-2 border border-gray-200 rounded-md"
                          >
                            <div className="font-medium">{event.code}</div>
                            <div className="text-sm">{event.description}</div>
                            <div className="text-xs text-gray-500">
                              {new Date().toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No events detected yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <main className="min-h-screen">{renderStep()}</main>;
}
