import type { ChatThread, ChatMessage, SendMessageResult } from "@paperclipai/shared";
import { api } from "./client";

export const chatApi = {
  listThreads: (companyId: string) =>
    api.get<ChatThread[]>(`/companies/${companyId}/chat/threads`),

  getThread: (threadId: string) =>
    api.get<ChatThread>(`/chat/threads/${threadId}`),

  createThread: (companyId: string, body: { adapterType: string; model?: string }) =>
    api.post<ChatThread>(`/companies/${companyId}/chat/threads`, body),

  updateThread: (threadId: string, body: { title?: string; adapterType?: string; model?: string }) =>
    api.patch<ChatThread>(`/chat/threads/${threadId}`, body),

  deleteThread: (threadId: string) =>
    api.delete<void>(`/chat/threads/${threadId}`),

  listMessages: (threadId: string) =>
    api.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`),

  sendMessage: (threadId: string, body: { content: string }) =>
    api.post<SendMessageResult>(`/chat/threads/${threadId}/messages`, body),
};
