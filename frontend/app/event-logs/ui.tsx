"use client";

import { fetchData, DataItem } from "./data";
import { useState, useEffect } from "react";

export default function EventLogs() {
  const [data, setData] = useState<DataItem[]>([]);
  const [newEvents, setNewEvents] = useState<Set<number>>(new Set());
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  // Fetch data initially and then every 5 seconds
  useEffect(() => {
    const fetchEventData = async () => {
      const events = await fetchData();

      // Check for new events since last fetch
      const currentTime = new Date();
      if (lastFetchTime) {
        const newEventIds = new Set<number>();
        events.forEach((event) => {
          const eventTime = new Date(event.event_timestamp);
          if (eventTime > lastFetchTime) {
            newEventIds.add(event.event_id);
          }
        });
        setNewEvents(newEventIds);
      }

      setData(events);
      setLastFetchTime(currentTime);
    };

    // Initial fetch
    fetchEventData();

    // Set up polling interval (5 seconds)
    const intervalId = setInterval(fetchEventData, 5000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Remove event from flashing list when acknowledged
  const acknowledgeEvent = (eventId: number) => {
    setNewEvents((prev) => {
      const updated = new Set(prev);
      updated.delete(eventId);
      return updated;
    });
  };

  return (
    <div className="h-full">
      <div className="max-h-[calc(100%-2rem)] overflow-y-auto pr-2 space-y-3">
        {data.length > 0 ? (
          data.map((event) => (
            <div
              key={event.event_id}
              className={`p-3 border ${
                newEvents.has(event.event_id)
                  ? "border-indigo-800"
                  : "border-gray-800"
              } rounded-lg bg-gray-900/70 backdrop-blur-sm shadow-md`}
              style={{
                animation: newEvents.has(event.event_id)
                  ? "flash 1.5s infinite alternate"
                  : "none",
              }}
            >
              <style jsx>{`
                @keyframes flash {
                  0% {
                    background-color: rgba(49, 46, 129, 0.3);
                    border-color: #4f46e5;
                  }
                  50% {
                    background-color: rgba(17, 24, 39, 0.7);
                    border-color: #1f2937;
                  }
                  100% {
                    background-color: rgba(49, 46, 129, 0.3);
                    border-color: #4f46e5;
                  }
                }
              `}</style>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-white text-sm">
                    {event.event_code}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    {new Date(event.event_timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {event.event_description}
                  </div>
                  {event.event_detection_explanation_by_ai && (
                    <div className="mt-2 text-xs text-gray-400">
                      <span className="font-medium text-gray-300">
                        AI Analysis:
                      </span>{" "}
                      {event.event_detection_explanation_by_ai}
                    </div>
                  )}
                  {event.event_video_url && (
                    <a
                      href={event.event_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View Video
                    </a>
                  )}
                </div>
                {newEvents.has(event.event_id) && (
                  <button
                    onClick={() => acknowledgeEvent(event.event_id)}
                    className="px-2 py-1 bg-indigo-800 text-white text-xs rounded hover:bg-indigo-900 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            No events detected yet
          </div>
        )}
      </div>
    </div>
  );
}
