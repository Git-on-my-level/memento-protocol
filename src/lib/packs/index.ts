/**
 * Pack management system for zcc
 * 
 * This module provides pack management capabilities including:
 * - Local pack sources (built-in starter packs)
 * - Pack registry with source management
 * - Validation and installation
 * 
 * Note: Remote and GitHub pack sources are planned for Phase 2
 */

// Core interfaces and base classes
export { IPackSource } from './PackSource';
export { LocalPackSource } from './PackSource';

// Remote pack sources - Phase 2 implementation
// TODO: Add RemotePackSource and GitHubPackSource when implementing remote pack support

// Pack registry and management
export { PackRegistry } from './PackRegistry';

// Validation and utilities
export { PackValidator } from './PackValidator';

// Re-export types for convenience
export * from '../types/packs';