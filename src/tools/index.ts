import { SparqlService } from '../services/sparql-service.js';
import ollamaService from '../services/ollama-service.js';
import httpService from '../services/http-service.js';
import openaiService from '../services/openai-service.js';
import geminiService from '../services/gemini-service.js';
import { 
  ExecuteQueryArgs, 
  ListRepositoriesArgs, 
  ListGraphsArgs, 
  GetResourceInfoArgs,
  UpdateQueryArgs,
  ToolResponse
} from '../types/index.js';

// 서비스 초기화
const sparqlService = new SparqlService();

// 도구 정의
export const tools = [
  {
    name: 'mcp_sparql_execute_query',
    description: 'SPARQL 쿼리를 실행하고 결과를 반환합니다',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '실행할 SPARQL 쿼리'
        },
        repository: {
          type: 'string',
          description: '쿼리를 실행할 리포지토리 이름'
        },
        endpoint: {
          type: 'string',
          description: 'SPARQL 엔드포인트 URL'
        },
        format: {
          type: 'string',
          enum: ['json', 'xml', 'csv', 'tsv'],
          description: '결과 형식(json, xml, csv, tsv)'
        },
        explain: {
          type: 'boolean',
          description: '쿼리 실행 계획 반환 여부'
        }
      },
      required: ['query']
    },
    async handler(args: ExecuteQueryArgs): Promise<ToolResponse> {
      try {
        const result = await sparqlService.executeQuery(args.query, args.repository, args.format);
        
        // 결과를 서식화하여 반환
        return {
          content: [{
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : result.toString()
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `쿼리 실행 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_sparql_update',
    description: 'SPARQL 업데이트 쿼리를 실행하여 데이터를 수정합니다. INSERT DATA, DELETE DATA, INSERT-WHERE, DELETE-WHERE 등의 SPARQL 1.1 Update 문법을 지원합니다. 새로운 트리플 추가, 기존 트리플 삭제, 조건부 데이터 변경 등 다양한 그래프 수정 작업을 수행할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '실행할 SPARQL 업데이트 쿼리 (예: INSERT DATA { <subject> <predicate> <object> })'
        },
        repository: {
          type: 'string',
          description: '업데이트 쿼리를 실행할 리포지토리 이름'
        },
        endpoint: {
          type: 'string',
          description: 'SPARQL 엔드포인트 URL'
        }
      },
      required: ['query']
    },
    async handler(args: UpdateQueryArgs): Promise<ToolResponse> {
      try {
        if (args.endpoint) {
          const service = new SparqlService({
            endpoint: args.endpoint,
            defaultRepository: args.repository || ''
          });
          const result = await service.updateQuery(args.query, args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } else {
          const result = await sparqlService.updateQuery(args.query, args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `업데이트 쿼리 실행 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_sparql_list_repositories',
    description: 'GraphDB 서버의 모든 리포지토리를 나열합니다',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'SPARQL 엔드포인트 URL'
        }
      },
      required: []
    },
    async handler(args: ListRepositoriesArgs): Promise<ToolResponse> {
      try {
        if (args.endpoint) {
          const service = new SparqlService({ endpoint: args.endpoint });
          const repositories = await service.listRepositories();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(repositories, null, 2)
            }]
          };
        } else {
          const repositories = await sparqlService.listRepositories();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(repositories, null, 2)
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `리포지토리 목록 조회 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_sparql_list_graphs',
    description: '지정된 리포지토리의 모든 명명된 그래프를 나열합니다',
    inputSchema: {
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          description: '그래프를 조회할 리포지토리 이름'
        },
        endpoint: {
          type: 'string',
          description: 'SPARQL 엔드포인트 URL'
        }
      },
      required: []
    },
    async handler(args: ListGraphsArgs): Promise<ToolResponse> {
      try {
        if (args.endpoint) {
          const service = new SparqlService({
            endpoint: args.endpoint,
            defaultRepository: args.repository || ''
          });
          const graphs = await service.listGraphs(args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(graphs, null, 2)
            }]
          };
        } else {
          const graphs = await sparqlService.listGraphs(args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(graphs, null, 2)
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `그래프 목록 조회 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_sparql_get_resource_info',
    description: '지정된 URI에 대한 모든 속성과 값을 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: '조회할 리소스의 URI'
        },
        repository: {
          type: 'string',
          description: '조회할 리포지토리 이름'
        },
        endpoint: {
          type: 'string',
          description: 'SPARQL 엔드포인트 URL'
        }
      },
      required: ['uri']
    },
    async handler(args: GetResourceInfoArgs): Promise<ToolResponse> {
      try {
        if (args.endpoint) {
          const service = new SparqlService({
            endpoint: args.endpoint,
            defaultRepository: args.repository || ''
          });
          const resourceInfo = await service.getResourceInfo(args.uri, args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(resourceInfo, null, 2)
            }]
          };
        } else {
          const resourceInfo = await sparqlService.getResourceInfo(args.uri, args.repository);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(resourceInfo, null, 2)
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `리소스 정보 조회 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_ollama_run',
    description: 'Ollama 모델을 실행하여 응답을 생성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '실행할 모델 이름'
        },
        prompt: {
          type: 'string',
          description: '모델에 전송할 프롬프트'
        },
        timeout: {
          type: 'number',
          description: '타임아웃(밀리초 단위, 기본값: 60000)',
          minimum: 1000
        }
      },
      required: ['name', 'prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.runModel(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_show',
    description: 'Ollama 모델의 정보를 표시합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '정보를 조회할 모델 이름'
        }
      },
      required: ['name']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.showModel(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_pull',
    description: 'Ollama 레지스트리에서 모델을 다운로드합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '다운로드할 모델 이름'
        }
      },
      required: ['name']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.pullModel(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_list',
    description: '사용 가능한 Ollama 모델 목록을 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.listModels();
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_rm',
    description: 'Ollama 모델을 삭제합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '삭제할 모델 이름'
        }
      },
      required: ['name']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.removeModel(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_chat_completion',
    description: 'OpenAI 호환 채팅 완성 API를 사용하여 응답을 생성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 Ollama 모델 이름'
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['system', 'user', 'assistant']
              },
              content: {
                type: 'string'
              }
            },
            required: ['role', 'content']
          },
          description: '대화 메시지 배열'
        },
        temperature: {
          type: 'number',
          description: '샘플링 온도(0-2)',
          minimum: 0,
          maximum: 2
        },
        timeout: {
          type: 'number',
          description: '타임아웃(밀리초 단위, 기본값: 60000)',
          minimum: 1000
        }
      },
      required: ['model', 'messages']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await ollamaService.chatCompletion(args);
      return {
        content: [
          {
            type: 'text' as const,
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_ollama_status',
    description: 'Ollama 서버 상태 확인',
    inputSchema: {
      type: 'object',
      properties: {
        random_string: {
          type: 'string',
          description: 'Dummy parameter for no-parameter tools'
        }
      },
      required: ['random_string']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await ollamaService.getStatus();
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Status 확인 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_http_request',
    description: 'HTTP 요청을 보내고 응답을 반환합니다. GET, POST, PUT, DELETE 등 다양한 HTTP 메소드를 사용할 수 있으며, 헤더와 데이터를 설정할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '요청할 URL'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'HTTP 메소드 (기본값: GET)'
        },
        headers: {
          type: 'object',
          description: '요청 헤더 (예: {"Content-Type": "application/json", "Authorization": "Bearer token"})'
        },
        data: {
          type: 'object',
          description: '요청 바디 데이터'
        },
        params: {
          type: 'object',
          description: 'URL 파라미터 (예: ?key=value)'
        },
        timeout: {
          type: 'number',
          description: '타임아웃(밀리초 단위, 기본값: 30000)'
        }
      },
      required: ['url']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await httpService.request(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `HTTP 요청 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_openai_chat',
    description: 'OpenAI ChatGPT API를 사용하여 텍스트 완성을 생성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 (예: gpt-4, gpt-3.5-turbo)'
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['system', 'user', 'assistant']
              },
              content: {
                type: 'string'
              }
            },
            required: ['role', 'content']
          },
          description: '대화 메시지 배열'
        },
        temperature: {
          type: 'number',
          description: '샘플링 온도(0-2)',
          minimum: 0,
          maximum: 2
        },
        max_tokens: {
          type: 'number',
          description: '생성할 최대 토큰 수'
        }
      },
      required: ['model', 'messages']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await openaiService.chatCompletion(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `OpenAI 채팅 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_openai_image',
    description: 'OpenAI DALL-E API를 사용하여 이미지를 생성합니다. 생성된 이미지 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '이미지를 생성할 프롬프트'
        },
        model: {
          type: 'string',
          description: '사용할 모델 (예: dall-e-3, dall-e-2)'
        },
        n: {
          type: 'number',
          description: '생성할 이미지 수',
          minimum: 1,
          maximum: 10
        },
        size: {
          type: 'string',
          description: '이미지 크기',
          enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']
        },
        quality: {
          type: 'string',
          description: '이미지 품질 (dall-e-3만 해당)',
          enum: ['standard', 'hd']
        },
        style: {
          type: 'string',
          description: '이미지 스타일 (dall-e-3만 해당)',
          enum: ['vivid', 'natural']
        },
        saveDir: {
          type: 'string',
          description: '이미지를 저장할 디렉토리'
        },
        fileName: {
          type: 'string',
          description: '저장할 파일 이름 (확장자 제외)'
        }
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await openaiService.generateImage(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `OpenAI 이미지 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_openai_tts',
    description: 'OpenAI TTS API를 사용하여 텍스트를 음성으로 변환합니다. 생성된 오디오 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '음성으로 변환할 텍스트'
        },
        model: {
          type: 'string',
          description: '사용할 모델 (예: tts-1, tts-1-hd)'
        },
        voice: {
          type: 'string',
          description: '음성 종류',
          enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        },
        speed: {
          type: 'number',
          description: '음성 속도(0.25-4.0)',
          minimum: 0.25,
          maximum: 4.0
        },
        saveDir: {
          type: 'string',
          description: '음성 파일을 저장할 디렉토리'
        },
        fileName: {
          type: 'string',
          description: '저장할 파일 이름 (확장자 제외)'
        }
      },
      required: ['text']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await openaiService.textToSpeech(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `OpenAI TTS 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_openai_transcribe',
    description: 'OpenAI Whisper API를 사용하여 음성을 텍스트로 변환합니다. 변환된 텍스트를 반환합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        audioPath: {
          type: 'string',
          description: '변환할 오디오 파일 경로'
        },
        model: {
          type: 'string',
          description: '사용할 모델 (예: whisper-1)'
        },
        language: {
          type: 'string',
          description: '오디오 언어 (예: ko, en, ja)'
        },
        prompt: {
          type: 'string',
          description: '인식을 도울 힌트 텍스트'
        }
      },
      required: ['audioPath']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await openaiService.speechToText(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `OpenAI Whisper 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_openai_embedding',
    description: 'OpenAI Embeddings API를 사용하여 텍스트 임베딩을 생성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: ['string', 'array'],
          description: '임베딩을 생성할 텍스트 또는 텍스트 배열'
        },
        model: {
          type: 'string',
          description: '사용할 모델 (예: text-embedding-3-small, text-embedding-3-large)'
        },
        dimensions: {
          type: 'number',
          description: '임베딩 차원 수 (API가 지원하는 경우)'
        }
      },
      required: ['text']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await openaiService.generateEmbeddings(args);
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `OpenAI 임베딩 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_generate_text',
    description: 'Gemini AI 모델을 사용하여 텍스트를 생성합니다.',
    inputSchema: {
      type: 'object',
      required: ['model', 'prompt'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-pro, gemini-1.5-pro 등)',
        },
        prompt: {
          type: 'string',
          description: '텍스트 생성을 위한 프롬프트',
        },
        temperature: {
          type: 'number',
          description: '생성 랜덤성 정도 (0.0 - 2.0)',
          default: 0.7,
        },
        max_tokens: {
          type: 'number',
          description: '생성할 최대 토큰 수',
          default: 1024,
        },
        topK: {
          type: 'number',
          description: '각 위치에서 고려할 최상위 토큰 수',
          default: 40,
        },
        topP: {
          type: 'number',
          description: '확률 질량의 상위 비율을 선택하는 임계값',
          default: 0.95,
        },
      },
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.generateText(args);
        return {
          content: [{
            type: 'text',
            text: result.text
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 텍스트 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_chat_completion',
    description: 'Gemini AI 모델을 사용하여 채팅 대화를 완성합니다.',
    inputSchema: {
      type: 'object',
      required: ['model', 'messages'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-pro, gemini-1.5-pro 등)',
        },
        messages: {
          type: 'array',
          description: '대화 메시지 목록',
          items: {
            type: 'object',
            required: ['role', 'content'],
            properties: {
              role: {
                type: 'string',
                description: '메시지 작성자 역할 (system, user, assistant)',
                enum: ['system', 'user', 'assistant'],
              },
              content: {
                type: 'string',
                description: '메시지 내용',
              },
            },
          },
        },
        temperature: {
          type: 'number',
          description: '생성 랜덤성 정도 (0.0 - 2.0)',
          default: 0.7,
        },
        max_tokens: {
          type: 'number',
          description: '생성할 최대 토큰 수',
          default: 1024,
        },
        topK: {
          type: 'number',
          description: '각 위치에서 고려할 최상위 토큰 수',
          default: 40,
        },
        topP: {
          type: 'number',
          description: '확률 질량의 상위 비율을 선택하는 임계값',
          default: 0.95,
        },
      },
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.chatCompletion(args);
        return {
          content: [{
            type: 'text',
            text: result.message.content
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 채팅 완성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_list_models',
    description: '사용 가능한 Gemini 모델 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    async handler(): Promise<ToolResponse> {
      try {
        const models = await geminiService.listModels();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(models, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 모델 목록 조회 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_generate_images',
    description: 'Google Imagen 모델을 사용하여 이미지를 생성합니다. 생성된 이미지 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 ID (예: imagen-3.0-generate-002)',
          default: 'imagen-3.0-generate-002',
        },
        prompt: {
          type: 'string',
          description: '이미지 생성을 위한 텍스트 프롬프트',
        },
        numberOfImages: {
          type: 'number',
          description: '생성할 이미지 수 (1-4)',
          default: 1,
          minimum: 1,
          maximum: 4,
        },
        size: {
          type: 'string',
          description: '생성할 이미지 크기',
          default: '1024x1024',
        },
        saveDir: {
          type: 'string',
          description: '이미지를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 이미지 파일 이름 (확장자 제외)',
          default: `imagen-${Date.now()}`,
        },
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.generateImages(args);
        return {
          content: [{
            type: 'text',
            text: `이미지가 성공적으로 생성되었습니다. 생성된 이미지 파일: ${JSON.stringify(result.images)}\n총 ${result.count}개의 이미지가 생성되었습니다.`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 이미지 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_generate_videos',
    description: 'Google Veo 모델을 사용하여 비디오를 생성합니다. 생성된 비디오 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 ID (예: veo-2.0-generate-001)',
          default: 'veo-2.0-generate-001',
        },
        prompt: {
          type: 'string',
          description: '비디오 생성을 위한 텍스트 프롬프트',
        },
        image: {
          type: 'object',
          description: '비디오의 첫 프레임으로 사용할 이미지 (선택 사항)',
          properties: {
            imageBytes: {
              type: 'string',
              description: 'Base64로 인코딩된 이미지 데이터',
            },
            mimeType: {
              type: 'string',
              description: '이미지 MIME 타입 (예: image/png)',
            },
          },
        },
        numberOfVideos: {
          type: 'number',
          description: '생성할 비디오 수 (1-2)',
          default: 1,
          minimum: 1,
          maximum: 2,
        },
        aspectRatio: {
          type: 'string',
          description: '비디오의 가로세로 비율',
          default: '16:9',
          enum: ['16:9', '9:16'],
        },
        personGeneration: {
          type: 'string',
          description: '사람 생성 허용 설정',
          default: 'dont_allow',
          enum: ['dont_allow', 'allow_adult'],
        },
        durationSeconds: {
          type: 'number',
          description: '비디오 길이(초)',
          default: 5,
          minimum: 5,
          maximum: 8,
        },
        saveDir: {
          type: 'string',
          description: '비디오를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 비디오 파일 이름 (확장자 제외)',
          default: `veo-${Date.now()}`,
        },
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.generateVideos(args);
        return {
          content: [{
            type: 'text',
            text: `비디오가 성공적으로 생성되었습니다. 생성된 비디오 파일: ${JSON.stringify(result.videos)}\n총 ${result.count}개의 비디오가 생성되었습니다.`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 비디오 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_generate_multimodal_content',
    description: 'Gemini 모델을 사용하여 텍스트와 이미지를 포함한 멀티모달 콘텐츠를 생성합니다. 생성된 텍스트와 이미지 파일 경로를 반환하며, 이 정보는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-2.0-flash-exp-image-generation)',
          default: 'gemini-2.0-flash',
        },
        contents: {
          type: 'array',
          description: '입력 콘텐츠 (텍스트나 이미지)',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: '텍스트 콘텐츠',
              },
              inlineData: {
                type: 'object',
                description: '인라인 이미지 데이터',
                properties: {
                  mimeType: {
                    type: 'string',
                    description: '이미지 MIME 타입 (예: image/png)',
                  },
                  data: {
                    type: 'string',
                    description: 'Base64로 인코딩된 이미지 데이터',
                  },
                },
              },
            },
          },
        },
        responseModalities: {
          type: 'array',
          description: '응답에 포함할 모달리티 (텍스트, 이미지)',
          default: ['text', 'image'],
          items: {
            type: 'string',
            enum: ['text', 'image'],
          },
        },
        temperature: {
          type: 'number',
          description: '생성 랜덤성 정도 (0.0 - 2.0)',
          default: 0.7,
        },
        max_tokens: {
          type: 'number',
          description: '생성할 최대 토큰 수',
          default: 1024,
        },
        saveDir: {
          type: 'string',
          description: '생성된 이미지를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 이미지 파일 이름 (확장자 제외)',
          default: `gemini-multimodal-${Date.now()}`,
        },
      },
      required: ['contents']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.generateMultimodalContent(args);
        let responseText = "";
        
        if (result.text && result.text.length > 0) {
          responseText += `생성된 텍스트:\n${result.text.join('\n\n')}\n\n`;
        }
        
        if (result.images && result.images.length > 0) {
          responseText += `생성된 이미지 파일: ${JSON.stringify(result.images)}\n총 ${result.images.length}개의 이미지가 생성되었습니다.`;
        }
        
        return {
          content: [{
            type: 'text',
            text: responseText
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 멀티모달 콘텐츠 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  }
];
