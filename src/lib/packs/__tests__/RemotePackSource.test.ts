import { RemotePackSource } from "../RemotePackSource";
import { PackManifest, RemotePackSource as RemotePackSourceInterface } from "../../types/packs";
import { MockHttpAdapter } from "../../adapters/__tests__/MockHttpAdapter";
import { ZccError } from "../../errors";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("RemotePackSource", () => {
  let remoteSource: RemotePackSource;
  let httpAdapter: MockHttpAdapter;
  const sourceInfo: RemotePackSourceInterface = {
    name: "test-remote",
    type: "remote",
    url: "https://example.com/packs",
    cacheTtl: 60000 // 1 minute for testing
  };

  const validManifest: PackManifest = {
    name: "test-pack",
    version: "1.0.0",
    description: "Test starter pack for remote testing",
    author: "test-author",
    components: {
      modes: [{ name: "engineer", required: true }],
      workflows: [{ name: "review", required: false }]
    },
    category: "general"
  };

  beforeEach(() => {
    httpAdapter = new MockHttpAdapter();
    remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
  });

  afterEach(() => {
    httpAdapter.clearMocks();
    httpAdapter.clearRequests();
    remoteSource.clearAllCache();
  });

  describe("constructor", () => {
    it("should initialize with source info", () => {
      expect(remoteSource.getRemoteSourceInfo()).toEqual(sourceInfo);
    });

    it("should use default HTTP adapter if none provided", () => {
      const source = new RemotePackSource(sourceInfo);
      expect(source).toBeInstanceOf(RemotePackSource);
    });
  });

  describe("loadPack", () => {
    it("should load a valid pack from remote source", async () => {
      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      const pack = await remoteSource.loadPack("test-pack");

      expect(pack.manifest).toEqual(validManifest);
      expect(pack.path).toBe("https://example.com/packs/test-pack");
      expect(pack.componentsPath).toBe("https://example.com/packs/test-pack/components");

      // Verify request was made
      const requests = httpAdapter.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe(manifestUrl);
    });

    it("should use cached manifest when available and not expired", async () => {
      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // First load
      await remoteSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);

      // Second load should use cache
      httpAdapter.clearRequests();
      const pack = await remoteSource.loadPack("test-pack");

      expect(pack.manifest).toEqual(validManifest);
      expect(httpAdapter.getRequests()).toHaveLength(0); // No new requests
    });

    it("should include auth token in request headers", async () => {
      const sourceWithAuth: RemotePackSourceInterface = {
        ...sourceInfo,
        authToken: "test-token-123"
      };
      const authenticatedSource = new RemotePackSource(sourceWithAuth, httpAdapter);

      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      await authenticatedSource.loadPack("test-pack");

      const requests = httpAdapter.getRequests();
      expect(requests[0].options?.headers?.Authorization).toBe("Bearer test-token-123");
    });

    it("should throw error for 404 responses", async () => {
      const manifestUrl = "https://example.com/packs/missing-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 404,
        data: "Not Found"
      });

      await expect(remoteSource.loadPack("missing-pack"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.loadPack("missing-pack");
      } catch (error) {
        expect(error).toBeInstanceOf(ZccError);
        expect((error as ZccError).code).toBe("PACK_NOT_FOUND");
      }
    });

    it("should throw error for invalid JSON manifest", async () => {
      const manifestUrl = "https://example.com/packs/invalid-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: "{ invalid json }"
      });

      await expect(remoteSource.loadPack("invalid-pack"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.loadPack("invalid-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("INVALID_JSON");
      }
    });

    it("should throw error for manifest missing required fields", async () => {
      const incompleteManifest = {
        name: "incomplete-pack",
        version: "1.0.0"
        // Missing description, author, components
      };

      const manifestUrl = "https://example.com/packs/incomplete-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(incompleteManifest)
      });

      await expect(remoteSource.loadPack("incomplete-pack"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.loadPack("incomplete-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("INVALID_MANIFEST");
      }
    });

    it("should handle network errors gracefully", async () => {
      const manifestUrl = "https://example.com/packs/error-pack/manifest.json";
      httpAdapter.mockError(manifestUrl, new Error("Network connection failed"));

      await expect(remoteSource.loadPack("error-pack"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.loadPack("error-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("PACK_LOAD_ERROR");
      }
    });
  });

  describe("listPacks", () => {
    it("should list packs from index file", async () => {
      const indexUrl = "https://example.com/packs/index.json";
      const packIndex = {
        packs: ["pack-1", "pack-2", "pack-3"]
      };

      httpAdapter.mockResponse(indexUrl, {
        status: 200,
        data: JSON.stringify(packIndex)
      });

      const packs = await remoteSource.listPacks();

      expect(packs).toEqual(["pack-1", "pack-2", "pack-3"]);
      
      const requests = httpAdapter.getRequests();
      expect(requests[0].url).toBe(indexUrl);
    });

    it("should handle array-format index", async () => {
      const indexUrl = "https://example.com/packs/index.json";
      const packIndex = ["pack-a", "pack-b"];

      httpAdapter.mockResponse(indexUrl, {
        status: 200,
        data: JSON.stringify(packIndex)
      });

      const packs = await remoteSource.listPacks();

      expect(packs).toEqual(["pack-a", "pack-b"]);
    });

    it("should return empty array when index not found", async () => {
      const indexUrl = "https://example.com/packs/index.json";
      httpAdapter.mockResponse(indexUrl, {
        status: 404,
        data: "Not Found"
      });

      const packs = await remoteSource.listPacks();

      expect(packs).toEqual([]);
    });

    it("should handle invalid index JSON gracefully", async () => {
      const indexUrl = "https://example.com/packs/index.json";
      httpAdapter.mockResponse(indexUrl, {
        status: 200,
        data: "{ invalid json }"
      });

      const packs = await remoteSource.listPacks();

      expect(packs).toEqual([]);
    });

    it("should include auth token in index request", async () => {
      const sourceWithAuth: RemotePackSourceInterface = {
        ...sourceInfo,
        authToken: "index-token"
      };
      const authenticatedSource = new RemotePackSource(sourceWithAuth, httpAdapter);

      const indexUrl = "https://example.com/packs/index.json";
      httpAdapter.mockResponse(indexUrl, {
        status: 200,
        data: JSON.stringify(["pack-1"])
      });

      await authenticatedSource.listPacks();

      const requests = httpAdapter.getRequests();
      expect(requests[0].options?.headers?.Authorization).toBe("Bearer index-token");
    });
  });

  describe("hasPack", () => {
    it("should return true for existing packs", async () => {
      const manifestUrl = "https://example.com/packs/existing-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      const exists = await remoteSource.hasPack("existing-pack");

      expect(exists).toBe(true);
    });

    it("should return false for non-existent packs", async () => {
      const manifestUrl = "https://example.com/packs/missing-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 404,
        data: "Not Found"
      });

      const exists = await remoteSource.hasPack("missing-pack");

      expect(exists).toBe(false);
    });

    it("should return false on network errors", async () => {
      const manifestUrl = "https://example.com/packs/error-pack/manifest.json";
      httpAdapter.mockError(manifestUrl, new Error("Network error"));

      const exists = await remoteSource.hasPack("error-pack");

      expect(exists).toBe(false);
    });
  });

  describe("hasComponent", () => {
    it("should return true for existing components", async () => {
      const componentUrl = "https://example.com/packs/test-pack/components/modes/engineer.md";
      httpAdapter.mockResponse(componentUrl, {
        status: 200,
        data: "# Engineer Mode\nYou are a software engineer."
      });

      const exists = await remoteSource.hasComponent("test-pack", "modes", "engineer");

      expect(exists).toBe(true);
      
      const requests = httpAdapter.getRequests();
      expect(requests[0].url).toBe(componentUrl);
    });

    it("should return false for non-existent components", async () => {
      const componentUrl = "https://example.com/packs/test-pack/components/modes/missing.md";
      httpAdapter.mockResponse(componentUrl, {
        status: 404,
        data: "Not Found"
      });

      const exists = await remoteSource.hasComponent("test-pack", "modes", "missing");

      expect(exists).toBe(false);
    });

    it("should handle hook components with JSON extension", async () => {
      const hookUrl = "https://example.com/packs/test-pack/components/hooks/git-hook.json";
      httpAdapter.mockResponse(hookUrl, {
        status: 200,
        data: '{"name": "git-hook", "enabled": true}'
      });

      const exists = await remoteSource.hasComponent("test-pack", "hooks", "git-hook");

      expect(exists).toBe(true);
      
      const requests = httpAdapter.getRequests();
      expect(requests[0].url).toBe(hookUrl);
    });
  });

  describe("getComponentPath", () => {
    it("should return correct URLs for different component types", async () => {
      const modePath = await remoteSource.getComponentPath("test-pack", "modes", "engineer");
      expect(modePath).toBe("https://example.com/packs/test-pack/components/modes/engineer.md");

      const workflowPath = await remoteSource.getComponentPath("test-pack", "workflows", "review");
      expect(workflowPath).toBe("https://example.com/packs/test-pack/components/workflows/review.md");

      const agentPath = await remoteSource.getComponentPath("test-pack", "agents", "research");
      expect(agentPath).toBe("https://example.com/packs/test-pack/components/agents/research.md");

      const hookPath = await remoteSource.getComponentPath("test-pack", "hooks", "git-hook");
      expect(hookPath).toBe("https://example.com/packs/test-pack/components/hooks/git-hook.json");
    });
  });

  describe("getComponentContent", () => {
    it("should fetch and cache component content", async () => {
      const componentUrl = "https://example.com/packs/test-pack/components/modes/engineer.md";
      const content = "# Engineer Mode\nYou are a software engineer.";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 200,
        data: content
      });

      const result = await remoteSource.getComponentContent("test-pack", "modes", "engineer");

      expect(result).toBe(content);
      expect(httpAdapter.getRequests()).toHaveLength(1);

      // Second call should use cache
      httpAdapter.clearRequests();
      const cachedResult = await remoteSource.getComponentContent("test-pack", "modes", "engineer");

      expect(cachedResult).toBe(content);
      expect(httpAdapter.getRequests()).toHaveLength(0); // No new requests
    });

    it("should throw error for non-existent components", async () => {
      const componentUrl = "https://example.com/packs/test-pack/components/modes/missing.md";
      httpAdapter.mockResponse(componentUrl, {
        status: 404,
        data: "Not Found"
      });

      await expect(remoteSource.getComponentContent("test-pack", "modes", "missing"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.getComponentContent("test-pack", "modes", "missing");
      } catch (error) {
        expect((error as ZccError).code).toBe("COMPONENT_NOT_FOUND");
      }
    });
  });

  describe("caching", () => {
    it("should respect cache TTL for manifests", async () => {
      // Use very short TTL for this test
      const shortTtlSource = new RemotePackSource({
        ...sourceInfo,
        cacheTtl: 100 // 100ms
      }, httpAdapter);

      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // First load
      await shortTtlSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);

      // Immediate second load should use cache
      httpAdapter.clearRequests();
      await shortTtlSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(0);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third load should fetch again
      await shortTtlSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);
    });

    it("should clear expired cache entries", async () => {
      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // Load to populate cache
      await remoteSource.loadPack("test-pack");

      // Clear expired cache (should not clear since TTL is 1 minute)
      remoteSource.clearExpiredCache();

      // Should still use cache
      httpAdapter.clearRequests();
      await remoteSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(0);
    });

    it("should clear all cache entries", async () => {
      const manifestUrl = "https://example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // Load to populate cache
      await remoteSource.loadPack("test-pack");

      // Clear all cache
      remoteSource.clearAllCache();

      // Should fetch again
      httpAdapter.clearRequests();
      await remoteSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle HTTP server errors", async () => {
      const manifestUrl = "https://example.com/packs/server-error/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 500,
        data: "Internal Server Error"
      });

      await expect(remoteSource.loadPack("server-error"))
        .rejects.toThrow(ZccError);

      try {
        await remoteSource.loadPack("server-error");
      } catch (error) {
        expect((error as ZccError).code).toBe("REMOTE_FETCH_ERROR");
      }
    });

    it("should handle timeout errors", async () => {
      const manifestUrl = "https://example.com/packs/slow-pack/manifest.json";
      httpAdapter.mockDelay(manifestUrl, 1500);
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // Mock the HTTP adapter to use a shorter timeout
      const requestSpy = jest.spyOn(httpAdapter, 'request');
      requestSpy.mockImplementation(async (url: string, options: any) => {
        if (url === manifestUrl) {
          throw new Error('Request timeout after 1000ms');
        }
        return httpAdapter.request(url, options);
      });

      await expect(remoteSource.loadPack("slow-pack"))
        .rejects.toThrow('Request timeout');
      
      requestSpy.mockRestore();
    });
  });
});