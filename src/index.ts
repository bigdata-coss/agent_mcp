#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools/index.js";
import { ToolResponse } from "./types/index.js";

// MCP 서버 초기화
const server = new Server(
  {
    name: "ontology-ollama-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        mcp_sparql_execute_query: true,
        mcp_sparql_update: true,
        mcp_sparql_list_repositories: true,
        mcp_sparql_list_graphs: true,
        mcp_sparql_get_resource_info: true,
        mcp_ollama_run: true,
        mcp_ollama_show: true,
        mcp_ollama_pull: true,
        mcp_ollama_list: true,
        mcp_ollama_rm: true,
        mcp_ollama_chat_completion: true,
        mcp_ollama_status: true,
        mcp_http_request: true,
        mcp_openai_chat: true,
        mcp_openai_image: true,
        mcp_openai_tts: true,
        mcp_openai_transcribe: true,
        mcp_openai_embedding: true,
        mcp_gemini_generate_text: true,
        mcp_gemini_chat_completion: true,
        mcp_gemini_list_models: true,
        mcp_gemini_generate_images: false,
        mcp_gemini_generate_image: false,
        mcp_gemini_generate_videos: false,
        mcp_gemini_generate_multimodal_content: false,
        mcp_imagen_generate: false,
        mcp_gemini_create_image: false,
        mcp_gemini_edit_image: false
      },
    },
  }
);

/**
 * 사용 가능한 도구를 나열하는 핸들러
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }))
}));

/**
 * 도구 호출을 처리하는 핸들러
 */
server.setRequestHandler(CallToolRequestSchema, async (request: any, _extra: any) => {
  try {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      return {
        content: [{
          type: "text" as const,
          text: `알 수 없는 도구: ${request.params.name}`
        }]
      } as ToolResponse;
    }

    // 도구가 인수를 필요로 하는 경우에만 인수 유효성 검사
    if (tool.inputSchema.required && tool.inputSchema.required.length > 0) {
      const args = request.params.arguments || {};
      const missingArgs = tool.inputSchema.required.filter(
        arg => !(arg in args)
      );
      if (missingArgs.length > 0) {
        return {
          content: [{
            type: "text" as const,
            text: `필수 인수가 누락되었습니다: ${missingArgs.join(', ')}`
          }]
        } as ToolResponse;
      }
    }

    // 도구 실행 - 타입 어설션 사용
    const response = await tool.handler(request.params.arguments || {} as any);

    // 메타데이터가 제공된 경우 추가
    if (request.params._meta) {
      return {
        ...response,
        _meta: request.params._meta
      };
    }

    return response;

  } catch (error) {
    console.error('도구 실행 오류:', error);
    return {
      content: [{
        type: "text" as const,
        text: error instanceof Error ? error.message : '예기치 않은 오류가 발생했습니다'
      }]
    } as ToolResponse;
  }
}) as any; // MCP SDK 호환성을 위한 타입 단언

/**
 * 서버 시작
 */
async function main() {
  // 환경 변수 검증
  if (!process.env.SPARQL_ENDPOINT) {
    console.warn('SPARQL_ENDPOINT 환경 변수가 설정되지 않았습니다. 기본값(http://localhost:7200)이 사용됩니다.');
  }

  // Ollama 환경 변수 로그
  console.error('Ollama 설정:');
  console.error(`- 엔드포인트: ${process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'}`);
  
  // OpenAI API 설정 확인
  if (process.env.OPENAI_API_KEY) {
    console.error('OpenAI API 키가 설정되었습니다.');
    
    // 출력 디렉터리 확인
    const outputDir = process.env.OPENAI_SAVE_DIR || './output';
    console.error(`- 출력 디렉터리: ${outputDir}`);
  } else {
    console.warn('주의: OPENAI_API_KEY가 설정되지 않았습니다. OpenAI 기능을 사용할 수 없습니다.');
  }
  
  // Gemini API 설정 확인
  if (process.env.GEMINI_API_KEY) {
    console.error('Gemini API 키가 설정되었습니다.');
    console.error(`- 기본 엔드포인트: ${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1'}`);
  } else {
    console.warn('주의: GEMINI_API_KEY가 설정되지 않았습니다. Gemini 기능을 사용할 수 없습니다.');
  }
  
  // 현재 설치된 모델 목록 확인 시도
  try {
    const { exec } = require('child_process');
    exec('ollama list', (error: any, stdout: string, stderr: string) => {
      if (!error && stdout) {
        console.error('설치된 Ollama 모델:');
        console.error(stdout);
      }
    });
  } catch (e) {
    // 무시 - 단순 정보 표시 용도
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ontology & Ollama & OpenAI & Gemini MCP 서버가 stdio에서 실행 중입니다');
}

main().catch((error) => {
  console.error("서버 오류:", error);
  process.exit(1);
});
