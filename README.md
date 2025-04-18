# Ontology MCP

Ontology MCP는 GraphDB의 SPARQL 엔드포인트와 Ollama 모델을 Claude와 연결하는 Model Context Protocol (MCP) 서버입니다. 이 도구를 사용하면 Claude가 온톨로지 데이터를 쿼리하고 조작하며, 다양한 AI 모델을 활용할 수 있습니다.

![Ontology MCP 개요](assets/ontology-mcp-overview.png)

## 주요 기능

### SPARQL 관련 기능
- SPARQL 쿼리 실행 (`mcp_sparql_execute_query`)
- SPARQL 업데이트 쿼리 실행 (`mcp_sparql_update`)
- 리포지토리 목록 조회 (`mcp_sparql_list_repositories`)
- 그래프 목록 조회 (`mcp_sparql_list_graphs`)
- 리소스 정보 조회 (`mcp_sparql_get_resource_info`)

### Ollama 모델 관련 기능
- 모델 실행 (`mcp_ollama_run`)
- 모델 정보 확인 (`mcp_ollama_show`)
- 모델 다운로드 (`mcp_ollama_pull`)
- 모델 목록 조회 (`mcp_ollama_list`)
- 모델 삭제 (`mcp_ollama_rm`)
- 채팅 완성 (`mcp_ollama_chat_completion`)
- 컨테이너 상태 확인 (`mcp_ollama_status`)

### OpenAI 관련 기능
- 채팅 완성 (`mcp_openai_chat`)
- 이미지 생성 (`mcp_openai_image`)
- 텍스트-음성 변환 (`mcp_openai_tts`)
- 음성-텍스트 변환 (`mcp_openai_transcribe`)
- 임베딩 생성 (`mcp_openai_embedding`)

### Google Gemini 관련 기능
- 텍스트 생성 (`mcp_gemini_generate_text`)
- 채팅 완성 (`mcp_gemini_chat_completion`)
- 모델 목록 조회 (`mcp_gemini_list_models`)

### HTTP 요청 기능
- HTTP 요청 실행 (`mcp_http_request`) - GET, POST, PUT, DELETE 등 다양한 HTTP 메서드를 사용하여 외부 API와 통신

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/bigdata-coss/agent_mcp.git
cd agent_mcp
```

### 2. GraphDB Docker 컨테이너 실행

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 GraphDB 서버를 시작합니다:

```bash
docker-compose up -d
```

GraphDB 웹 인터페이스가 [http://localhost:7200](http://localhost:7200)에서 실행됩니다.

### 3. MCP 서버 빌드 및 실행

```bash
# 의존성 설치
npm install

# 프로젝트 빌드
npm run build

# 서버 실행 (테스트용, Claude Desktop에서는 필요 없음)
node build/index.js
```

### 4. RDF 데이터 가져오기

GraphDB 웹 인터페이스([http://localhost:7200](http://localhost:7200))에 접속하여 다음 단계를 수행합니다:

1. 리포지토리 생성:
   - "Setup" → "Repositories" → "Create new repository"
   - Repository ID: `schemaorg-current-https` (또는 원하는 이름)
   - Repository title: "Schema.org"
   - "Create" 클릭

2. 예제 데이터 가져오기:
   - 생성한 리포지토리를 선택
   - "Import" → "RDF" → "Upload RDF files"
   - `imports` 디렉토리의 예제 파일 업로드 (예: `imports/example.ttl`)
   - "Import" 클릭

> **참고**: 프로젝트에는 `imports` 디렉토리에 예제 RDF 파일이 포함되어 있습니다.

### 5. Claude Desktop 설정

Claude Desktop에서 Ontology MCP를 사용하려면 MCP 설정 파일을 업데이트해야 합니다:

1. Claude Desktop 설정 파일 열기:
   - Windows: `%AppData%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. 다음 설정 추가:

```json
{
  "mcpServers": {
    "a2a-ontology-mcp": {
      "command": "node",
      "args": ["E:\\codes\\a2a_mcp\\build"],
      "env": {
        "SPARQL_ENDPOINT": "http://localhost:7200",
        "OPENAI_API_KEY": "your-api-key",
        "GEMINI_API_KEY" : "your-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

> **중요**: `args'의 경로를 를 프로젝트 빌드 디렉토리의 실제 절대 경로로 변경하세요.

3. Claude Desktop 재시작
