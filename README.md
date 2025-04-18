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

### Google Gemini 관련 기능
- 텍스트 생성 (`mcp_gemini_generate_text`)
- 채팅 완성 (`mcp_gemini_chat_completion`)
- 모델 목록 조회 (`mcp_gemini_list_models`)

## 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/bigdata-coss/ontology_mcp_test.git
cd ontology_mcp_test
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

Claude Desktop(Cursor/Cline)에서 Ontology MCP를 사용하려면 MCP 설정 파일을 업데이트해야 합니다:

1. VSCode에서 설정 파일 열기:
   - Windows: `%USERPROFILE%\.cursor\mcp.json`
   - macOS: `$HOME/.cursor/mcp.json`
   - Linux: `$HOME/.cursor/mcp.json`

2. 다음 설정 추가:

```json
{
  "mcpServers": {
    "a2a-ontology-mcp": {
      "command": "node",
      "args": ["E:\\codes\\a2a_mcp\\build"],
      "env": {
        "SPARQL_ENDPOINT": "http://localhost:7200",
        "OPENAI_API_KEY": "yout-api-key",
        "GEMINI_API_KEY" : "yout-api-key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

> **중요**: `args'의 경로를 를 프로젝트 빌드 디렉토리의 실제 절대 경로로 변경하세요.

3. Cursor/VSCode 재시작

## Claude Desktop에서 사용하기

Claude Desktop에서 다음 명령어를 사용하여 SPARQL 쿼리와 Ollama 모델을 활용할 수 있습니다:

### SPARQL 기본 쿼리 실행

```
/run mcp_sparql_execute_query
{
  "query": "SELECT * WHERE { ?s ?p ?o } LIMIT 10"
}
```

### 리소스 정보 조회

```
/run mcp_sparql_get_resource_info
{
  "uri": "http://schema.org/Person"
}
```

### 데이터 추가

```
/run mcp_sparql_update
{
  "query": "PREFIX ex: <http://example.org/> INSERT DATA { ex:Person1 ex:name \"홍길동\" }"
}
```

### 리포지토리 목록 조회

```
/run mcp_sparql_list_repositories
```

### 그래프 목록 조회

```
/run mcp_sparql_list_graphs
```

### Ollama 모델 사용하기

#### Ollama 모델 상태 확인

```
/run mcp_ollama_status
```

#### 모델 실행하기

```
/run mcp_ollama_run
{
  "name": "gemma3:12b",
  "prompt": "한국의 역사에 대해 간략히 설명해주세요."
}
```

#### 모델 정보 확인하기

```
/run mcp_ollama_show
{
  "name": "phi4"
}
```

#### 채팅 완성 기능 사용하기

```
/run mcp_ollama_chat_completion
{
  "model": "llama3.3",
  "messages": [
    {"role": "system", "content": "당신은 도움이 되는 AI 어시스턴트입니다."},
    {"role": "user", "content": "인공지능의 미래에 대해 설명해주세요."}
  ]
}
```

### Gemini 모델 사용하기

#### 텍스트 생성하기

```
/run mcp_gemini_generate_text
{
  "model": "gemini-1.5-pro",
  "prompt": "인공지능의 발전이 인류에게 어떤 영향을 미칠지 설명해주세요."
}
```

#### 채팅 완성 기능 사용하기

```
/run mcp_gemini_chat_completion
{
  "model": "gemini-1.5-pro",
  "messages": [
    {"role": "system", "content": "당신은 도움이 되는 AI 어시스턴트입니다."},
    {"role": "user", "content": "양자컴퓨팅이 인공지능 발전에 어떤 역할을 할까요?"}
  ]
}
```

#### 사용 가능한 모델 목록 조회하기

```
/run mcp_gemini_list_models
```

## Ollama 모델 안내

시스템은 다음과 같은 Ollama 모델을 제공합니다:

1. **gemma3:12b** (포트: 11435)
   - 구글의 Gemma 모델
   - 범용 텍스트 생성 및 대화에 적합
   - 고정 모델로 변경 불가

2. **phi4** (포트: 11436)
   - Microsoft의 Phi 모델
   - 코드와 추론에 강점
   - 고정 모델로 변경 불가

3. **deepseek-r1:14b** (포트: 11437)
   - Deepseek AI의 모델
   - 복잡한 추론 작업에 적합
   - 고정 모델로 변경 불가

4. **llama3.3** (포트: 11438)
   - Meta의 Llama 모델
   - 범용 텍스트 생성 및 코드 작업에 적합
   - 고정 모델로 변경 불가

5. **qwq** (포트: 11434)
   - 기본 모델로, 다양한 용도로 사용 가능
   - **유일하게 수정 가능한 모델**
   - 원하는 다른 Ollama 모델로 교체하여 사용 가능

### 모델 지정 방법

모델 사용 시 다음과 같이 모델명을 지정하세요:
- 특정 모델군을 사용하고 싶을 때: `gemma`, `phi`, `deepseek`, `llama` 키워드 포함 (자동으로 적합한 서비스로 라우팅)
- 기본 모델(qwq)을 사용하고 싶을 때: 다른 모델군 키워드가 포함되지 않은 모델명 사용

> **주의**: gemma, phi, deepseek, llama 서비스에는 고정 모델이 설치되어 있으므로 변경하지 마세요.
> qwq 모델은 필요에 따라 다른 모델로 교체하여 사용할 수 있습니다.

## 쿼리 예제

### 클래스 조회

```sparql
SELECT DISTINCT ?class ?label
WHERE {
  ?class a rdfs:Class .
  OPTIONAL { ?class rdfs:label ?label }
}
LIMIT 20
```

### 속성 조회

```sparql
SELECT DISTINCT ?property ?label ?comment
WHERE {
  ?property a rdf:Property .
  OPTIONAL { ?property rdfs:label ?label }
  OPTIONAL { ?property rdfs:comment ?comment }
}
LIMIT 20
```

### 데이터 추가

```sparql
PREFIX ex: <http://example.org/>
PREFIX schema: <http://schema.org/>

INSERT DATA {
  ex:Person123 a schema:Person ;
    schema:name "홍길동" ;
    schema:jobTitle "개발자" ;
    schema:birthDate "1990-01-01" .
}
```

## 문제 해결

### GraphDB 연결 오류

GraphDB에 연결할 수 없는 경우:
1. Docker 컨테이너가 실행 중인지 확인: `docker ps`
2. GraphDB 웹 인터페이스에 접근할 수 있는지 확인: [http://localhost:7200](http://localhost:7200)
3. 방화벽이나 보안 설정이 연결을 차단하지 않는지 확인

### MCP 서버 오류

MCP 서버가 실행되지 않거나 오류가 발생하는 경우:
1. 프로젝트가 올바르게 빌드되었는지 확인: `npm run build`
2. 올바른 빌드 경로를 MCP 설정에 지정했는지 확인
3. 환경 변수가 올바르게 설정되었는지 확인

### 도구 누락

일부 도구가 Claude Desktop에서 보이지 않는 경우:
1. VSCode/Cursor를 재시작하세요
2. MCP 설정 파일이 올바르게 구성되었는지 확인
3. MCP 서버가 모든 도구를 등록했는지 확인 (capabilities 섹션에서)

## 개발 참고 사항

- 이 프로젝트는 Node.js 18 이상에서 개발 및 테스트되었습니다.
- GraphDB Free 또는 GraphDB SE 최신 버전과 호환됩니다.
- Model Context Protocol 사양을 준수합니다.

## 라이선스

이 프로젝트는 MIT 라이선스로 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요. #   a g e n t _ m c p  
 