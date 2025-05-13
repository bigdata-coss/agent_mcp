import axios from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// LM Studio 엔드포인트 - 단일 인스턴스 사용
const LMSTUDIO_ENDPOINT = process.env.LMSTUDIO_ENDPOINT || 'http://localhost:1234/v1';
const DEFAULT_TIMEOUT = 180000; // 3분 기본 타임아웃

// 에러 메시지 포맷팅 헬퍼 함수
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

interface LMStudioCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LMStudioModelResponse {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

class LMStudioService {
  /**
   * API URL을 구성합니다
   */
  private getApiUrl(path: string): string {
    return `${LMSTUDIO_ENDPOINT}/${path}`;
  }

  /**
   * 모델 정보 표시
   */
  async showModel(args: { name: string }): Promise<string> {
    try {
      const response = await axios.get(
        this.getApiUrl(`models/${encodeURIComponent(args.name)}`)
      );
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `LM Studio API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 정보를 가져오는데 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 실행 (완성)
   */
  async runModel(args: { name: string; prompt: string; timeout?: number }): Promise<string> {
    try {
      const response = await axios.post(
        this.getApiUrl('completions'),
        {
          model: args.name,
          prompt: args.prompt,
          temperature: 0.7,
          max_tokens: 2048
        },
        {
          timeout: args.timeout || DEFAULT_TIMEOUT,
        }
      );
      
      return response.data.choices[0].text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `LM Studio API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `모델 실행에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 다운로드 (LM Studio에서는 지원하지 않으므로 메시지 반환)
   */
  async pullModel(args: { name: string }): Promise<string> {
    return JSON.stringify({
      message: "LM Studio에서는 API를 통한 모델 다운로드를 지원하지 않습니다. LM Studio 애플리케이션에서 직접 모델을 다운로드하세요."
    }, null, 2);
  }

  /**
   * 모델 목록 가져오기
   */
  async listModels(): Promise<string> {
    try {
      const response = await axios.get(this.getApiUrl('models'));
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `모델 목록을 가져오는데 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 채팅 완성 처리
   */
  async chatCompletion(args: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    timeout?: number;
  }): Promise<string> {
    try {
      const response = await axios.post<LMStudioCompletionResponse>(
        this.getApiUrl('chat/completions'),
        {
          model: args.model,
          messages: args.messages,
          temperature: args.temperature || 0.7,
          max_tokens: 2048
        },
        {
          timeout: args.timeout || DEFAULT_TIMEOUT,
        }
      );

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `LM Studio API 오류: ${error.response?.data?.error || error.message}`
        );
      }
      throw new McpError(ErrorCode.InternalError, `채팅 완성에 실패했습니다: ${formatError(error)}`);
    }
  }

  /**
   * 모델 삭제 (LM Studio에서는 지원하지 않으므로 메시지 반환)
   */
  async removeModel(args: { name: string }): Promise<string> {
    return JSON.stringify({
      message: "LM Studio에서는 API를 통한 모델 삭제를 지원하지 않습니다. LM Studio 애플리케이션에서 직접 모델을 관리하세요."
    }, null, 2);
  }

  /**
   * LM Studio 상태 확인
   */
  async getStatus(): Promise<string> {
    try {
      // 모델 목록 API를 통해 상태 확인
      const response = await axios.get(this.getApiUrl('models'));
      
      return JSON.stringify({
        status: 'online',
        models: response.data.data || []
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        status: 'offline',
        error: formatError(error)
      }, null, 2);
    }
  }
}

export default new LMStudioService(); 