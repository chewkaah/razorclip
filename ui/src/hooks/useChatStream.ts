import { useEffect, useRef } from "react";

interface UseChatStreamOptions {
  companyId: string;
  activeRunId: string | null;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Connects to the Paperclip live events WebSocket and streams chat run output.
 * Listens for `heartbeat.run.log` events matching `activeRunId` and calls
 * `onChunk` with stdout text. Calls `onComplete` or `onError` on terminal status.
 */
export function useChatStream({
  companyId,
  activeRunId,
  onChunk,
  onComplete,
  onError,
}: UseChatStreamOptions) {
  // Use refs to avoid reconnecting when callbacks change
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onChunkRef.current = onChunk;
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!companyId || !activeRunId) return;

    let closed = false;
    let reconnectTimer: number | null = null;
    let socket: WebSocket | null = null;

    const TERMINAL_STATUSES = new Set([
      "succeeded",
      "failed",
      "cancelled",
      "timed_out",
    ]);

    const scheduleReconnect = () => {
      if (closed) return;
      reconnectTimer = window.setTimeout(connect, 1500);
    };

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${window.location.host}/api/companies/${encodeURIComponent(companyId)}/events/ws`;
      socket = new WebSocket(url);

      socket.onmessage = (message) => {
        const raw = typeof message.data === "string" ? message.data : "";
        if (!raw) return;

        let event: { type: string; companyId: string; payload?: Record<string, unknown> };
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }

        if (event.companyId !== companyId) return;
        const payload = event.payload ?? {};
        const runId = readString(payload["runId"]);
        if (runId !== activeRunId) return;

        if (event.type === "heartbeat.run.log") {
          const chunk = readString(payload["chunk"]);
          const stream = readString(payload["stream"]);
          if (chunk && stream !== "stderr") {
            onChunkRef.current(chunk);
          }
          return;
        }

        if (event.type === "heartbeat.run.status") {
          const status = readString(payload["status"]) ?? "";
          if (TERMINAL_STATUSES.has(status)) {
            if (status === "succeeded") {
              onCompleteRef.current();
            } else {
              onErrorRef.current(`Run ${status}`);
            }
          }
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close(1000, "chat_stream_unmount");
      }
    };
  }, [companyId, activeRunId]);
}
