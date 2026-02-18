import mongoose, { Document, Schema } from 'mongoose';

export interface ChatDocument extends Document {
  user: mongoose.Types.ObjectId;
  prompt: string;
  response: string;
  metadata?: Record<string, unknown>;
}

const ChatSchema = new Schema<ChatDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    metadata: { type: Object }
  },
  { timestamps: true }
);

const ChatModel = mongoose.model<ChatDocument>('Chat', ChatSchema);

export default ChatModel;