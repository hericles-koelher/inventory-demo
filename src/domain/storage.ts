import { createDemoInventory } from './demo-data.ts';
import type { Inventory } from './inventory.ts';

export const INVENTORY_STORAGE_KEY = 'inventory-demo:v1';
const STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonemptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalText(value: unknown): value is string {
  return isNonemptyText(value) && value === value.trim();
}

function isSafeWholeNumber(value: unknown, allowZero: boolean): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1);
}

function isInventory(value: unknown): value is Inventory {
  if (!isRecord(value) || !Array.isArray(value.products) || !Array.isArray(value.movements)) return false;
  const productIds = new Set<string>();
  const skus = new Set<string>();
  for (const candidate of value.products) {
    if (!isRecord(candidate) || !isCanonicalText(candidate.id) || !isCanonicalText(candidate.name)
      || !isCanonicalText(candidate.sku) || !isCanonicalText(candidate.category)
      || !isSafeWholeNumber(candidate.quantity, true) || !isSafeWholeNumber(candidate.minimum, true)) return false;
    const skuKey = candidate.sku.toLocaleLowerCase('pt-BR');
    if (productIds.has(candidate.id) || skus.has(skuKey)) return false;
    productIds.add(candidate.id);
    skus.add(skuKey);
  }
  const movementIds = new Set<string>();
  for (const candidate of value.movements) {
    if (!isRecord(candidate) || !isCanonicalText(candidate.id) || !isCanonicalText(candidate.productId)
      || !isCanonicalText(candidate.productName) || !isCanonicalText(candidate.productSku)
      || (candidate.type !== 'inbound' && candidate.type !== 'outbound')
      || !isSafeWholeNumber(candidate.quantity, false) || typeof candidate.occurredAt !== 'string'
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(candidate.occurredAt)
      || !Number.isFinite(Date.parse(candidate.occurredAt))) return false;
    if (movementIds.has(candidate.id)) return false;
    movementIds.add(candidate.id);
  }
  return true;
}

function parseRecord(serialized: string): Inventory | null {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== STORAGE_VERSION || !isInventory(value.inventory)) return null;
    return value.inventory;
  } catch {
    return null;
  }
}

export function readStoredInventory(serialized: string): Inventory | null {
  return parseRecord(serialized);
}

export function loadInventory(): { inventory: Inventory; storageStatus: 'ready' | 'unavailable' | 'invalid' } {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return { inventory: createDemoInventory(), storageStatus: 'unavailable' };
    }
    const serialized = globalThis.localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (serialized === null) return { inventory: createDemoInventory(), storageStatus: 'ready' };
    const inventory = parseRecord(serialized);
    return inventory
      ? { inventory, storageStatus: 'ready' }
      : { inventory: createDemoInventory(), storageStatus: 'invalid' };
  } catch {
    return { inventory: createDemoInventory(), storageStatus: 'unavailable' };
  }
}

export function saveInventory(inventory: Inventory): boolean {
  try {
    globalThis.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, inventory }));
    return true;
  } catch {
    return false;
  }
}
