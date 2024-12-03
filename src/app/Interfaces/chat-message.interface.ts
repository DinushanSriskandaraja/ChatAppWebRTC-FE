export interface ChatMessage {
  from: string; // Sender of the message
  to: string; // Recipient of the message
  text: string; // Content of the message
  id: string; // Unique identifier for each message (e.g., timestamp or UUID)
  timestamp?: string; // Optional: Timestamp of when the message was sent (if needed)
}
