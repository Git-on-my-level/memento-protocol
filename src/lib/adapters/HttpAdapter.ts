/**
 * HTTP adapter for making remote requests with timeout and error handling
 */

export interface HttpResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly data: string;
  readonly url: string;
}

export interface HttpRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly timeout?: number; // timeout in milliseconds
  readonly body?: string;
  readonly retries?: number;
  readonly retryDelay?: number; // delay between retries in milliseconds
}

export interface HttpAdapter {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

/**
 * Node.js implementation using built-in https/http modules
 */
export class NodeHttpAdapter implements HttpAdapter {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  async request(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse> {
    const {
      method = 'GET',
      headers = {},
      timeout = NodeHttpAdapter.DEFAULT_TIMEOUT,
      body,
      retries = NodeHttpAdapter.DEFAULT_RETRIES,
      retryDelay = NodeHttpAdapter.DEFAULT_RETRY_DELAY
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry
          await this.sleep(retryDelay * attempt);
        }

        const response = await this.makeRequest(url, {
          method,
          headers: {
            'User-Agent': 'zcc/1.0.0',
            'Accept': 'application/json, text/plain, */*',
            ...headers
          },
          timeout,
          body
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Only retry on network errors or 5xx server errors
        if (attempt === retries) {
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  private async makeRequest(url: string, options: Required<Pick<HttpRequestOptions, 'method' | 'headers' | 'timeout'>> & Pick<HttpRequestOptions, 'body'>): Promise<HttpResponse> {
    const https = await import('https');
    const http = await import('http');
    const urlModule = await import('url');

    const parsedUrl = new urlModule.URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: options.headers,
        timeout: options.timeout
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const response: HttpResponse = {
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers as Record<string, string>,
            data,
            url
          };

          if (res.statusCode && res.statusCode >= 400) {
            reject(new HttpError(
              `HTTP ${res.statusCode}: ${res.statusMessage}`,
              res.statusCode,
              response
            ));
          } else {
            resolve(response);
          }
        });
      });

      req.on('error', (error) => {
        reject(new HttpError(`Network error: ${error.message}`, 0, undefined, error));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new HttpError(`Request timeout after ${options.timeout}ms`, 0));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: HttpResponse,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'HttpError';
  }
}