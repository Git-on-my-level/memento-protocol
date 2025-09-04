import { PackRegistry } from "../PackRegistry";
import { RemotePackSource } from "../RemotePackSource";
import { GitHubPackSource } from "../GitHubPackSource";
import { 
  PackManifest, 
  RemotePackSource as RemotePackSourceInterface,
  GitHubPackSource as GitHubPackSourceInterface
} from "../../types/packs";
import { MockHttpAdapter } from "../../adapters/__tests__/MockHttpAdapter";
import { createTestFileSystem } from "../../testing";
import { MemoryFileSystemAdapter } from "../../adapters/MemoryFileSystemAdapter";

// Mock logger to prevent console output during tests
jest.mock("../../logger");

describe("PackRegistry - Remote Sources", () => {
  let registry: PackRegistry;
  let httpAdapter: MockHttpAdapter;
  let fs: MemoryFileSystemAdapter;

  const validManifest: PackManifest = {
    name: "remote-pack",
    version: "2.0.0", 
    description: "Test remote pack",
    author: "remote-author",
    components: {
      modes: [{ name: "remote-mode", required: true }]
    },
    category: "general"
  };

  const githubManifest: PackManifest = {
    name: "github-pack",
    version: "1.5.0",
    description: "Test GitHub pack",
    author: "github-author", 
    components: {
      modes: [{ name: "github-mode", required: true }],
      workflows: [{ name: "github-workflow", required: false }]
    },
    category: "frontend"
  };

  // Helper to create GitHub API file response
  const createGitHubFileResponse = (content: string) => ({
    type: "file",
    content: Buffer.from(content).toString('base64'),
    sha: "abc123"
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    httpAdapter = new MockHttpAdapter();
    
    // Create test filesystem - skip local filesystem for these tests
    // since we're focusing on remote functionality
    fs = await createTestFileSystem({});
    registry = new PackRegistry(fs);
  });

  afterEach(() => {
    httpAdapter.clearMocks();
    httpAdapter.clearRequests();
  });

  describe("registerRemoteSource", () => {
    it("should register a remote pack source", () => {
      const sourceInfo: RemotePackSourceInterface = {
        name: "test-remote",
        type: "remote", 
        url: "https://example.com/packs"
      };

      registry.registerRemoteSource("test-remote", sourceInfo);

      const source = registry.getSource("test-remote");
      expect(source).toBeInstanceOf(RemotePackSource);
      expect((source as RemotePackSource)?.getRemoteSourceInfo()).toEqual(sourceInfo);
    });

    it("should register remote source with auth token and cache TTL", () => {
      const sourceInfo: RemotePackSourceInterface = {
        name: "secure-remote",
        type: "remote",
        url: "https://secure.example.com/packs",
        authToken: "bearer-token-123",
        cacheTtl: 300000
      };

      registry.registerRemoteSource("secure-remote", sourceInfo);

      const source = registry.getSource("secure-remote");
      expect((source as RemotePackSource)?.getRemoteSourceInfo()).toEqual(sourceInfo);
    });
  });

  describe("registerGitHubSource", () => {
    it("should register a GitHub pack source", () => {
      const sourceInfo: GitHubPackSourceInterface = {
        name: "test-github",
        type: "github",
        owner: "test-owner",
        repo: "test-repo",
        branch: "main"
      };

      registry.registerGitHubSource("test-github", sourceInfo);

      const source = registry.getSource("test-github");
      expect(source).toBeInstanceOf(GitHubPackSource);
      expect((source as GitHubPackSource)?.getGitHubSourceInfo()).toEqual(sourceInfo);
    });
  });

  describe("registerGitHubFromUrl", () => {
    it("should register GitHub source from HTTPS URL", () => {
      registry.registerGitHubFromUrl(
        "github-https", 
        "https://github.com/owner/repo",
        { branch: "develop", authToken: "token123" }
      );

      const source = registry.getSource("github-https");
      expect(source).toBeInstanceOf(GitHubPackSource);
      
      const sourceInfo = (source as GitHubPackSource)?.getGitHubSourceInfo();
      expect(sourceInfo.owner).toBe("owner");
      expect(sourceInfo.repo).toBe("repo");
      expect(sourceInfo.branch).toBe("develop");
      expect(sourceInfo.authToken).toBe("token123");
    });

    it("should register GitHub source from github: format", () => {
      registry.registerGitHubFromUrl("github-short", "github:user/project");

      const source = registry.getSource("github-short");
      const sourceInfo = (source as GitHubPackSource)?.getGitHubSourceInfo();
      expect(sourceInfo.owner).toBe("user");
      expect(sourceInfo.repo).toBe("project");
    });

    it("should register GitHub source from SSH format", () => {
      registry.registerGitHubFromUrl("github-ssh", "git@github.com:company/app.git");

      const source = registry.getSource("github-ssh");
      const sourceInfo = (source as GitHubPackSource)?.getGitHubSourceInfo();
      expect(sourceInfo.owner).toBe("company");
      expect(sourceInfo.repo).toBe("app");
    });

    it("should throw error for invalid GitHub URL", () => {
      expect(() => {
        registry.registerGitHubFromUrl("invalid", "https://gitlab.com/owner/repo");
      }).toThrow("Invalid GitHub URL format");
    });
  });

  describe("registerFromUrl", () => {
    it("should auto-detect and register GitHub URLs", () => {
      registry.registerFromUrl("auto-github", "https://github.com/auto/detect");

      const source = registry.getSource("auto-github");
      expect(source).toBeInstanceOf(GitHubPackSource);
    });

    it("should register non-GitHub URLs as remote sources", () => {
      registry.registerFromUrl("auto-remote", "https://packs.example.com");

      const source = registry.getSource("auto-remote");
      expect(source).toBeInstanceOf(RemotePackSource);
    });
  });

  describe("loadPack from remote sources", () => {
    it("should load pack from remote source", async () => {
      // Setup remote source
      const sourceInfo: RemotePackSourceInterface = {
        name: "test-remote",
        type: "remote",
        url: "https://example.com/packs"
      };

      // Mock HTTP response
      const manifestUrl = "https://example.com/packs/remote-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      // Create remote source with our mock HTTP adapter
      const remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
      registry.registerSource("test-remote", remoteSource);

      const pack = await registry.loadPack("remote-pack", "test-remote");

      expect(pack.manifest).toEqual(validManifest);
      expect(httpAdapter.getRequests()).toHaveLength(1);
    });

    it("should load pack from GitHub source", async () => {
      // Setup GitHub source
      const sourceInfo: GitHubPackSourceInterface = {
        name: "test-github",
        type: "github", 
        owner: "test-owner",
        repo: "test-repo",
        branch: "main"
      };

      // Mock GitHub API response
      const apiUrl = "https://api.github.com/repos/test-owner/test-repo/contents/github-pack/manifest.json?ref=main";
      httpAdapter.mockResponse(apiUrl, {
        status: 200,
        data: JSON.stringify(createGitHubFileResponse(JSON.stringify(githubManifest)))
      });

      // Create GitHub source with our mock HTTP adapter
      const githubSource = new GitHubPackSource(sourceInfo, httpAdapter);
      registry.registerSource("test-github", githubSource);

      const pack = await registry.loadPack("github-pack", "test-github");

      expect(pack.manifest).toEqual(githubManifest);
      expect(httpAdapter.getRequests()).toHaveLength(1);
    });

    it("should search all sources when no preferred source specified", async () => {
      // Setup both local and remote sources
      const sourceInfo: RemotePackSourceInterface = {
        name: "search-remote",
        type: "remote",
        url: "https://example.com/packs"
      };

      const manifestUrl = "https://example.com/packs/remote-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 200,
        data: JSON.stringify(validManifest)
      });

      const remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
      registry.registerSource("search-remote", remoteSource);

      // Should find the pack in the remote source
      const pack = await registry.loadPack("remote-pack");

      expect(pack.manifest.name).toBe("remote-pack");
    });
  });

  describe("listAvailablePacks from remote sources", () => {
    it("should list packs from all sources including remote", async () => {
      // Setup remote source with index
      const sourceInfo: RemotePackSourceInterface = {
        name: "list-remote",
        type: "remote",
        url: "https://example.com/packs"
      };

      const indexUrl = "https://example.com/packs/index.json";
      httpAdapter.mockResponse(indexUrl, {
        status: 200,
        data: JSON.stringify({ packs: ["remote-pack-1", "remote-pack-2"] })
      });

      // Mock manifest requests for remote packs
      const manifest1Url = "https://example.com/packs/remote-pack-1/manifest.json";
      const manifest2Url = "https://example.com/packs/remote-pack-2/manifest.json";
      
      httpAdapter.mockResponse(manifest1Url, {
        status: 200,
        data: JSON.stringify({ ...validManifest, name: "remote-pack-1" })
      });

      httpAdapter.mockResponse(manifest2Url, {
        status: 200,
        data: JSON.stringify({ ...validManifest, name: "remote-pack-2" })
      });

      const remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
      registry.registerSource("list-remote", remoteSource);

      const packs = await registry.listAvailablePacks();

      // Should include remote packs
      const packNames = packs.map(p => p.manifest.name);
      expect(packNames).toContain("remote-pack-1");
      expect(packNames).toContain("remote-pack-2");
    });
  });

  describe("cache management", () => {
    it("should clear expired caches from remote sources", () => {
      const sourceInfo: RemotePackSourceInterface = {
        name: "cache-remote",
        type: "remote",
        url: "https://example.com/packs"
      };

      const remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
      const clearSpy = jest.spyOn(remoteSource, 'clearExpiredCache');
      
      registry.registerSource("cache-remote", remoteSource);
      registry.clearExpiredCaches();

      expect(clearSpy).toHaveBeenCalled();
    });

    it("should clear all caches from remote sources", () => {
      const remoteInfo: RemotePackSourceInterface = {
        name: "cache-remote",
        type: "remote", 
        url: "https://example.com/packs"
      };

      const githubInfo: GitHubPackSourceInterface = {
        name: "cache-github",
        type: "github",
        owner: "test",
        repo: "test"
      };

      const remoteSource = new RemotePackSource(remoteInfo, httpAdapter);
      const githubSource = new GitHubPackSource(githubInfo, httpAdapter);
      
      const remoteClearSpy = jest.spyOn(remoteSource, 'clearAllCache');
      const githubClearSpy = jest.spyOn(githubSource, 'clearAllCache');

      registry.registerSource("cache-remote", remoteSource);
      registry.registerSource("cache-github", githubSource);
      registry.clearAllCaches();

      expect(remoteClearSpy).toHaveBeenCalled();
      expect(githubClearSpy).toHaveBeenCalled();
    });
  });

  describe("URL parsing", () => {
    it("should parse various GitHub URL formats", () => {
      const testCases = [
        { url: "https://github.com/owner/repo", expected: { owner: "owner", repo: "repo" } },
        { url: "https://github.com/owner/repo.git", expected: { owner: "owner", repo: "repo" } },
        { url: "https://github.com/owner/repo/", expected: { owner: "owner", repo: "repo" } },
        { url: "github:owner/repo", expected: { owner: "owner", repo: "repo" } },
        { url: "git@github.com:owner/repo.git", expected: { owner: "owner", repo: "repo" } }
      ];

      for (const testCase of testCases) {
        try {
          registry.registerGitHubFromUrl("test", testCase.url);
          const source = registry.getSource("test");
          const sourceInfo = (source as GitHubPackSource)?.getGitHubSourceInfo();
          
          expect(sourceInfo.owner).toBe(testCase.expected.owner);
          expect(sourceInfo.repo).toBe(testCase.expected.repo);
        } catch (error) {
          fail(`Failed to parse URL: ${testCase.url} - ${error}`);
        }
      }
    });

    it("should reject non-GitHub URLs for GitHub parsing", () => {
      const invalidUrls = [
        "https://gitlab.com/owner/repo",
        "https://bitbucket.org/owner/repo", 
        "https://example.com/git/repo",
        "invalid-url",
        ""
      ];

      for (const url of invalidUrls) {
        expect(() => {
          registry.registerGitHubFromUrl("test", url);
        }).toThrow("Invalid GitHub URL format");
      }
    });
  });

  describe("error handling", () => {
    it("should handle remote source errors gracefully", async () => {
      const sourceInfo: RemotePackSourceInterface = {
        name: "error-remote",
        type: "remote",
        url: "https://example.com/packs"
      };

      const manifestUrl = "https://example.com/packs/error-pack/manifest.json";
      httpAdapter.mockResponse(manifestUrl, {
        status: 500,
        data: "Internal Server Error"
      });

      const remoteSource = new RemotePackSource(sourceInfo, httpAdapter);
      registry.registerSource("error-remote", remoteSource);

      await expect(registry.loadPack("error-pack", "error-remote"))
        .rejects.toThrow();
    });

    it("should fall back to other sources when preferred source fails", async () => {
      // Setup failing remote source
      const failingInfo: RemotePackSourceInterface = {
        name: "failing-remote",
        type: "remote",
        url: "https://fail.example.com/packs"
      };

      const failingUrl = "https://fail.example.com/packs/test-pack/manifest.json";
      httpAdapter.mockResponse(failingUrl, {
        status: 500,
        data: "Server Error"
      });

      // Setup working remote source
      const workingInfo: RemotePackSourceInterface = {
        name: "working-remote", 
        type: "remote",
        url: "https://work.example.com/packs"
      };

      const workingUrl = "https://work.example.com/packs/remote-pack/manifest.json";
      httpAdapter.mockResponse(workingUrl, {
        status: 200,
        data: JSON.stringify({ ...validManifest, name: "remote-pack" })
      });

      const failingSource = new RemotePackSource(failingInfo, httpAdapter);
      const workingSource = new RemotePackSource(workingInfo, httpAdapter);
      
      registry.registerSource("failing-remote", failingSource);
      registry.registerSource("working-remote", workingSource);

      // Should find the pack in working source even though failing source is tried first
      const pack = await registry.loadPack("remote-pack");
      expect(pack.manifest.name).toBe("remote-pack");
    });
  });
});