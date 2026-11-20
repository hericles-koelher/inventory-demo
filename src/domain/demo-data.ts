import type { Inventory, Movement, Product } from './inventory.ts';

const productSeed: Array<Omit<Product, 'id'>> = [
  { name: 'Caixa de papelão 30 × 20', sku: 'EMB-001', category: 'Embalagens', quantity: 36, minimum: 12 },
  { name: 'Etiqueta térmica 100 × 150', sku: 'EXP-014', category: 'Expedição', quantity: 0, minimum: 10 },
  { name: 'Papel sulfite A4', sku: 'ESC-003', category: 'Escritório', quantity: 4, minimum: 12 },
  { name: 'Fita adesiva transparente', sku: 'EMB-007', category: 'Embalagens', quantity: 7, minimum: 10 },
  { name: 'Álcool 70% 500 ml', sku: 'LIM-006', category: 'Limpeza', quantity: 0, minimum: 6 },
  { name: 'Envelope kraft A4', sku: 'EXP-009', category: 'Expedição', quantity: 3, minimum: 12 },
  { name: 'Caneta esferográfica azul', sku: 'ESC-010', category: 'Escritório', quantity: 54, minimum: 20 },
  { name: 'Filme stretch 50 cm', sku: 'EMB-011', category: 'Embalagens', quantity: 22, minimum: 8 },
  { name: 'Pano de microfibra', sku: 'LIM-008', category: 'Limpeza', quantity: 16, minimum: 8 },
  { name: 'Marcador permanente', sku: 'ESC-017', category: 'Escritório', quantity: 18, minimum: 5 },
  { name: 'Lacre de segurança', sku: 'EXP-012', category: 'Expedição', quantity: 72, minimum: 20 },
  { name: 'Saco para lixo 50 L', sku: 'LIM-023', category: 'Limpeza', quantity: 26, minimum: 10 },
];

const movementSeed: Array<{ productIndex: number; type: Movement['type']; quantity: number; occurredAt: string }> = [
  { productIndex: 0, type: 'inbound', quantity: 18, occurredAt: '2026-11-19T13:42:00.000Z' },
  { productIndex: 2, type: 'outbound', quantity: 8, occurredAt: '2026-11-19T12:18:00.000Z' },
  { productIndex: 3, type: 'outbound', quantity: 5, occurredAt: '2026-11-18T19:05:00.000Z' },
  { productIndex: 7, type: 'inbound', quantity: 10, occurredAt: '2026-11-18T17:26:00.000Z' },
  { productIndex: 1, type: 'outbound', quantity: 6, occurredAt: '2026-11-18T14:20:00.000Z' },
  { productIndex: 5, type: 'outbound', quantity: 3, occurredAt: '2026-11-17T18:12:00.000Z' },
];

export function createDemoInventory(): Inventory {
  const products = productSeed.map((product, index) => ({ ...product, id: `demo-product-${index + 1}` }));
  const movements = movementSeed.map((movement, index) => {
    const product = products[movement.productIndex];
    return {
      id: `demo-movement-${index + 1}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      type: movement.type,
      quantity: movement.quantity,
      occurredAt: movement.occurredAt,
    };
  });
  return { products, movements };
}
