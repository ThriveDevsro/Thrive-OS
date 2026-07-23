import type { AiConfig } from "../config";
import { AiError } from "../errors";
import {
  leadAnalysisJsonSchema,
  leadAnalysisOutputSchema,
} from "../output-schema";
import type { AiJsonRequest, AiProvider, AiProviderRequest } from "../types";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
};

export class GeminiAiProvider implements AiProvider {
  readonly name = "gemini";
  readonly model: string;

  constructor(private readonly config: AiConfig) {
    this.model = config.model;
  }

  async analyzeLead(request: AiProviderRequest) {
    const value = await this.generateJson({
      ...request,
      jsonSchema: leadAnalysisJsonSchema,
    });
    const parsed = leadAnalysisOutputSchema.safeParse(value);
    if (!parsed.success) throw new AiError("AI_INVALID_OUTPUT", 502);
    return parsed.data;
  }

  async generateJson(request: AiJsonRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs,
    );
    const model = encodeURIComponent(
      this.config.model.replace(/^models\//, ""),
    );
    const endpoint = new URL(
      `models/${model}:generateContent`,
      this.config.endpoint,
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: request.systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: request.prompt },
                ...(request.images ?? []).map((image) => ({
                  inlineData: {
                    mimeType: image.mimeType,
                    data: image.dataBase64,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseJsonSchema: request.jsonSchema,
          },
        }),
      });
      if (response.status === 429) throw new AiError("AI_RATE_LIMITED", 429);
      if (response.status >= 500)
        throw new AiError("AI_PROVIDER_UNAVAILABLE", 503);
      if (!response.ok) throw new AiError("AI_PROVIDER_REJECTED", 502);

      const payload = (await response.json()) as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("");
      if (!text) throw new AiError("AI_INVALID_OUTPUT", 502);

      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        throw new AiError("AI_INVALID_OUTPUT", 502);
      }
      return value;
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AiError("AI_PROVIDER_TIMEOUT", 504);
      }
      throw new AiError("AI_PROVIDER_UNAVAILABLE", 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}
