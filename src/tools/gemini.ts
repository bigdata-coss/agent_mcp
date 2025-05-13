import geminiService from '../services/gemini-service.js';

/**
 * 기본 모델 상수 정의
 */
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
const DEFAULT_IMAGE_MODEL = 'imagen-3.0-generate-002';
const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001';
const DEFAULT_MULTIMODAL_MODEL = 'gemini-2.0-flash';

/**
 * Gemini 모델을 사용하기 위한 도구 모음
 */
const geminiTools = {
  mcp_gemini_generate_text: {
    description: 'Gemini AI 모델을 사용하여 텍스트를 생성합니다.',
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-pro, gemini-1.5-pro 등)',
          default: DEFAULT_TEXT_MODEL,
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
    async handler(args: any) {
      return await geminiService.generateText({
        model: args.model || DEFAULT_TEXT_MODEL,
        prompt: args.prompt,
        temperature: args.temperature,
        max_tokens: args.max_tokens,
        topK: args.topK,
        topP: args.topP
      });
    },
  },

  mcp_gemini_chat_completion: {
    description: 'Gemini AI 모델을 사용하여 채팅 대화를 완성합니다.',
    parameters: {
      type: 'object',
      required: ['messages'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-pro, gemini-1.5-pro 등)',
          default: DEFAULT_TEXT_MODEL,
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
    async handler(args: any) {
      return await geminiService.chatCompletion({
        model: args.model || DEFAULT_TEXT_MODEL,
        messages: args.messages,
        temperature: args.temperature,
        max_tokens: args.max_tokens,
        topK: args.topK,
        topP: args.topP
      });
    },
  },

  mcp_gemini_list_models: {
    description: '사용 가능한 Gemini 모델 목록을 조회합니다.',
    parameters: {
      type: 'object',
      properties: {},
    },
    async handler() {
      return await geminiService.listModels();
    },
  },

  mcp_gemini_generate_images: {
    description: 'Google Imagen 모델을 사용하여 이미지를 생성합니다. 생성된 이미지 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 ID (예: imagen-3.0-generate-002)',
          default: DEFAULT_IMAGE_MODEL,
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
        aspectRatio: {
          type: 'string',
          description: '생성할 이미지 비율',
          default: '1:1',
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
    },
    async handler(args: any) {
      return await geminiService.generateImage({
        model: args.model || DEFAULT_IMAGE_MODEL,
        prompt: args.prompt,
        numberOfImages: args.numberOfImages,
        aspectRatio: args.aspectRatio,
        saveDir: args.saveDir,
        fileName: args.fileName,
      });
    },
  },

  mcp_gemini_generate_videos: {
    description: 'Google Veo 모델을 사용하여 비디오를 생성합니다. 생성된 비디오 파일 경로를 반환하며, 이 경로는 반드시 사용자에게 알려주어야 합니다.',
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 모델 ID (예: veo-2.0-generate-001)',
          default: DEFAULT_VIDEO_MODEL,
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
    },
    async handler(args: any) {
      return await geminiService.generateVideos({
        model: args.model || DEFAULT_VIDEO_MODEL,
        prompt: args.prompt,
        image: args.image,
        numberOfVideos: args.numberOfVideos,
        aspectRatio: args.aspectRatio,
        personGeneration: args.personGeneration,
        durationSeconds: args.durationSeconds,
        saveDir: args.saveDir,
        fileName: args.fileName,
      });
    },
  },

  mcp_gemini_generate_multimodal_content: {
    description: 'Gemini 모델을 사용하여 텍스트와 이미지를 포함한 멀티모달 콘텐츠를 생성합니다. 생성된 텍스트와 이미지 파일 경로를 반환하며, 이 정보는 반드시 사용자에게 알려주어야 합니다.',
    parameters: {
      type: 'object',
      required: ['contents'],
      properties: {
        model: {
          type: 'string',
          description: '사용할 Gemini 모델 ID (예: gemini-2.0-flash-exp-image-generation)',
          default: DEFAULT_MULTIMODAL_MODEL,
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
    },
    async handler(args: any) {
      return await geminiService.generateMultimodalContent({
        model: args.model || DEFAULT_MULTIMODAL_MODEL,
        contents: args.contents,
        temperature: args.temperature,
        max_tokens: args.max_tokens,
        saveDir: args.saveDir,
        fileName: args.fileName,
      });
    },
  }
};

export default geminiTools; 