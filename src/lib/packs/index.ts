/**
 * Pack management system for zcc
 * 
 * This module provides comprehensive pack management capabilities including:
 * - Local pack sources (built-in starter packs)
 * - Remote pack sources (HTTP/HTTPS endpoints)
 * - GitHub pack sources (GitHub repositories)
 * - Pack registry with source management
 * - Validation and installation
 */

// Core interfaces and base classes
export { IPackSource } from './PackSource';
export { LocalPackSource } from './PackSource';

// Remote pack sources
export { RemotePackSource } from './RemotePackSource';
export { GitHubPackSource } from './GitHubPackSource';

// Pack registry and management
export { PackRegistry } from './PackRegistry';

// Validation and utilities
export { PackValidator } from './PackValidator';

// Re-export types for convenience
export * from '../types/packs';