import { MockHttpAdapter } from "./MockHttpAdapter";
import { HttpError } from "../HttpAdapter";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("MockHttpAdapter", () => {
  let httpAdapter: MockHttpAdapter;

  beforeEach(() => {
    httpAdapter = new MockHttpAdapter();
  });

  afterEach(() => {
    httpAdapter.clearMocks();
    httpAdapter.clearRequests();
  });

  describe("request", () => {
    it("should return mocked successful response", async () => {
      const mockResponse = {
        status: 200,
        data: '{"test": "data"}'
      };
      
      httpAdapter.mockResponse("https://example.com/api", mockResponse);

      const response = await httpAdapter.request("https://example.com/api");

      expect(response.status).toBe(200);
      expect(response.data).toBe('{"test": "data"}');
      expect(response.statusText).toBe("OK");
      expect(response.url).toBe("https://example.com/api");
    });

    it("should throw HttpError for 4xx status codes", async () => {
      httpAdapter.mockResponse("https://example.com/notfound", {
        status: 404,
        statusText: "Not Found",
        data: "Page not found"
      });

      await expect(httpAdapter.request("https://example.com/notfound"))
        .rejects.toThrow(HttpError);
      
      try {
        await httpAdapter.request("https://example.com/notfound");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(404);
        expect((error as HttpError).message).toContain("HTTP 404");
      }
    });

    it("should throw HttpError for 5xx status codes", async () => {
      httpAdapter.mockResponse("https://example.com/server-error", {
        status: 500,
        data: "Internal server error"
      });

      await expect(httpAdapter.request("https://example.com/server-error"))
        .rejects.toThrow(HttpError);
    });

    it("should throw mocked network errors", async () => {
      const networkError = new Error("Network connection failed");
      httpAdapter.mockError("https://example.com/error", networkError);

      await expect(httpAdapter.request("https://example.com/error"))
        .rejects.toThrow("Network connection failed");
    });

    it("should handle custom headers in response", async () => {
      httpAdapter.mockResponse("https://example.com/headers", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "test-value"
        },
        data: "{}"
      });

      const response = await httpAdapter.request("https://example.com/headers");

      expect(response.headers["Content-Type"]).toBe("application/json");
      expect(response.headers["X-Custom-Header"]).toBe("test-value");
    });

    it("should simulate timeout with delay", async () => {
      httpAdapter.mockDelay("https://example.com/slow", 2000);
      httpAdapter.mockResponse("https://example.com/slow", {
        status: 200,
        data: "slow response"
      });

      await expect(httpAdapter.request("https://example.com/slow", { timeout: 1000 }))
        .rejects.toThrow("Request timeout");
    }, 10000); // Increase test timeout to 10 seconds
  });

  describe("request tracking", () => {
    it("should record all requests", async () => {
      httpAdapter.mockResponse("https://example.com/1", { status: 200, data: "1" });
      httpAdapter.mockResponse("https://example.com/2", { status: 200, data: "2" });

      await httpAdapter.request("https://example.com/1", { method: 'GET' });
      await httpAdapter.request("https://example.com/2", { method: 'POST', body: 'test' });

      const requests = httpAdapter.getRequests();
      expect(requests).toHaveLength(2);
      
      expect(requests[0].url).toBe("https://example.com/1");
      expect(requests[0].options?.method).toBe("GET");
      
      expect(requests[1].url).toBe("https://example.com/2");
      expect(requests[1].options?.method).toBe("POST");
      expect(requests[1].options?.body).toBe("test");
    });

    it("should return last request", async () => {
      httpAdapter.mockResponse("https://example.com/first", { status: 200, data: "first" });
      httpAdapter.mockResponse("https://example.com/last", { status: 200, data: "last" });

      await httpAdapter.request("https://example.com/first");
      await httpAdapter.request("https://example.com/last");

      const lastRequest = httpAdapter.getLastRequest();
      expect(lastRequest?.url).toBe("https://example.com/last");
    });

    it("should clear requests when requested", async () => {
      httpAdapter.mockResponse("https://example.com/test", { status: 200, data: "test" });
      
      await httpAdapter.request("https://example.com/test");
      expect(httpAdapter.getRequests()).toHaveLength(1);
      
      httpAdapter.clearRequests();
      expect(httpAdapter.getRequests()).toHaveLength(0);
    });
  });

  describe("mock management", () => {
    it("should throw error for unmocked URLs", async () => {
      await expect(httpAdapter.request("https://example.com/unmocked"))
        .rejects.toThrow("No mock response configured for URL");
    });

    it("should clear mocked responses", () => {
      httpAdapter.mockResponse("https://example.com/test", { status: 200, data: "test" });
      httpAdapter.mockError("https://example.com/error", new Error("test error"));
      
      httpAdapter.clearMocks();
      
      // Should now throw unmocked URL error instead of our mocked responses
      expect(httpAdapter.request("https://example.com/test")).rejects.toThrow("No mock response configured");
      expect(httpAdapter.request("https://example.com/error")).rejects.toThrow("No mock response configured");
    });
  });
});