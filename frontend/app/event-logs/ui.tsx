"use client";

import { fetchData, DataItem } from "./data";
import { useState, useEffect } from "react";

export default function EventLogs() {
  const [data, setData] = useState<DataItem[]>([]);
  const [latestEventId, setLatestEventId] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date(0));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch data initially and then every 5 seconds
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setFetchError(null);
        const events = await fetchData();

        // Sort events by timestamp (newest first)
        const sortedEvents = [...events].sort(
          (a, b) =>
            new Date(b.event_timestamp).getTime() -
            new Date(a.event_timestamp).getTime()
        );

        // Check for latest event since last fetch
        const currentTime = new Date();

        // Find the newest event that's more recent than our last check
        if (sortedEvents.length > 0) {
          const newestEvent = sortedEvents[0]; // First event is newest due to sorting
          const newestEventTime = new Date(newestEvent.event_timestamp);

          // Check if this event is newer than our last check
          if (newestEventTime > lastFetchTime) {
            setLatestEventId(newestEvent.event_id);
          }
        }

        setData(sortedEvents);
        setLastFetchTime(currentTime);
      } catch (error) {
        console.error("Error fetching event data:", error);
        setFetchError(
          "Unable to load events. Please check your database connection."
        );
      }
    };

    // Initial fetch
    fetchEventData();

    // Set up polling interval (5 seconds)
    const intervalId = setInterval(fetchEventData, 5000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [lastFetchTime]);

  // Acknowledge the event
  const acknowledgeEvent = (eventId: number) => {
    if (latestEventId === eventId) {
      setLatestEventId(null);
    }
  };

  // Format the timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }) +
      " " +
      date.toLocaleDateString([], { month: "short", day: "numeric" })
    );
  };

  // Open video in modal or new window
  const openVideo = (url: string) => {
    window.open(url, "_blank", "width=800,height=600");
  };

  return (
    <div className="h-full">
      {fetchError && (
        <div className="bg-red-900/50 border border-red-800 rounded-lg p-3 mb-3 text-sm text-red-200 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {fetchError}
        </div>
      )}

      <div className="max-h-[calc(100%-2rem)] overflow-y-auto pr-2 space-y-3">
        {data.length > 0 ? (
          data.map((event) => {
            const isLatest = event.event_id === latestEventId;

            return (
              <div
                key={event.event_id}
                className={`p-4 border rounded-lg bg-gray-900/70 backdrop-blur-sm shadow-md transition-all duration-200 ${
                  isLatest ? "border-amber-500" : "border-gray-800"
                } ${
                  isLatest ? "hover:border-amber-400" : "hover:border-gray-700"
                }`}
                style={{
                  animation: isLatest
                    ? "flash 1.5s infinite alternate"
                    : "none",
                }}
              >
                <style jsx>{`
                  @keyframes flash {
                    0% {
                      background-color: rgba(245, 158, 11, 0.25);
                      border-color: rgb(245, 158, 11);
                      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
                    }
                    50% {
                      background-color: rgba(17, 24, 39, 0.7);
                      border-color: rgb(245, 158, 11, 0.5);
                      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
                    }
                    100% {
                      background-color: rgba(245, 158, 11, 0.25);
                      border-color: rgb(245, 158, 11);
                      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
                    }
                  }
                `}</style>

                {/* Top row with event code and timestamp */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        isLatest ? "bg-amber-500" : "bg-gray-500"
                      }`}
                    ></span>
                    <h3 className="font-medium text-white">
                      {event.event_code}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(event.event_timestamp)}
                  </span>
                </div>

                {/* Event description */}
                <div className="text-sm text-gray-300 mb-3">
                  {event.event_description}
                </div>

                {/* AI Analysis if available */}
                {event.event_detection_explanation_by_ai && (
                  <div className="mb-3 p-2 rounded bg-gray-800/50 border border-gray-700">
                    <div className="text-xs font-medium text-gray-400 mb-1">
                      AI ANALYSIS
                    </div>
                    <div className="text-xs text-gray-300">
                      {event.event_detection_explanation_by_ai}
                    </div>
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex justify-between items-center mt-2">
                  {/* Video button */}
                  {event.event_video_url && (
                    <button
                      onClick={() => openVideo(event.event_video_url)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded flex items-center gap-1.5 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m10 7 5 5-5 5V7z" />
                      </svg>
                      View Video
                    </button>
                  )}

                  {/* Acknowledge button - only for latest event */}
                  {isLatest && (
                    <button
                      onClick={() => acknowledgeEvent(event.event_id)}
                      className="px-3 py-1.5 text-xs rounded flex items-center gap-1.5 transition-colors bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2 text-gray-500"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <path d="M7 7h.01" />
              <path d="M12 7h.01" />
              <path d="M17 7h.01" />
              <path d="M7 12h.01" />
              <path d="M12 12h.01" />
              <path d="M17 12h.01" />
              <path d="M7 17h.01" />
              <path d="M12 17h.01" />
              <path d="M17 17h.01" />
            </svg>
            {fetchError ? "Error loading events" : "No events detected yet"}
          </div>
        )}
      </div>
    </div>
  );
}
