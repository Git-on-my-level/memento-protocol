/**
 * Simple test data factories for Memento Protocol tests
 * 
 * These functions create common test objects with sensible defaults
 * that can be overridden as needed. No complex builder patterns,
 * just simple functions that return plain objects.
 */

import { ComponentInfo } from '../MementoScope';

// Define types inline to avoid complex imports
interface PackManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  mementoProtocolVersion?: string;
  components: {
    modes: Array<{ name: string; required: boolean }>;
    workflows: Array<{ name: string; required: boolean }>;
    agents: Array<{ name: string; required: boolean }>;
  };
  [key: string]: any;
}

interface PackStructure {
  manifest: PackManifest;
  path: string;
  componentsPath: string;
}

interface MementoConfig {
  defaultMode?: string;
  preferredWorkflows?: string[];
  ui?: {
    colorOutput?: boolean;
    verboseLogging?: boolean;
  };
  [key: string]: any;
}

interface TicketInfo {
  name: string;
  status: 'next' | 'in-progress' | 'done';
  description?: string;
  [key: string]: any;
}

/**
 * Create test component data
 */
export function createTestComponent(overrides?: Partial<ComponentInfo>): ComponentInfo {
  return {
    name: 'test-component',
    type: 'mode',
    path: '/templates/modes/test-component.md',
    metadata: {
      description: 'Test component description',
      author: 'test',
      version: '1.0.0',
      tags: []
    },
    ...overrides
  };
}

/**
 * Create test pack manifest
 */
export function createTestPackManifest(overrides?: Partial<PackManifest>): PackManifest {
  return {
    name: 'test-pack',
    version: '1.0.0',
    description: 'Test starter pack',
    author: 'test-author',
    mementoProtocolVersion: '>=0.9.0',
    components: {
      modes: [],
      workflows: [],
      agents: []
    },
    ...overrides
  };
}

/**
 * Create test pack structure
 */
export function createTestPackStructure(overrides?: Partial<PackStructure>): PackStructure {
  const manifest = overrides?.manifest || createTestPackManifest();
  return {
    manifest,
    path: '/packs/test-pack',
    componentsPath: '/packs/test-pack/components',
    ...overrides
  };
}

/**
 * Create test configuration
 */
export function createTestConfig(overrides?: Partial<MementoConfig>): MementoConfig {
  return {
    defaultMode: 'engineer',
    preferredWorkflows: ['review'],
    ui: {
      colorOutput: true,
      verboseLogging: false
    },
    ...overrides
  };
}

/**
 * Create test ticket info
 */
export function createTestTicket(overrides?: Partial<TicketInfo>): TicketInfo {
  return {
    name: 'test-ticket',
    status: 'next',
    description: 'Test ticket description',
    ...overrides
  };
}

/**
 * Create multiple test components with variations
 */
export function createTestComponents(count: number, typeOverride?: 'mode' | 'workflow' | 'agent'): ComponentInfo[] {
  const type = typeOverride || 'mode';
  return Array.from({ length: count }, (_, i) => ({
    name: `test-${type}-${i + 1}`,
    type,
    path: `/templates/${type}s/test-${type}-${i + 1}.md`,
    metadata: {
      description: `Test ${type} ${i + 1}`,
      author: 'test',
      version: '1.0.0',
      tags: [`test`, type]
    }
  }));
}