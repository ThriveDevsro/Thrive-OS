import type { AiConfig } from "./config";
import type { AiProvider } from "./types";
import { GeminiAiProvider } from "./providers/gemini";

export function createAiProvider(config: AiConfig): AiProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiAiProvider(config);
  }
}
