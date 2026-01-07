/**
 * Serviço de integração com Groq API
 * Usa o token GROQ_API_KEY do arquivo .env
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: GroqMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GroqService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.baseUrl = GROQ_API_URL;

    if (!this.apiKey) {
      console.warn("⚠️  GROQ_API_KEY not set. Groq features will not work.");
    }
  }

  /**
   * Envia uma mensagem para o Groq e retorna a resposta
   */
  async chat(
    messages: GroqMessage[],
    model: string = "openai/gpt-oss-120b"
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY not set");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${error}`);
      }

      const data: GroqResponse = await response.json();
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Groq API error:", error);
      throw error;
    }
  }

  /**
   * Gera uma resposta simples para uma pergunta
   */
  async ask(question: string, systemPrompt?: string, model?: string): Promise<string> {
    const messages: GroqMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: question });

    return await this.chat(messages, model);
  }

  /**
   * Lista os modelos disponíveis
   */
  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY not set");
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error("Groq API error:", error);
      throw error;
    }
  }
}

export const groqService = new GroqService();
