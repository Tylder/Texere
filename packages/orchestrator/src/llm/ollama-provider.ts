import { Ollama } from 'ollama';

/**
 * Ollama LLM Provider
 *
 * Provides a unified interface for communicating with Ollama running in a local container.
 *
 * Reference: mastra_orchestrator_spec.md §2.3 (local development)
 * Uses: Ollama container on localhost:11434 (via docker-compose)
 */

interface OllamaConfig {
  baseURL: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
}

interface TextGenerationOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface TextGenerationResult {
  text: string;
  stopReason: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface OllamaProviderInterface {
  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>;
  healthCheck(): Promise<boolean>;
  listModels(): Promise<string[]>;
  getConfig(): OllamaConfig;
}

/**
 * Create an Ollama provider instance
 *
 * @param config Configuration for Ollama
 * @returns OllamaProvider instance
 */
export function createOllamaProvider(config: Partial<OllamaConfig> = {}): OllamaProviderInterface {
  const finalConfig: OllamaConfig = {
    baseURL: config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: config.model || process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct-q5_K_S',
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 0.9,
    topK: config.topK ?? 40,
  };

  const client = new Ollama({
    host: finalConfig.baseURL,
  });

  return {
    /**
     * Generate text using Ollama
     */
    async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
      const {
        prompt,
        maxTokens = 1024,
        temperature = finalConfig.temperature,
        systemPrompt,
      } = options;

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

      try {
        const response = await client.generate({
          model: finalConfig.model,
          prompt: fullPrompt,
          stream: false,
          raw: false,
          options: {
            temperature,
            top_p: finalConfig.topP,
            top_k: finalConfig.topK,
            num_predict: maxTokens,
          },
        });

        return {
          text: response.response.trim(),
          stopReason: 'stop',
          usage: {
            inputTokens: 0,
            outputTokens: 0,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Ollama generation failed (${finalConfig.model} @ ${finalConfig.baseURL}): ${errorMessage}`,
        );
      }
    },

    /**
     * Health check - verify Ollama is running
     */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await client.list();
        return response.models && response.models.length > 0;
      } catch {
        return false;
      }
    },

    /**
     * Get available models
     */
    async listModels(): Promise<string[]> {
      try {
        const response = await client.list();
        return response.models ? response.models.map((m) => m.name) : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to list Ollama models: ${errorMessage}`);
      }
    },

    /**
     * Get current configuration
     */
    getConfig(): OllamaConfig {
      return finalConfig;
    },
  };
}

// Export type for use in agents
export type OllamaProvider = OllamaProviderInterface;
