import geminiService from '../services/gemini-service.js';

/**
 * Gemini 모델을 사용하기 위한 도구 모음
 */
const geminiTools = {
  mcp_gemini_generate_text: {
    description: 'Gemini AI 모델을 사용하여 텍스트를 생성합니다.',
    parameters: {
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
    async handler(args: any) {
      return await geminiService.generateText({
        model: args.model,
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
    async handler(args: any) {
      return await geminiService.chatCompletion({
        model: args.model,
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
  }
};

export default geminiTools; 