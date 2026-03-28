export interface ChatThread {
  id: string;
  companyId: string;
  userId: string | null;
  title: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  companyId: string;
  role: "user" | "assistant";
  content: string;
  runId: string | null;
  isStreaming: boolean;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  runId: string;
}
