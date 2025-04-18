import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

// 환경 변수에서 API 키 로드
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1';

/**
 * Google Gemini API와 상호작용하기 위한 서비스 클래스
 */
class GeminiService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = GEMINI_API_KEY, baseUrl: string = GEMINI_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * 오류를 포맷팅하는 헬퍼 메서드
   */
  private formatError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // API 응답 오류 처리
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;
        
        // 다양한 HTTP 상태 코드에 따른 오류 처리
        if (status === 400) {
          return new Error(data?.error?.message || '잘못된 요청입니다.');
        } else if (status === 401) {
          return new Error('API 키가 잘못되었거나 누락되었습니다.');
        } else if (status === 403) {
          return new Error('요청한 리소스에 대한 접근 권한이 없습니다.');
        } else if (status === 404) {
          return new Error('요청한 리소스를 찾을 수 없습니다.');
        } else if (status === 429) {
          return new Error('API 요청 한도를 초과했습니다.');
        } else if (status >= 500) {
          return new Error('Gemini API 서버 오류가 발생했습니다.');
        }
        
        // 기타 응답 오류
        return new Error(data?.error?.message || `Gemini API 오류: ${status}`);
      }
      
      // 요청 오류 처리 (네트워크 문제 등)
      if (axiosError.request && !axiosError.response) {
        return new Error('네트워크 오류: Gemini API에 연결할 수 없습니다.');
      }
    }
    
    // 기타 오류 처리
    return new Error(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
  }

  /**
   * API 요청 기본 설정을 준비하는 헬퍼 메서드
   */
  private getRequestConfig(): AxiosRequestConfig {
    if (!this.apiKey) {
      throw new Error('Gemini API 키가 설정되어 있지 않습니다.');
    }

    return {
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        key: this.apiKey,
      },
    };
  }

  /**
   * Gemini 모델을 사용하여 텍스트를 생성합니다.
   */
  async generateText({
    model,
    prompt,
    temperature = 0.7,
    max_tokens = 1024,
    topK = 40,
    topP = 0.95,
  }: {
    model: string;
    prompt: string;
    temperature?: number;
    max_tokens?: number;
    topK?: number;
    topP?: number;
  }) {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models/${model}:generateContent`;

      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: max_tokens,
            topK,
            topP,
          },
        },
        config
      );

      // 응답에서 생성된 텍스트 추출
      const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        text: generatedText,
        model: model,
        usage: {
          completion_tokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          prompt_tokens: response.data.usageMetadata?.promptTokenCount || 0,
          total_tokens: 
            (response.data.usageMetadata?.promptTokenCount || 0) + 
            (response.data.usageMetadata?.candidatesTokenCount || 0),
        },
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Gemini 모델을 사용하여 채팅 대화를 완성합니다.
   */
  async chatCompletion({
    model,
    messages,
    temperature = 0.7,
    max_tokens = 1024,
    topK = 40,
    topP = 0.95,
  }: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    topK?: number;
    topP?: number;
  }) {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models/${model}:generateContent`;

      // OpenAI 형식의 메시지를 Gemini 형식으로 변환
      const geminiContents = [];
      let currentRole = null;
      let currentParts: any[] = [];

      for (const message of messages) {
        // 'system' 메시지는 'user' 역할로 변환하되 prefix를 추가
        if (message.role === 'system') {
          geminiContents.push({
            role: 'user',
            parts: [{ text: `[system] ${message.content}` }],
          });
          continue;
        }

        // 역할이 변경되면 새 항목 시작
        if (message.role !== currentRole && currentParts.length > 0) {
          geminiContents.push({
            role: currentRole === 'assistant' ? 'model' : 'user',
            parts: currentParts,
          });
          currentParts = [];
        }

        currentRole = message.role;
        currentParts.push({ text: message.content });
      }

      // 마지막 메시지 추가
      if (currentParts.length > 0) {
        geminiContents.push({
          role: currentRole === 'assistant' ? 'model' : 'user',
          parts: currentParts,
        });
      }

      const response = await axios.post(
        url,
        {
          contents: geminiContents,
          generationConfig: {
            temperature,
            maxOutputTokens: max_tokens,
            topK,
            topP,
          },
        },
        config
      );

      // 응답에서 생성된 텍스트 추출
      const generatedContent = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return {
        message: {
          role: 'assistant',
          content: generatedContent,
        },
        model: model,
        usage: {
          completion_tokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          prompt_tokens: response.data.usageMetadata?.promptTokenCount || 0,
          total_tokens: 
            (response.data.usageMetadata?.promptTokenCount || 0) + 
            (response.data.usageMetadata?.candidatesTokenCount || 0),
        },
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 사용 가능한 Gemini 모델 목록을 조회합니다.
   */
  async listModels() {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models`;

      const response = await axios.get(url, config);

      // Gemini 모델만 필터링 (ID에 'gemini'가 포함된 모델)
      const geminiModels = response.data.models?.filter(
        (model: any) => model.name && model.name.includes('gemini')
      ) || [];

      // 필요한 정보만 매핑
      return geminiModels.map((model: any) => ({
        id: model.name.split('/').pop(),
        name: model.displayName || model.name,
        description: model.description || '',
        created: model.createTime || '',
        updated: model.updateTime || '',
        supports: {
          chat: model.supportedGenerationMethods?.includes('generateContent') || false,
          completion: model.supportedGenerationMethods?.includes('generateContent') || false,
          embeddings: model.supportedGenerationMethods?.includes('embedContent') || false,
        },
      }));
    } catch (error) {
      throw this.formatError(error);
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const geminiService = new GeminiService();
export default geminiService; 