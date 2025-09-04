/**
 * HTTP adapter interface and implementations
 */

export interface HttpRequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  url: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: HttpResponse
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface HttpAdapter {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}