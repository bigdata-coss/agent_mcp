import axios from 'axios';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { Readable } from 'stream';

const pipelineAsync = promisify(pipeline);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_SAVE_DIR = process.env.OPENAI_SAVE_DIR || './output';

// 오류 메시지 포맷팅
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// OpenAI API 서비스
class OpenAIService {
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await mkdirAsync(dirPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * ChatGPT API를 사용하여 텍스트 완성을 생성합니다
   */
  async chatCompletion(args: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new McpError(
          ErrorCode.InternalError,
          'OPENAI_API_KEY가 설정되지 않았습니다.'
        );
      }

      const response = await axios.post(
        `${OPENAI_API_BASE}/chat/completions`,
        {
          model: args.model,
          messages: args.messages,
          temperature: args.temperature ?? 0.7,
          max_tokens: args.max_tokens,
          stream: args.stream ?? false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );
      
      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new McpError(
          ErrorCode.InternalError,
          `OpenAI API 오류 (${statusCode}): ${
            typeof responseData === 'object' 
              ? JSON.stringify(responseData, null, 2) 
              : responseData || error.message
          }`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `채팅 완성 요청 실패: ${formatError(error)}`);
    }
  }

  /**
   * DALL-E API를 사용하여 이미지를 생성합니다
   */
  async generateImage(args: {
    prompt: string;
    model?: string;
    n?: number;
    size?: string;
    quality?: string;
    style?: string;
    saveDir?: string;
    fileName?: string;
  }): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new McpError(
          ErrorCode.InternalError,
          'OPENAI_API_KEY가 설정되지 않았습니다.'
        );
      }

      const response = await axios.post(
        `${OPENAI_API_BASE}/images/generations`,
        {
          model: args.model || 'dall-e-3',
          prompt: args.prompt,
          n: args.n || 1,
          size: args.size || '1024x1024',
          quality: args.quality || 'standard',
          style: args.style || 'vivid',
          response_format: 'url'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      const images = response.data.data;
      const saveDir = args.saveDir || DEFAULT_SAVE_DIR;
      await this.ensureDirectoryExists(saveDir);

      // 이미지 URL을 다운로드하여 파일로 저장
      const savedFiles = [];
      for (let i = 0; i < images.length; i++) {
        const timestamp = Date.now();
        const fileName = args.fileName 
          ? `${args.fileName}_${i}.png` 
          : `dalle_${timestamp}_${i}.png`;
        const filePath = path.join(saveDir, fileName);
        
        const imageResponse = await axios.get(images[i].url, { responseType: 'arraybuffer' });
        await writeFileAsync(filePath, Buffer.from(imageResponse.data));
        
        savedFiles.push({ path: filePath, url: images[i].url });
      }

      return JSON.stringify({
        generated_images: savedFiles,
        original_response: response.data
      }, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new McpError(
          ErrorCode.InternalError,
          `OpenAI API 오류 (${statusCode}): ${
            typeof responseData === 'object' 
              ? JSON.stringify(responseData, null, 2) 
              : responseData || error.message
          }`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `이미지 생성 요청 실패: ${formatError(error)}`);
    }
  }

  /**
   * TTS API를 사용하여 텍스트를 음성으로 변환합니다
   */
  async textToSpeech(args: {
    text: string;
    model?: string;
    voice?: string;
    speed?: number;
    saveDir?: string;
    fileName?: string;
  }): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new McpError(
          ErrorCode.InternalError,
          'OPENAI_API_KEY가 설정되지 않았습니다.'
        );
      }

      const response = await axios.post(
        `${OPENAI_API_BASE}/audio/speech`,
        {
          model: args.model || 'tts-1',
          input: args.text,
          voice: args.voice || 'alloy',  // alloy, echo, fable, onyx, nova, shimmer
          speed: args.speed || 1.0,
          response_format: 'mp3'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          responseType: 'arraybuffer'
        }
      );

      // 음성 파일 저장
      const saveDir = args.saveDir || DEFAULT_SAVE_DIR;
      await this.ensureDirectoryExists(saveDir);
      
      const timestamp = Date.now();
      const fileName = args.fileName ? `${args.fileName}.mp3` : `tts_${timestamp}.mp3`;
      const filePath = path.join(saveDir, fileName);
      
      await writeFileAsync(filePath, Buffer.from(response.data));

      return JSON.stringify({
        audio_file: filePath,
        size_bytes: response.data.length,
        message: `음성 파일이 ${filePath}에 저장되었습니다.`
      }, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        let errorMessage = error.message;
        
        try {
          // 응답이 arraybuffer일 경우 처리
          if (error.response?.data instanceof ArrayBuffer) {
            const text = Buffer.from(error.response.data).toString('utf8');
            const json = JSON.parse(text);
            errorMessage = json.error?.message || errorMessage;
          }
        } catch (e) {
          // 파싱 오류는 무시
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `OpenAI API 오류 (${statusCode}): ${errorMessage}`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `음성 변환 요청 실패: ${formatError(error)}`);
    }
  }

  /**
   * Whisper API를 사용하여 음성을 텍스트로 변환합니다
   */
  async speechToText(args: {
    audioPath: string;
    model?: string;
    language?: string;
    prompt?: string;
  }): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new McpError(
          ErrorCode.InternalError, 
          'OPENAI_API_KEY가 설정되지 않았습니다.'
        );
      }

      if (!fs.existsSync(args.audioPath)) {
        throw new McpError(
          ErrorCode.InternalError,
          `오디오 파일을 찾을 수 없습니다: ${args.audioPath}`
        );
      }

      const formData = new FormData();
      const fileBlob = new Blob([fs.readFileSync(args.audioPath)]);
      formData.append('file', fileBlob, path.basename(args.audioPath));
      formData.append('model', args.model || 'whisper-1');
      
      if (args.language) {
        formData.append('language', args.language);
      }
      
      if (args.prompt) {
        formData.append('prompt', args.prompt);
      }

      const response = await axios.post(
        `${OPENAI_API_BASE}/audio/transcriptions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new McpError(
          ErrorCode.InternalError,
          `OpenAI API 오류 (${statusCode}): ${
            typeof responseData === 'object' 
              ? JSON.stringify(responseData, null, 2) 
              : responseData || error.message
          }`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `음성 인식 요청 실패: ${formatError(error)}`);
    }
  }

  /**
   * Embeddings API를 사용하여 텍스트 임베딩을 생성합니다
   */
  async generateEmbeddings(args: {
    text: string | string[];
    model?: string;
    dimensions?: number;
  }): Promise<string> {
    try {
      if (!OPENAI_API_KEY) {
        throw new McpError(
          ErrorCode.InternalError,
          'OPENAI_API_KEY가 설정되지 않았습니다.'
        );
      }

      const response = await axios.post(
        `${OPENAI_API_BASE}/embeddings`,
        {
          model: args.model || 'text-embedding-3-small',
          input: args.text,
          dimensions: args.dimensions
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );

      return JSON.stringify(response.data, null, 2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const responseData = error.response?.data;
        
        throw new McpError(
          ErrorCode.InternalError,
          `OpenAI API 오류 (${statusCode}): ${
            typeof responseData === 'object' 
              ? JSON.stringify(responseData, null, 2) 
              : responseData || error.message
          }`
        );
      }
      
      throw new McpError(ErrorCode.InternalError, `임베딩 생성 요청 실패: ${formatError(error)}`);
    }
  }
}

export default new OpenAIService(); 