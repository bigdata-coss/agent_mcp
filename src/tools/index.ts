import { SparqlService } from '../services/sparql-service.js';
import lmstudioService from '../services/lmstudio-service.js';
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
    name: 'mcp_lmstudio_run',
    description: 'LM Studio 모델을 실행하여 응답을 생성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '사용할 LM Studio 모델 이름'
        },
        prompt: {
          type: 'string',
          description: '모델에 전달할 프롬프트'
        },
        timeout: {
          type: 'number',
          description: '타임아웃 (밀리초)'
        }
      },
      required: ['name', 'prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await lmstudioService.runModel(args);
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_show',
    description: 'LM Studio 모델의 정보를 표시합니다',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '정보를 표시할 LM Studio 모델 이름'
        }
      },
      required: ['name']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await lmstudioService.showModel(args);
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_pull',
    description: 'LM Studio 애플리케이션에서 모델을 관리하는 방법을 안내합니다',
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
      const result = await lmstudioService.pullModel(args);
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_list',
    description: '사용 가능한 LM Studio 모델 목록을 조회합니다',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await lmstudioService.listModels();
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_rm',
    description: 'LM Studio 애플리케이션에서 모델을 관리하는 방법을 안내합니다',
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
      const result = await lmstudioService.removeModel(args);
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_chat_completion',
    description: 'LM Studio 모델을 사용하여 채팅 대화를 완성합니다',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 LM Studio 모델 이름'
        },
        messages: {
          type: 'array',
          description: '대화 메시지 목록',
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
            }
          }
        },
        temperature: {
          type: 'number',
          description: '생성 랜덤성 정도 (0.0 - 1.0)'
        },
        timeout: {
          type: 'number',
          description: '타임아웃 (밀리초)'
        }
      },
      required: ['model', 'messages']
    },
    async handler(args: any): Promise<ToolResponse> {
      const result = await lmstudioService.chatCompletion(args);
      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  },
  {
    name: 'mcp_lmstudio_status',
    description: 'LM Studio 서버 상태 확인',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await lmstudioService.getStatus();
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
            text: JSON.stringify({
              status: 'offline',
              error: String(error)
            }, null, 2)
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
    description: 'Google Imagen 모델을 사용하여 이미지를 생성합니다. 곧 mcp_gemini_generate_image 도구로 대체될 예정입니다.',
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
        // 기존 호환성을 위해 generateImage 함수 호출
        const result = await geminiService.generateImage(args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
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
    name: 'mcp_gemini_generate_image',
    description: 'Google Gemini 또는 Imagen 모델을 사용하여 이미지를 생성합니다. 모델 이름에 따라 적절한 API가 자동으로 선택됩니다. 생성된 이미지 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 ID (예: imagen-3.0-generate-002, gemini-2.0-flash-exp-image-generation)',
          default: 'imagen-3.0-generate-002',
        },
        prompt: {
          type: 'string',
          description: '이미지 생성을 위한 텍스트 프롬프트',
        },
        numberOfImages: {
          type: 'number',
          description: '생성할 이미지 수 (1-4, Imagen 모델 전용)',
          default: 1,
          minimum: 1,
          maximum: 4,
        },
        aspectRatio: {
          type: 'string',
          description: '이미지 가로세로 비율 (Imagen 모델 전용)',
          default: '1:1',
          enum: ['1:1', '3:4', '4:3', '9:16', '16:9']
        },
        personGeneration: {
          type: 'string',
          description: '사람 이미지 생성 허용 여부 (Imagen 모델 전용)',
          default: 'ALLOW_ADULT',
          enum: ['DONT_ALLOW', 'ALLOW_ADULT']
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
        },
        imageData: {
          type: 'string',
          description: '이미지 편집 시 사용할 Base64로 인코딩된 이미지 데이터 (Gemini 모델 전용)',
        },
        imageMimeType: {
          type: 'string',
          description: '이미지 MIME 타입 (Gemini 모델 전용)',
          default: 'image/png',
        },
        responseModalities: {
          type: 'array',
          description: '응답에 포함할 모달리티 (Gemini 모델 전용)',
          default: ["TEXT", "IMAGE"],
          items: {
            type: 'string',
            enum: ["TEXT", "IMAGE"]
          }
        }
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const result = await geminiService.generateImage(args);
        
        // HTML 형식으로 결과 반환
        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Gemini 이미지 생성 결과</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .image-container { margin-top: 20px; }
    .image-item { margin-bottom: 20px; }
    img { max-width: 100%; border: 1px solid #ddd; }
    pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Gemini 이미지 생성 결과</h1>
    <p><strong>모델:</strong> ${result.model}</p>
    <p><strong>프롬프트:</strong> ${result.prompt}</p>
    
    <div class="image-container">`;
        
        if (result.images && result.images.length > 0) {
          result.images.forEach((imgPath: string, index: number) => {
            // 파일 경로에서 파일 이름만 추출
            const fileName = imgPath.split(/[\/\\]/).pop();
            htmlContent += `
      <div class="image-item">
        <h3>이미지 ${index + 1}</h3>
        <img src="${imgPath}" alt="생성된 이미지 ${index + 1}">
        <p>파일 경로: ${imgPath}</p>
      </div>`;
          });
        } else {
          htmlContent += `
      <p>생성된 이미지가 없습니다.</p>`;
        }
        
        if (result.text && result.text.length > 0) {
          htmlContent += `
    <div class="text-container">
      <h2>생성된 텍스트</h2>`;
          
          result.text.forEach((text: string, index: number) => {
            htmlContent += `
      <div class="text-item">
        <pre>${text}</pre>
      </div>`;
          });
          
          htmlContent += `
    </div>`;
        }
        
        htmlContent += `
  </div>
</body>
</html>`;
        
        return {
          content: [{
            type: 'text',
            text: htmlContent
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `이미지 생성 오류: ${error instanceof Error ? error.message : String(error)}`
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
  },
  {
    name: 'mcp_imagen_generate',
    description: 'Google Imagen 3 모델을 사용하여 텍스트 프롬프트에서 고품질 이미지를 생성합니다. Imagen 3은 포토리얼리즘, 예술적 디테일, 특정 예술 스타일(인상주의, 애니메이션 등)에 탁월합니다. 생성된 이미지에는 항상 SynthID 워터마크가 포함됩니다. 현재 영어 프롬프트만 지원됩니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 Imagen 모델 ID (예: imagen-3.0-generate-002)',
          default: 'imagen-3.0-generate-002',
        },
        prompt: {
          type: 'string',
          description: '이미지 생성을 위한 텍스트 프롬프트. 영어로 작성하세요.',
        },
        numberOfImages: {
          type: 'number',
          description: '생성할 이미지 수 (1-4)',
          default: 1,
          minimum: 1,
          maximum: 4,
        },
        aspectRatio: {
          type: 'string',
          description: '이미지 가로세로 비율',
          default: '1:1',
          enum: ['1:1', '3:4', '4:3', '9:16', '16:9']
        },
        personGeneration: {
          type: 'string',
          description: '사람 이미지 생성 허용 여부 (DONT_ALLOW: 사람 이미지 생성 차단, ALLOW_ADULT: 성인 이미지만 생성 허용)',
          default: 'ALLOW_ADULT',
          enum: ['DONT_ALLOW', 'ALLOW_ADULT']
        },
        saveDir: {
          type: 'string',
          description: '이미지를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 이미지 파일 이름 (확장자 제외)',
        }
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        // generateImage 메서드를 사용하지만, Imagen 모델로 고정
        const modelName = args.model || 'imagen-3.0-generate-002';
        if (!modelName.includes('imagen')) {
          throw new Error('이 도구는 Imagen 모델만 지원합니다. 모델 이름에 "imagen"이 포함되어야 합니다.');
        }
        
        const result = await geminiService.generateImage({
          ...args,
          model: modelName
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Imagen 이미지 생성 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  },
  {
    name: 'mcp_gemini_create_image',
    description: 'Gemini 모델을 사용하여 텍스트 프롬프트에서 이미지를 생성합니다. 텍스트와 이미지를 함께 반환합니다. 주요 특징: 1) 생성된 모든 이미지에는 SynthID 워터마크 포함 2) 대화식 이미지 수정 가능 3) 텍스트와 이미지가 혼합된 출력 생성 가능. 최상의 성능을 위해 EN, es-MX, ja-JP, zh-CN, hi-IN 언어를 사용하세요. 이미지 생성이 항상 트리거되지 않을 수 있으므로 "이미지 생성", "이미지 제공" 등의 표현을 명시적으로 요청하세요.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-2.0-flash-exp-image-generation)',
          default: 'gemini-2.0-flash-exp-image-generation',
        },
        prompt: {
          type: 'string',
          description: '이미지 생성을 위한 텍스트 프롬프트. 이미지를 명시적으로 요청하려면 "이미지 생성", "이미지 제공" 등의 표현을 포함하세요.',
        },
        saveDir: {
          type: 'string',
          description: '이미지를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 이미지 파일 이름 (확장자 제외)',
        }
      },
      required: ['prompt']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const modelName = args.model || 'gemini-2.0-flash-exp-image-generation';
        
        if (!modelName.includes('gemini')) {
          throw new Error('이 도구는 Gemini 모델만 지원합니다. 모델 이름에 "gemini"가 포함되어야 합니다.');
        }
        
        const result = await geminiService.generateGeminiImage({
          model: modelName,
          prompt: args.prompt,
          saveDir: args.saveDir || './temp',
          fileName: args.fileName
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
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
    name: 'mcp_gemini_edit_image',
    description: 'Gemini 모델을 사용하여 기존 이미지를 편집합니다. 텍스트 프롬프트와 Base64로 인코딩된 이미지 데이터가 필요합니다. 제한사항: 1) 오디오/동영상 입력 미지원 2) 이미지 생성이 항상 트리거되지 않음(명시적으로 "이미지 업데이트", "이미지 편집" 등 요청 필요) 3) 모델이 가끔 생성을 중단할 수 있음. 이미지에 텍스트를 생성할 때는 먼저 텍스트를 생성한 다음 텍스트가 포함된 이미지를 요청하는 것이 효과적입니다. 멀티턴 이미지 편집(채팅)이 가능하며, 컨텍스트를 유지하면서 이미지를 수정할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-2.0-flash-exp-image-generation)',
          default: 'gemini-2.0-flash-exp-image-generation',
        },
        prompt: {
          type: 'string',
          description: '이미지 편집을 위한 텍스트 프롬프트. 명시적으로 "이미지 업데이트", "이미지 편집" 등의 표현을 포함하세요.',
        },
        imageData: {
          type: 'string',
          description: 'Base64로 인코딩된 이미지 데이터. fs.readFileSync(imagePath).toString("base64")로 파일에서 얻을 수 있습니다.',
        },
        imageMimeType: {
          type: 'string',
          description: '이미지 MIME 타입 (예: image/png, image/jpeg)',
          default: 'image/png',
        },
        saveDir: {
          type: 'string',
          description: '편집된 이미지를 저장할 디렉토리',
          default: './temp',
        },
        fileName: {
          type: 'string',
          description: '저장할 이미지 파일 이름 (확장자 제외)',
        }
      },
      required: ['prompt', 'imageData']
    },
    async handler(args: any): Promise<ToolResponse> {
      try {
        const modelName = args.model || 'gemini-2.0-flash-exp-image-generation';
        
        if (!modelName.includes('gemini')) {
          throw new Error('이 도구는 Gemini 모델만 지원합니다. 모델 이름에 "gemini"가 포함되어야 합니다.');
        }
        
        if (!args.imageData) {
          throw new Error('이미지 데이터가 필요합니다. 유효한 Base64로 인코딩된 이미지 데이터를 제공하세요.');
        }
        
        const result = await geminiService.editGeminiImage({
          model: modelName,
          prompt: args.prompt,
          imageData: args.imageData,
          imageMimeType: args.imageMimeType || 'image/png',
          saveDir: args.saveDir || './temp',
          fileName: args.fileName
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Gemini 이미지 편집 오류: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  }
];
