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

  /**
   * Imagen 모델을 사용하여 이미지를 생성합니다.
   */
  async generateImages({
    model,
    prompt,
    numberOfImages = 1,
    size = '1024x1024',
    saveDir = './temp',
    fileName = `imagen-${Date.now()}`,
  }: {
    model: string;
    prompt: string;
    numberOfImages?: number;
    size?: string;
    saveDir?: string;
    fileName?: string;
  }) {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models/${model}:generateImages`;

      const response = await axios.post(
        url,
        {
          prompt: {
            text: prompt,
          },
          sampleCount: numberOfImages,
          sampleImageSize: size,
        },
        config
      );

      // 이미지 응답 처리
      const generatedImages = response.data.images || [];
      const savedFiles = [];

      const fs = await import('fs');
      const path = await import('path');

      // 저장 디렉토리가 없으면 생성
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // 이미지 저장
      for (let i = 0; i < generatedImages.length; i++) {
        const imageData = generatedImages[i].bytesBase64;
        if (imageData) {
          const buffer = Buffer.from(imageData, 'base64');
          const filePath = path.join(saveDir, `${fileName}-${i + 1}.png`);
          fs.writeFileSync(filePath, buffer);
          savedFiles.push(filePath);
        }
      }

      return {
        model: model,
        prompt: prompt,
        images: savedFiles,
        count: savedFiles.length,
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Veo 모델을 사용하여 비디오를 생성합니다.
   */
  async generateVideos({
    model,
    prompt,
    image = null,
    numberOfVideos = 1,
    aspectRatio = '16:9',
    personGeneration = 'dont_allow',
    durationSeconds = 5,
    saveDir = './temp',
    fileName = `veo-${Date.now()}`,
  }: {
    model: string;
    prompt: string;
    image?: { imageBytes: string; mimeType: string } | null;
    numberOfVideos?: number;
    aspectRatio?: string;
    personGeneration?: string;
    durationSeconds?: number;
    saveDir?: string;
    fileName?: string;
  }) {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models/${model}:generateVideos`;

      const requestData: any = {
        prompt: {
          text: prompt,
        },
        config: {
          aspectRatio,
          numberOfVideos,
          durationSeconds,
          personGeneration,
        }
      };

      // 이미지가 제공된 경우 추가
      if (image) {
        requestData.image = image;
      }

      // 비디오 생성 요청 시작
      const response = await axios.post(url, requestData, config);
      
      // 작업 ID 가져오기
      const operationName = response.data.name;
      
      if (!operationName) {
        throw new Error('비디오 생성 작업을 시작할 수 없습니다.');
      }

      // 비동기 작업 상태 확인 및 완료 대기
      const operationUrl = `${this.baseUrl}/${operationName}`;
      let operation: { done: boolean; response: any } = { done: false, response: null };
      
      while (!operation.done) {
        // 10초 대기
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 작업 상태 확인
        const statusResponse = await axios.get(operationUrl, config);
        operation = statusResponse.data;
      }

      // 비디오 다운로드 및 저장
      const fs = await import('fs');
      const path = await import('path');
      
      // 저장 디렉토리가 없으면 생성
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      const savedFiles = [];
      const generatedVideos = operation.response?.generatedVideos || [];

      for (let i = 0; i < generatedVideos.length; i++) {
        const videoUri = generatedVideos[i]?.video?.uri;
        
        if (videoUri) {
          // API 키 추가
          const downloadUrl = `${videoUri}&key=${this.apiKey}`;
          
          // 비디오 다운로드
          const videoResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
          const filePath = path.join(saveDir, `${fileName}-${i + 1}.mp4`);
          
          fs.writeFileSync(filePath, Buffer.from(videoResponse.data));
          savedFiles.push(filePath);
        }
      }

      return {
        model: model,
        prompt: prompt,
        videos: savedFiles,
        count: savedFiles.length,
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Gemini 모델을 사용하여 멀티모달 콘텐츠(텍스트 및 이미지)를 생성합니다.
   */
  async generateMultimodalContent({
    model,
    contents,
    responseModalities = ['text', 'image'],
    temperature = 0.7,
    max_tokens = 1024,
    saveDir = './temp',
    fileName = `gemini-multimodal-${Date.now()}`,
  }: {
    model: string;
    contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    responseModalities?: string[];
    temperature?: number;
    max_tokens?: number;
    saveDir?: string;
    fileName?: string;
  }) {
    try {
      const config = this.getRequestConfig();
      const url = `${this.baseUrl}/models/${model}:generateContent`;

      // 응답 모달리티 변환
      const modalityMapping: { [key: string]: string } = {
        'text': 'TEXT',
        'image': 'IMAGE',
      };

      const responseModalitiesFormatted = responseModalities.map(
        modality => modalityMapping[modality] || modality.toUpperCase()
      );

      const response = await axios.post(
        url,
        {
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: max_tokens,
            responseModalities: responseModalitiesFormatted,
          },
        },
        config
      );

      // 파일 시스템 모듈 임포트
      const fs = await import('fs');
      const path = await import('path');

      // 저장 디렉토리가 없으면 생성
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      // 응답 처리
      const parts = response.data.candidates?.[0]?.content?.parts || [];
      const result: {
        text: string[];
        images: string[];
      } = {
        text: [],
        images: [],
      };

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        if (part.text) {
          result.text.push(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, 'base64');
          const filePath = path.join(saveDir, `${fileName}-${i + 1}.png`);
          
          fs.writeFileSync(filePath, buffer);
          result.images.push(filePath);
        }
      }

      return {
        model: model,
        text: result.text,
        images: result.images,
      };
    } catch (error) {
      throw this.formatError(error);
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const geminiService = new GeminiService();
export default geminiService; 