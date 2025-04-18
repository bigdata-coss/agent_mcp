import axios from 'axios';
import { SparqlConfig } from '../types/index.js';

export class SparqlService {
  private config: SparqlConfig;

  constructor(config?: Partial<SparqlConfig>) {
    this.config = {
      endpoint: config?.endpoint || process.env.SPARQL_ENDPOINT || 'http://localhost:7200',
      defaultRepository: config?.defaultRepository || process.env.SPARQL_DEFAULT_REPOSITORY || 'schemaorg-current-https'
    };
  }

  /**
   * SPARQL 쿼리 실행
   */
  async executeQuery(query: string, repository?: string, format: string = 'json', explain = false): Promise<any> {
    const repo = repository || this.config.defaultRepository;
    const endpoint = this.config.endpoint;
    const url = explain 
      ? `${endpoint}/repositories/${repo}/explain`
      : `${endpoint}/repositories/${repo}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': format === 'json' ? 'application/sparql-results+json' : `application/sparql-results+${format}`
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`SPARQL 쿼리 실행 오류 (${response.status}): ${await response.text()}`);
      }

      if (format === 'json') {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('SPARQL 쿼리 실행 중 오류:', error);
      throw error;
    }
  }

  /**
   * SPARQL 업데이트 쿼리 실행
   */
  async updateQuery(query: string, repository?: string): Promise<any> {
    const repo = repository || this.config.defaultRepository;
    const endpoint = this.config.endpoint;
    const url = `${endpoint}/repositories/${repo}/statements`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-update',
          'Accept': 'application/json'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`SPARQL 업데이트 쿼리 실행 오류 (${response.status}): ${await response.text()}`);
      }

      return { success: true, status: response.status };
    } catch (error) {
      console.error('SPARQL 업데이트 쿼리 실행 중 오류:', error);
      throw error;
    }
  }

  /**
   * 리포지토리 목록 조회
   */
  async listRepositories(): Promise<any> {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.config.endpoint}/rest/repositories`,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`리포지토리 목록 조회 오류 (${error.response.status}): ${error.response.data}`);
      } else {
        throw new Error(`리포지토리 목록 조회 오류: ${error}`);
      }
    }
  }

  /**
   * 그래프 목록 조회
   */
  async listGraphs(repository?: string): Promise<any> {
    const repo = repository || this.config.defaultRepository;
    
    try {
      const response = await this.executeQuery(`
        SELECT DISTINCT ?graph 
        WHERE { 
          GRAPH ?graph { ?s ?p ?o } 
        } 
        ORDER BY ?graph
      `, repo);
      
      return response;
    } catch (error) {
      throw new Error(`그래프 목록 조회 오류: ${error}`);
    }
  }

  /**
   * 리소스 정보 조회
   */
  async getResourceInfo(uri: string, repository?: string): Promise<any> {
    const repo = repository || this.config.defaultRepository;
    
    try {
      const response = await this.executeQuery(`
        SELECT ?p ?o
        WHERE {
          <${uri}> ?p ?o .
        }
      `, repo);
      
      return response;
    } catch (error) {
      throw new Error(`리소스 정보 조회 오류: ${error}`);
    }
  }
} 