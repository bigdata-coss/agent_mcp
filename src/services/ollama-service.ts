import axios from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 로컬 Ollama 엔드포인트 - 단일 인스턴스 사용
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const DEFAULT_TIMEOUT = 180000; // 3분 기본 타임아웃

// 에러 메시지 포맷팅 헬퍼 함수
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

class OllamaService {
  /**
   * API URL을 구성합니다
   */
  private getApiUrl(path: string): string {
    return `${OLLAMA_ENDPOINT}/api/${path}`;
  }

  /**
   * 모델 정보 표시
   */
  async showModel(args: { name: string }): Promise<string> {
    try {
      const response = await axios.get(
        this.getApiUrl(`show?name=${encodeURIComponent(args.name)}`)
      );
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 정보를 가져오는데 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 실행
   */
  async runModel(args: { name: string; prompt: string; timeout?: number }): Promise<string> {
    try {
      const response = await axios.post<OllamaGenerateResponse>(
        this.getApiUrl('generate'),
        {
          model: args.name,
          prompt: args.prompt,
          stream: false,
        },
        {
          timeout: args.timeout || DEFAULT_TIMEOUT,
        }
      );
      return response.data.response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 실행에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 다운로드
   */
  async pullModel(args: { name: string }): Promise<string> {
    try {
      const response = await axios.post(
        this.getApiUrl('pull'),
        {
          name: args.name,
        },
        {
          responseType: 'stream',
        }
      );

      // 다운로드 진행 상황을 텍스트로 수집
      let result = '';
      for await (const chunk of response.data) {
        result += chunk.toString();
      }
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 다운로드에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 목록 가져오기
   */
  async listModels(): Promise<string> {
    try {
      const response = await axios.get(this.getApiUrl('tags'));
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `모델 목록을 가져오는데 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 채팅 완성 처리 (OpenAI 호환)
   */
  async chatCompletion(args: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    timeout?: number;
  }): Promise<string> {
    try {
      // 최신 Ollama API는 채팅 메시지 형식을 직접 지원
      const response = await axios.post<OllamaChatResponse>(
        this.getApiUrl('chat'),
        {
          model: args.model,
          messages: args.messages,
          stream: false,
          temperature: args.temperature,
        },
        {
          timeout: args.timeout || DEFAULT_TIMEOUT,
        }
      );

      // OpenAI 호환 형식으로 응답 포맷팅
      return JSON.stringify({
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: args.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.data.message.content,
            },
            finish_reason: 'stop',
          },
        ],
      }, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `채팅 완성에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 삭제
   */
  async removeModel(args: { name: string }): Promise<string> {
    try {
      const response = await axios.delete(
        this.getApiUrl('delete'),
        {
          data: { name: args.name }
        }
      );
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `Ollama API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 삭제에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * Ollama 상태 확인
   */
  async getStatus(): Promise<string> {
    try {
      // 로컬 Ollama 목록 커맨드 실행
      const { stdout, stderr } = await execAsync('ollama list');
      if (stderr) {
        throw new Error(stderr);
      }
      
      // 설치된 모델 가져오기
      const response = await axios.get(this.getApiUrl('tags'));
      
      return JSON.stringify({
        status: 'online',
        localModels: stdout.trim(),
        apiModels: response.data
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        status: 'offline',
        error: formatError(error)
      }, null, 2);
    }
  }
}

export default new OllamaService(); 