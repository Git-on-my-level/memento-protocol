import { GitHubPackSource } from "../GitHubPackSource";
import { PackManifest, GitHubPackSource as GitHubPackSourceInterface } from "../../types/packs";
import { MockHttpAdapter } from "../../adapters/__tests__/MockHttpAdapter";
import { ZccError } from "../../errors";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("GitHubPackSource", () => {
  let githubSource: GitHubPackSource;
  let httpAdapter: MockHttpAdapter;
  const sourceInfo: GitHubPackSourceInterface = {
    name: "test-github",
    type: "github",
    owner: "test-owner",
    repo: "test-repo",
    branch: "main",
    cacheTtl: 60000 // 1 minute for testing
  };

  const validManifest: PackManifest = {
    name: "github-pack",
    version: "1.2.0",
    description: "Test starter pack from GitHub",
    author: "github-author",
    components: {
      modes: [{ name: "architect", required: true }],
      workflows: [{ name: "deploy", required: false }]
    },
    category: "backend"
  };

  // GitHub API response for file content
  const createGitHubFileResponse = (content: string) => ({
    type: "file",
    content: Buffer.from(content).toString('base64'),
    sha: "abc123",
    size: content.length,
    name: "manifest.json"
  });

  beforeEach(() => {
    httpAdapter = new MockHttpAdapter();
    githubSource = new GitHubPackSource(sourceInfo, httpAdapter);
  });

  afterEach(() => {
    httpAdapter.clearMocks();
    httpAdapter.clearRequests();
    githubSource.clearAllCache();
  });

  describe("constructor", () => {
    it("should initialize with GitHub source info", () => {
      expect(githubSource.getGitHubSourceInfo()).toEqual(sourceInfo);
    });

    it("should use default branch 'main' when not specified", () => {
      const sourceWithoutBranch: GitHubPackSourceInterface = {
        ...sourceInfo,
        branch: undefined
      };
      const source = new GitHubPackSource(sourceWithoutBranch, httpAdapter);
      expect(source.getGitHubSourceInfo().branch).toBeUndefined(); // Source info unchanged
    });
  });

  describe("loadPack", () => {
    it("should load a pack using GitHub API", async () => {
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/github-pack/manifest.json?ref=main";
      
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      const pack = await githubSource.loadPack("github-pack");

      expect(pack.manifest).toEqual(validManifest);
      expect(pack.path).toBe("https://github.com/test-owner/test-repo/tree/main/github-pack");
      expect(pack.componentsPath).toBe("https://github.com/test-owner/test-repo/tree/main/github-pack/components");

      // Verify correct API request
      const requests = httpAdapter.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe(apiUrl);
      expect(requests[0].options?.headers?.Accept).toBe("application/vnd.github.v3+json");
      expect(requests[0].options?.headers?.["User-Agent"]).toBe("zcc/1.0.0");
    });

    it("should include authentication token in GitHub API requests", async () => {
      const sourceWithAuth: GitHubPackSourceInterface = {
        ...sourceInfo,
        authToken: "github-token-123"
      };
      const authenticatedSource = new GitHubPackSource(sourceWithAuth, httpAdapter);

      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/github-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      await authenticatedSource.loadPack("github-pack");

      const requests = httpAdapter.getRequests();
      expect(requests[0].options?.headers?.Authorization).toBe("token github-token-123");
    });

    it("should use cached manifest when available", async () => {
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/github-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      // First load
      await githubSource.loadPack("github-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);

      // Second load should use cache
      httpAdapter.clearRequests();
      const pack = await githubSource.loadPack("github-pack");

      expect(pack.manifest).toEqual(validManifest);
      expect(httpAdapter.getRequests()).toHaveLength(0);
    });

    it("should throw error for non-existent pack", async () => {
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/missing-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(apiUrl, {
        status: 404,
        data: JSON.stringify({
          message: "Not Found",
          documentation_url: "https://docs.github.com/rest"
        })
      });

      await expect(githubSource.loadPack("missing-pack"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.loadPack("missing-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("PACK_NOT_FOUND");
        expect((error as Error).message).toContain("missing-pack");
      }
    });

    it("should throw error for invalid GitHub API response", async () => {
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/invalid-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify({
          type: "dir", // Should be "file"
          name: "manifest.json"
        })
      });

      await expect(githubSource.loadPack("invalid-pack"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.loadPack("invalid-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("INVALID_API_RESPONSE");
      }
    });

    it("should throw error for invalid JSON in manifest", async () => {
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/bad-json/manifest.json?ref=main";
      const invalidJson = "{ invalid json }";
      
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(invalidJson))
      });

      await expect(githubSource.loadPack("bad-json"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.loadPack("bad-json");
      } catch (error) {
        expect((error as ZccError).code).toBe("INVALID_JSON");
      }
    });
  });

  describe("listPacks", () => {
    it("should list packs using GitHub API", async () => {
      const contentsUrl = "https://api.github.com/repos/test-owner/test-repo/contents?ref=main";
      
      // Mock repository contents
      const repoContents = [
        {
          name: "pack-1",
          type: "dir",
          path: "pack-1"
        },
        {
          name: "pack-2", 
          type: "dir",
          path: "pack-2"
        },
        {
          name: "README.md",
          type: "file",
          path: "README.md"
        }
      ];

      httpAdapter.mockResponse(contentsUrl, {
        status: 200,
        data: JSON.stringify(repoContents)
      });

      // Mock manifest checks for directories
      const manifest1Url = "https://api.github.com/repos/test-owner/test-repo/contents/pack-1/manifest.json?ref=main";
      const manifest2Url = "https://api.github.com/repos/test-owner/test-repo/contents/pack-2/manifest.json?ref=main";

      httpAdapter.mockResponse(manifest1Url, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      httpAdapter.mockResponse(manifest2Url, {
        status: 404,
        data: JSON.stringify({ message: "Not Found" })
      });

      const packs = await githubSource.listPacks();

      expect(packs).toEqual(["pack-1"]); // Only pack-1 has manifest
      
      const requests = httpAdapter.getRequests();
      expect(requests).toHaveLength(3); // contents + 2 manifest checks
    });

    it("should handle empty repository", async () => {
      const contentsUrl = "https://api.github.com/repos/test-owner/test-repo/contents?ref=main";
      
      httpAdapter.mockResponse(contentsUrl, {
        status: 200,
        data: JSON.stringify([])
      });

      const packs = await githubSource.listPacks();

      expect(packs).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      const contentsUrl = "https://api.github.com/repos/test-owner/test-repo/contents?ref=main";
      
      httpAdapter.mockResponse(contentsUrl, {
        status: 403,
        data: JSON.stringify({
          message: "API rate limit exceeded",
          documentation_url: "https://docs.github.com/rest"
        })
      });

      const packs = await githubSource.listPacks();

      expect(packs).toEqual([]);
    });
  });

  describe("hasComponent", () => {
    it("should check component existence using GitHub API", async () => {
      const componentUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/modes/architect.md?ref=main";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse("# Architect Mode"))
      });

      const exists = await githubSource.hasComponent("test-pack", "modes", "architect");

      expect(exists).toBe(true);
      
      const requests = httpAdapter.getRequests();
      expect(requests[0].url).toBe(componentUrl);
    });

    it("should return false for non-existent components", async () => {
      const componentUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/modes/missing.md?ref=main";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 404,
        data: JSON.stringify({ message: "Not Found" })
      });

      const exists = await githubSource.hasComponent("test-pack", "modes", "missing");

      expect(exists).toBe(false);
    });

    it("should handle hook components with JSON extension", async () => {
      const hookUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/hooks/git-hook.json?ref=main";
      
      httpAdapter.mockResponse(hookUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse('{"name": "git-hook"}'))
      });

      const exists = await githubSource.hasComponent("test-pack", "hooks", "git-hook");

      expect(exists).toBe(true);
      expect(httpAdapter.getLastRequest()?.url).toBe(hookUrl);
    });
  });

  describe("getComponentPath", () => {
    it("should return raw GitHub URLs for components", async () => {
      const modePath = await githubSource.getComponentPath("test-pack", "modes", "architect");
      expect(modePath).toBe("https://raw.githubusercontent.com/test-owner/test-repo/main/test-pack/components/modes/architect.md");

      const workflowPath = await githubSource.getComponentPath("test-pack", "workflows", "deploy");
      expect(workflowPath).toBe("https://raw.githubusercontent.com/test-owner/test-repo/main/test-pack/components/workflows/deploy.md");

      const hookPath = await githubSource.getComponentPath("test-pack", "hooks", "git-hook");
      expect(hookPath).toBe("https://raw.githubusercontent.com/test-owner/test-repo/main/test-pack/components/hooks/git-hook.json");
    });
  });

  describe("getComponentContent", () => {
    it("should fetch component content from GitHub API", async () => {
      const componentUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/modes/architect.md?ref=main";
      const content = "# Architect Mode\nYou are a software architect.";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(content))
      });

      const result = await githubSource.getComponentContent("test-pack", "modes", "architect");

      expect(result).toBe(content);
      
      const requests = httpAdapter.getRequests();
      expect(requests[0].url).toBe(componentUrl);
    });

    it("should cache component content", async () => {
      const componentUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/modes/architect.md?ref=main";
      const content = "# Architect Mode";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(content))
      });

      // First call
      await githubSource.getComponentContent("test-pack", "modes", "architect");
      expect(httpAdapter.getRequests()).toHaveLength(1);

      // Second call should use cache
      httpAdapter.clearRequests();
      const cachedResult = await githubSource.getComponentContent("test-pack", "modes", "architect");

      expect(cachedResult).toBe(content);
      expect(httpAdapter.getRequests()).toHaveLength(0);
    });

    it("should throw error for non-existent components", async () => {
      const componentUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/components/modes/missing.md?ref=main";
      
      httpAdapter.mockResponse(componentUrl, {
        status: 404,
        data: JSON.stringify({ message: "Not Found" })
      });

      await expect(githubSource.getComponentContent("test-pack", "modes", "missing"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.getComponentContent("test-pack", "modes", "missing");
      } catch (error) {
        expect((error as ZccError).code).toBe("COMPONENT_NOT_FOUND");
      }
    });
  });

  describe("caching", () => {
    it("should clear expired cache entries", async () => {
      const manifestUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      // Load to populate cache
      await githubSource.loadPack("test-pack");

      // Clear expired cache (shouldn't clear since TTL is 1 minute)
      githubSource.clearExpiredCache();

      // Should still use cache
      httpAdapter.clearRequests();
      await githubSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(0);
    });

    it("should clear all cache entries", async () => {
      const manifestUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(validManifest)))
      });

      // Load to populate cache
      await githubSource.loadPack("test-pack");

      // Clear all cache
      githubSource.clearAllCache();

      // Should fetch again
      httpAdapter.clearRequests();
      await githubSource.loadPack("test-pack");
      expect(httpAdapter.getRequests()).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle GitHub API rate limiting", async () => {
      const manifestUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/manifest.json?ref=main";
      
      httpAdapter.mockResponse(manifestUrl, {
        status: 403,
        data: JSON.stringify({
          message: "API rate limit exceeded for user",
          documentation_url: "https://docs.github.com/rest"
        })
      });

      await expect(githubSource.loadPack("test-pack"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.loadPack("test-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("GITHUB_FETCH_ERROR");
      }
    });

    it("should handle network errors", async () => {
      const manifestUrl = "https://api.github.com/repos/test-owner/test-repo/contents/test-pack/manifest.json?ref=main";
      
      httpAdapter.mockError(manifestUrl, new Error("Connection refused"));

      await expect(githubSource.loadPack("test-pack"))
        .rejects.toThrow(ZccError);

      try {
        await githubSource.loadPack("test-pack");
      } catch (error) {
        expect((error as ZccError).code).toBe("PACK_LOAD_ERROR");
      }
    });
  });
});