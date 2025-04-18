export interface ToolContent {
  type: string;
  text: string;
}

export interface ToolResponse {
  content: ToolContent[];
  _meta?: any;
}

/**
 * MCP 도구 타입 정의
 */
export interface Tool<T = any> {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
  handler: (args: T) => Promise<ToolResponse>;
}

export interface ListToolsResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Tool["inputSchema"];
  }>;
}

export interface CreateDocumentArgs {
  content: string;
  saveDir?: string;
  fileName?: string;
}

export interface ReadDocumentArgs {
  filePath: string;
}

export interface ExtractTextArgs {
  filePath: string;
}

export interface EditArgs {
  type: string;
  target: string;
  replacement: string;
}

export interface EditDocumentArgs {
  filePath: string;
  edits: EditArgs[];
  saveDir?: string;
  fileName?: string;
}

export interface ConvertMarkdownToHWPArgs {
  markdown: string;
  saveDir?: string;
  fileName?: string;
}

export type ToolArgs = CreateDocumentArgs | ReadDocumentArgs | ExtractTextArgs | EditDocumentArgs | ConvertMarkdownToHWPArgs;

export interface DocumentResult {
  success: boolean;
  error?: string;
  filePath?: string;
  content?: string;
}

/**
 * SPARQL 쿼리 도구 인수
 */
export interface ExecuteQueryArgs {
  query: string;
  repository?: string;
  endpoint?: string;
  format?: 'json' | 'xml' | 'csv' | 'tsv';
  explain?: boolean;
}

/**
 * 리포지토리 목록 도구 인수
 */
export interface ListRepositoriesArgs {
  endpoint?: string;
}

/**
 * 그래프 목록 도구 인수
 */
export interface ListGraphsArgs {
  repository?: string;
  endpoint?: string;
}

/**
 * 리소스 정보 조회 도구 인수
 */
export interface GetResourceInfoArgs {
  uri: string;
  repository?: string;
  endpoint?: string;
}

/**
 * SPARQL 업데이트 도구 인수
 */
export interface UpdateQueryArgs {
  query: string;
  repository?: string;
  endpoint?: string;
}

/**
 * SPARQL 서비스 설정
 */
export interface SparqlConfig {
  endpoint: string;
  defaultRepository: string;
}
