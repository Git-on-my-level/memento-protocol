/**
 * Remote pack source implementation - stub for testing
 */

import { IPackSource } from "./PackSource";
import { PackStructure } from "../types/packs";

export class RemotePackSource implements IPackSource {
  constructor(private baseUrl: string) {}

  async listPacks(): Promise<PackStructure[]> {
    return [];
  }

  async getPack(name: string): Promise<PackStructure | null> {
    return null;
  }

  clearExpiredCache(): void {
    // Stub implementation
  }

  clearAllCache(): void {
    // Stub implementation
  }
}