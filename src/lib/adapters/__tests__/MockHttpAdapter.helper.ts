/**
 * Mock HTTP adapter for testing remote pack sources
 */

import { HttpAdapter, HttpResponse, HttpRequestOptions, HttpError } from "../HttpAdapter";

export interface MockHttpRequest {
  url: string;
  options?: HttpRequestOptions;
}

export interface MockHttpResponseConfig {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data: string;
}

export class MockHttpAdapter implements HttpAdapter {
  private responses = new Map<string, MockHttpResponseConfig>();
  private delays = new Map<string, number>();
  private errors = new Map<string, Error>();
  private requests: MockHttpRequest[] = [];

  /**
   * Mock a successful response for a URL
   */
  mockResponse(url: string, response: MockHttpResponseConfig): void {
    this.responses.set(url, response);
  }

  /**
   * Mock a network error for a URL
   */
  mockError(url: string, error: Error): void {
    this.errors.set(url, error);
  }

  /**
   * Mock a delay for a URL (useful for timeout testing)
   */
  mockDelay(url: string, delayMs: number): void {
    this.delays.set(url, delayMs);
  }

  /**
   * Get all requests that were made
   */
  getRequests(): MockHttpRequest[] {
    return [...this.requests];
  }

  /**
   * Get the last request made
   */
  getLastRequest(): MockHttpRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  /**
   * Clear all recorded requests
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Clear all mocked responses, errors, and delays
   */
  clearMocks(): void {
    this.responses.clear();
    this.errors.clear();
    this.delays.clear();
  }

  async request(url: string, options?: HttpRequestOptions): Promise<HttpResponse> {
    // Record the request
    this.requests.push({ url, options });

    // Check for mocked error
    if (this.errors.has(url)) {
      throw this.errors.get(url);
    }

    // Apply delay if configured
    const delay = this.delays.get(url);
    if (delay) {
      await this.sleep(delay);
    }

    // Check for timeout
    const timeout = options?.timeout || 30000;
    if (delay && delay > timeout) {
      throw new HttpError(`Request timeout after ${timeout}ms`, 0);
    }

    // Return mocked response
    const mockResponse = this.responses.get(url);
    if (!mockResponse) {
      throw new HttpError(`No mock response configured for URL: ${url}`, 404);
    }

    const response: HttpResponse = {
      status: mockResponse.status,
      statusText: mockResponse.statusText || this.getDefaultStatusText(mockResponse.status),
      headers: mockResponse.headers || {},
      data: mockResponse.data,
      url
    };

    // Throw error for 4xx/5xx status codes
    if (mockResponse.status >= 400) {
      throw new HttpError(
        `HTTP ${mockResponse.status}: ${response.statusText}`,
        mockResponse.status,
        response
      );
    }

    return response;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getDefaultStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };

    return statusTexts[status] || 'Unknown';
  }
}