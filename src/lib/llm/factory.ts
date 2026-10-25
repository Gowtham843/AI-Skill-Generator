import { BaseLLMProvider } from "./providers";
import type { LLMProviderConfig, LLMMessage, LLMGenerateResponse } from "./providers";

export interface LLMFactoryConfig {
  openai?: { apiKey: string; baseUrl?: string; defaultModel: string };
  anthropic?: { apiKey: string; baseUrl?: string; defaultModel: string };
  google?: { apiKey: string; baseUrl?: string; defaultModel: string };
}

export function createLLMProvider(
  type: string,
  config: LLMFactoryConfig
): BaseLLMProvider | null {
  switch (type) {
    case "openai":
      return new OpenAIProvider({ name: "openai", ...config.openai! });
    case "anthropic":
      return new AnthropicProvider({ name: "anthropic", ...config.anthropic! });
    case "google":
      return new GoogleProvider({ name: "google", ...config.google! });
    default:
      return null;
  }
}

class OpenAIProvider extends BaseLLMProvider {
  name = "openai";
  defaultModel = "gpt-4o";
  constructor(public config: LLMProviderConfig) {
    super();
  }

  async generate(request: {
    model: string;
    messages: any[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
    const response = await openai.chat.completions.create({
      model: request.model ?? this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
    });
    return {
      content: response.choices[0].message.content ?? "",
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}

class AnthropicProvider extends BaseLLMProvider {
  name = "anthropic";
  defaultModel = "claude-sonnet-4-6";
  constructor(public config: LLMProviderConfig) {
    super();
  }

  async generate(request: {
    model?: string;
    messages: any[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    const { Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({
      apiKey: this.config.apiKey,
    });
    const response = await anthropic.messages.create({
      model: request.model ?? this.defaultModel,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      messages: request.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
    return {
      content: response.content[0]?.type === "text" ? response.content[0].text : "",
      usage: {
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}

// Recommended stable model for new projects (Gemini API deprecations page, Oct 2026).
// Override with GEMINI_MODEL.
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

// Error with a safe, user-facing message and an HTTP status for API routes.
export class LLMError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

// Gemini is the only provider used for Skill generation. No fallback to other providers.
// customApiKey: a key the user pasted for this one request (never stored).
export function getGeminiProvider(customApiKey?: string): GoogleProvider {
  // A pasted key is used alone; it never falls back to the server key.
  const apiKey = customApiKey !== undefined ? customApiKey.trim() : process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new LLMError(
      customApiKey !== undefined
        ? "Please paste a Gemini API key, or choose \"Use configured Gemini API key\"."
        : "Gemini is not configured. Add GEMINI_API_KEY=<your key> to .env.local (get a key at https://aistudio.google.com/apikey), then restart the server. Or paste your own key on the Create page.",
      400,
    );
  }
  const model = getGeminiModel();
  return new GoogleProvider({ name: "google", apiKey, defaultModel: model });
}

class GoogleProvider extends BaseLLMProvider {
  name = "google";
  defaultModel: string;
  constructor(public config: LLMProviderConfig) {
    super();
    this.defaultModel = config.defaultModel;
  }

  async generate(request: {
    model?: string;
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
    jsonSchema?: unknown;
  }): Promise<LLMGenerateResponse> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
    const model = request.model ?? this.defaultModel;
    const system = request.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system || undefined,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          ...(request.jsonSchema
            ? { responseMimeType: "application/json", responseJsonSchema: request.jsonSchema }
            : {}),
        },
      });
    } catch (error) {
      throw this.toLLMError(error, model);
    }

    const text = response.text;
    if (!text?.trim()) {
      const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
      throw new LLMError(`Gemini returned an empty response (reason: ${reason}). Please try again or change the input.`, 502);
    }
    return {
      content: text,
      provider: "google",
      model,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }

  // Map SDK errors to safe messages. Never include the API key.
  private toLLMError(error: unknown, model: string): LLMError {
    const status = (error as { status?: number })?.status;
    const raw = (error instanceof Error ? error.message : String(error)).split(this.config.apiKey).join("[redacted]");
    console.error(`Gemini API error (status ${status ?? "none"}):`, raw.slice(0, 500));
    const lower = raw.toLowerCase();
    if (status === 400 && lower.includes("api key")) return new LLMError("The Gemini API key is not valid. Check the key and try again.", 401);
    if (status === 401 || status === 403) return new LLMError("The Gemini API key was rejected or does not have access. Check the key and its permissions.", 401);
    if (status === 404) return new LLMError(`Gemini model "${model}" was not found. Set GEMINI_MODEL to a supported model (for example ${DEFAULT_GEMINI_MODEL}).`, 400);
    if (status === 429) {
      return lower.includes("quota")
        ? new LLMError("Gemini quota is used up for this API key. Check your plan and billing in Google AI Studio, or try later.", 429)
        : new LLMError("Gemini rate limit reached. Please wait a moment and try again.", 429);
    }
    if (status === 400) return new LLMError("Gemini rejected the request. Try shorter or simpler input.", 400);
    if (status && status >= 500) return new LLMError("Gemini is temporarily unavailable. Please try again shortly.", 503);
    return new LLMError("Could not reach the Gemini API. Check your network connection.", 502);
  }
}
