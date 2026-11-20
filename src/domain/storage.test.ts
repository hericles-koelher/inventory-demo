import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoInventory } from './demo-data.ts';
import { INVENTORY_STORAGE_KEY, loadInventory, readStoredInventory, saveInventory } from './storage.ts';

const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function setLocalStorage(value: unknown): void {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value });
}

function restoreLocalStorage(): void {
  if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  else Reflect.deleteProperty(globalThis, 'localStorage');
}

test('missing key starts from a fresh demo inventory and is ready to save', () => {
  setLocalStorage({ getItem: () => null, setItem: () => undefined });
  try {
    const first = loadInventory();
    const second = loadInventory();
    assert.equal(first.storageStatus, 'ready');
    assert.equal(first.inventory.products.length, 12);
    first.inventory.products.pop();
    assert.equal(second.inventory.products.length, 12);
  } finally {
    restoreLocalStorage();
  }
});

test('save and load round-trip the versioned inventory record', () => {
  const values = new Map<string, string>();
  setLocalStorage({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  try {
    const inventory = createDemoInventory();
    assert.equal(saveInventory(inventory), true);
    assert.ok(values.has(INVENTORY_STORAGE_KEY));
    assert.deepEqual(loadInventory(), { inventory, storageStatus: 'ready' });
    assert.deepEqual(readStoredInventory(values.get(INVENTORY_STORAGE_KEY)!), inventory);
  } finally {
    restoreLocalStorage();
  }
});

test('corrupt or invalid stored records recover to demo data without clearing storage', () => {
  let stored = '{bad json';
  let writes = 0;
  setLocalStorage({ getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; writes += 1; } });
  try {
    const corrupt = loadInventory();
    assert.equal(corrupt.storageStatus, 'invalid');
    assert.equal(corrupt.inventory.products.length, 12);
    assert.equal(stored, '{bad json');
    assert.equal(writes, 0);

    stored = JSON.stringify({ version: 1, inventory: { products: [{ id: 'x', name: '', sku: 'X', category: 'C', quantity: 0, minimum: 0 }], movements: [] } });
    assert.equal(loadInventory().storageStatus, 'invalid');
    assert.equal(readStoredInventory(stored), null);

    const paddedSkuInventory = createDemoInventory();
    paddedSkuInventory.products[0].sku = ' EMB-001 ';
    stored = JSON.stringify({ version: 1, inventory: paddedSkuInventory });
    assert.equal(readStoredInventory(stored), null);
    assert.equal(loadInventory().storageStatus, 'invalid');

    const replacement = createDemoInventory();
    assert.equal(saveInventory(replacement), true);
    assert.equal(loadInventory().storageStatus, 'ready');
  } finally {
    restoreLocalStorage();
  }
});

test('unavailable localStorage provides session demo state and failed writes return false', () => {
  setLocalStorage({
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  });
  try {
    const result = loadInventory();
    assert.equal(result.storageStatus, 'unavailable');
    assert.equal(result.inventory.products.length, 12);
    assert.equal(saveInventory(result.inventory), false);
  } finally {
    restoreLocalStorage();
  }

  setLocalStorage(undefined);
  try {
    assert.equal(loadInventory().storageStatus, 'unavailable');
  } finally {
    restoreLocalStorage();
  }
});
