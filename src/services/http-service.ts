import axios, { AxiosRequestConfig } from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// 에러 메시지 포맷팅 헬퍼 함수
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

interface HttpRequestArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, string>;
  timeout?: number;
}

class HttpService {
  /**
   * HTTP 요청을 보냅니다
   */
  async request(args: HttpRequestArgs): Promise<string> {
    try {
      const config: AxiosRequestConfig = {
        url: args.url,
        method: args.method || 'GET',
        timeout: args.timeout || 30000,
      };

      if (args.headers) {
        config.headers = args.headers;
      }

      if (args.params) {
        config.params = args.params;
      }

      if (args.data) {
        config.data = args.data;
      }

      const response = await axios(config);
      
      // 응답 데이터 처리
      let responseData = response.data;
      
      // 객체인 경우 JSON 문자열로 변환
      if (typeof responseData === 'object') {
        responseData = JSON.stringify(responseData, null, 2);
      }
      
      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new McpError(
          ErrorCode.InternalError,
          `HTTP 요청 오류 (${statusCode}): ${
            typeof responseData === 'object' 
              ? JSON.stringify(responseData, null, 2) 
              : responseData || error.message
          }`
        );
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `HTTP 요청 실패: ${formatError(error)}`
      );
    }
  }
}

export default new HttpService(); 