export type AudioTranscriptionRequest = {
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
};

export interface AudioTranscriptionProvider {
  transcribe(
    request: AudioTranscriptionRequest,
  ): Promise<{ transcript: string }>;
}

export interface VoiceConversationProvider {
  createSession(): Promise<never>;
}
