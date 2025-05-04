"use client";

import { useState } from "react";
import Image from "next/image";

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
          <div className="max-w-2xl mx-auto p-8">
            <h2 className="text-3xl font-bold mb-8 text-white">Camera Setup</h2>
            <form onSubmit={handleUrlSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Preview URL
                </label>
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
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  RTSP URL
                </label>
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
              <button
                type="submit"
                className="w-full px-4 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
              >
                Continue
              </button>
            </form>
          </div>
        );

      case 3:
        return (
          <div className="max-w-3xl mx-auto p-8">
            <h2 className="text-3xl font-bold mb-8 text-white">
              Configure Events to Detect
            </h2>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Add New Event
              </h3>
              <form
                onSubmit={handleAddEvent}
                className="space-y-4 p-6 border border-gray-800 rounded-2xl bg-gray-900/50"
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
                      setNewEvent({ ...newEvent, description: e.target.value })
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
                      setNewEvent({ ...newEvent, guidelines: e.target.value })
                    }
                    className="w-full p-3 border border-gray-800 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-indigo-700 focus:border-transparent"
                    placeholder="Look for human shapes, standing or walking"
                    rows={3}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-3 bg-indigo-800 text-white rounded-lg hover:bg-indigo-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700"
                >
                  Add Event
                </button>
              </form>
            </div>

            {state.eventsToDetect.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  Events to Detect:
                </h3>
                <div className="space-y-3">
                  {state.eventsToDetect.map((event, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm"
                    >
                      <div className="font-medium text-white">{event.code}</div>
                      <div className="text-sm text-gray-300">
                        {event.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4 items-center">
              <button
                onClick={nextStep}
                disabled={state.eventsToDetect.length === 0}
                className={`px-5 py-3 bg-indigo-800 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-700 ${
                  state.eventsToDetect.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-indigo-900"
                }`}
              >
                Start Monitoring
              </button>
              {state.eventsToDetect.length === 0 && (
                <p className="text-sm text-red-400">
                  Please add at least one event to detect
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-8 text-white">
              CCTV Monitoring
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-black aspect-video rounded-2xl flex items-center justify-center mb-6 overflow-hidden border border-gray-800">
                  {/* Video player placeholder */}
                  <div className="text-white text-center p-6">
                    <div className="text-4xl mb-4">📹</div>
                    <p className="text-gray-300">
                      Preview URL: {state.previewUrl}
                    </p>
                    <p className="text-sm mt-3 text-gray-400">
                      Video stream would be integrated here
                    </p>
                  </div>
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
                <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Events to Detect
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                    {state.eventsToDetect.map((event, index) => (
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
                      </div>
                    ))}
                  </div>
                </div>

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
