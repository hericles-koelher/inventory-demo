import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InventoryError,
  createProduct,
  deleteProduct,
  getStockStatus,
  recordMovement,
  updateProduct,
} from './inventory.ts';
import type { Inventory } from './inventory.ts';
import { createDemoInventory } from './demo-data.ts';

const details = { name: '  Produto novo ', sku: ' sku-novo ', category: ' Geral ', minimum: 2 };

function assertInventoryError(run: () => unknown, field: InventoryError['field']): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof InventoryError);
    assert.equal(error.field, field);
    assert.match(error.message, /./);
    return true;
  });
}

test('stock status distinguishes zero from the minimum threshold', () => {
  const product = { id: 'p', name: 'X', sku: 'X', category: 'X', quantity: 0, minimum: 0 };
  assert.equal(getStockStatus(product), 'empty');
  assert.equal(getStockStatus({ ...product, quantity: 4, minimum: 4 }), 'low');
  assert.equal(getStockStatus({ ...product, quantity: 5, minimum: 4 }), 'available');
});

test('create trims text and records a nonzero opening balance as inbound', () => {
  const inventory: Inventory = { products: [], movements: [] };
  const result = createProduct(inventory, { ...details, quantity: 8 });
  assert.deepEqual(inventory, { products: [], movements: [] });
  assert.equal(result.products[0].name, 'Produto novo');
  assert.equal(result.products[0].sku, 'sku-novo');
  assert.equal(result.products[0].category, 'Geral');
  assert.equal(result.movements[0].type, 'inbound');
  assert.equal(result.movements[0].quantity, 8);
  assert.equal(result.movements[0].productId, result.products[0].id);
});

test('SKU uniqueness ignores case and surrounding whitespace', () => {
  const inventory = createDemoInventory();
  assertInventoryError(() => createProduct(inventory, { ...details, sku: ' emb-001 ', quantity: 0 }), 'sku');
  assertInventoryError(() => updateProduct(inventory, inventory.products[0].id, { ...details, sku: 'EXP-014' }), 'sku');
});

test('invalid text, minimum, and quantities report their field', () => {
  const inventory: Inventory = { products: [], movements: [] };
  assertInventoryError(() => createProduct(inventory, { ...details, name: '   ', quantity: 0 }), 'name');
  assertInventoryError(() => createProduct(inventory, { ...details, minimum: -1, quantity: 0 }), 'minimum');
  assertInventoryError(() => createProduct(inventory, { ...details, quantity: 1.5 }), 'quantity');
  assertInventoryError(() => createProduct(inventory, { ...details, quantity: Number.MAX_SAFE_INTEGER + 1 }), 'quantity');
});

test('overdraw and overflowing receipt fail without changing inventory', () => {
  const inventory = createDemoInventory();
  const before = structuredClone(inventory);
  const empty = inventory.products[1];
  assert.throws(
    () => recordMovement(inventory, { productId: inventory.products[0].id, type: 'outbound', quantity: 37 }),
    (error: unknown) => error instanceof InventoryError
      && error.field === 'quantity'
      && error.message === 'A saída não pode exceder o saldo de 36 unidades.',
  );
  assertInventoryError(() => recordMovement(inventory, { productId: empty.id, type: 'outbound', quantity: 1 }), 'quantity');
  assert.deepEqual(inventory, before);

  const maxInventory: Inventory = {
    products: [{ ...empty, id: 'max', quantity: Number.MAX_SAFE_INTEGER }],
    movements: [],
  };
  const maxBefore = structuredClone(maxInventory);
  assertInventoryError(() => recordMovement(maxInventory, { productId: 'max', type: 'inbound', quantity: 1 }), 'quantity');
  assert.deepEqual(maxInventory, maxBefore);
});

test('movement changes current balance and snapshots survive edits and deletion', () => {
  const inventory = createDemoInventory();
  const product = inventory.products[0];
  const recorded = recordMovement(inventory, { productId: product.id, type: 'outbound', quantity: 2 });
  assert.equal(recorded.products[0].quantity, product.quantity - 2);
  assert.equal(inventory.products[0].quantity, product.quantity);
  assert.equal(recorded.movements[0].productName, product.name);
  assert.equal(recorded.movements[0].productSku, product.sku);

  const edited = updateProduct(recorded, product.id, { ...details, sku: 'NEW-001' });
  assert.equal(edited.products[0].name, 'Produto novo');
  assert.equal(edited.movements[0].productName, product.name);
  assert.equal(edited.movements[0].productSku, product.sku);
  const deleted = deleteProduct(edited, product.id);
  assert.equal(deleted.products.some((item) => item.id === product.id), false);
  assert.equal(deleted.movements.length, edited.movements.length);
  assert.equal(deleted.movements[0].productName, product.name);
});

test('unknown product and invalid movement type are rejected', () => {
  const inventory = createDemoInventory();
  assertInventoryError(() => deleteProduct(inventory, 'missing'), 'productId');
  assertInventoryError(() => recordMovement(inventory, { productId: 'missing', type: 'inbound', quantity: 1 }), 'productId');
  assertInventoryError(() => recordMovement(inventory, { productId: inventory.products[0].id, type: 'unknown' as 'inbound', quantity: 1 }), 'type');
});

test('each demo seed is independent and reproduces 12 products and 6 movements', () => {
  const first = createDemoInventory();
  const second = createDemoInventory();
  assert.equal(first.products.length, 12);
  assert.equal(first.movements.length, 6);
  first.products[0].name = 'Alterado';
  first.movements.pop();
  assert.notEqual(second.products[0].name, first.products[0].name);
  assert.equal(second.movements.length, 6);
  assert.match(second.movements[0].occurredAt, /Z$/);
});
