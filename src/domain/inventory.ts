export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minimum: number;
};

export type MovementType = 'inbound' | 'outbound';

export type Movement = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: MovementType;
  quantity: number;
  occurredAt: string;
};

export type Inventory = { products: Product[]; movements: Movement[] };
export type StockStatus = 'available' | 'low' | 'empty';
export type ProductDetails = { name: string; sku: string; category: string; minimum: number };
export type InventoryField = 'name' | 'sku' | 'category' | 'minimum' | 'quantity' | 'productId' | 'type';

export class InventoryError extends Error {
  readonly field?: InventoryField;

  constructor(message: string, field?: InventoryField) {
    super(message);
    this.name = 'InventoryError';
    this.field = field;
  }
}

const requiredText = (value: string, field: 'name' | 'sku' | 'category'): string => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) throw new InventoryError('Preencha este campo.', field);
  return trimmed;
};

const validWholeNumber = (value: number, allowZero: boolean): boolean =>
  Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1);

const normalizedSku = (sku: string): string => sku.toLocaleLowerCase('pt-BR');

function validateDetails(inventory: Inventory, details: ProductDetails, exceptProductId?: string): ProductDetails {
  const name = requiredText(details.name, 'name');
  const sku = requiredText(details.sku, 'sku');
  const category = requiredText(details.category, 'category');
  if (!validWholeNumber(details.minimum, true)) {
    throw new InventoryError('O estoque mínimo deve ser um número inteiro não negativo.', 'minimum');
  }
  if (inventory.products.some((product) => product.id !== exceptProductId && normalizedSku(product.sku) === normalizedSku(sku))) {
    throw new InventoryError('Já existe um produto com este SKU.', 'sku');
  }
  return { name, sku, category, minimum: details.minimum };
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createMovement(product: Product, type: MovementType, quantity: number): Movement {
  return {
    id: createId(),
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    type,
    quantity,
    occurredAt: new Date().toISOString(),
  };
}

export function getStockStatus(product: Product): StockStatus {
  if (product.quantity === 0) return 'empty';
  if (product.quantity <= product.minimum) return 'low';
  return 'available';
}

export function createProduct(
  inventory: Inventory,
  details: ProductDetails & { quantity: number },
): Inventory {
  const values = validateDetails(inventory, details);
  if (!validWholeNumber(details.quantity, true)) {
    throw new InventoryError('A quantidade deve ser um número inteiro não negativo.', 'quantity');
  }
  const product: Product = { id: createId(), ...values, quantity: details.quantity };
  const movements = details.quantity > 0
    ? [createMovement(product, 'inbound', details.quantity), ...inventory.movements]
    : inventory.movements;
  return { products: [...inventory.products, product], movements };
}

export function updateProduct(inventory: Inventory, productId: string, details: ProductDetails): Inventory {
  const current = inventory.products.find((product) => product.id === productId);
  if (!current) throw new InventoryError('Produto não encontrado.', 'productId');
  const values = validateDetails(inventory, details, productId);
  return {
    products: inventory.products.map((product) => product.id === productId ? { ...product, ...values } : product),
    movements: inventory.movements,
  };
}

export function deleteProduct(inventory: Inventory, productId: string): Inventory {
  if (!inventory.products.some((product) => product.id === productId)) {
    throw new InventoryError('Produto não encontrado.', 'productId');
  }
  return { products: inventory.products.filter((product) => product.id !== productId), movements: inventory.movements };
}

export function recordMovement(
  inventory: Inventory,
  details: { productId: string; type: MovementType; quantity: number },
): Inventory {
  const product = inventory.products.find((item) => item.id === details.productId);
  if (!product) throw new InventoryError('Selecione um produto válido.', 'productId');
  if (details.type !== 'inbound' && details.type !== 'outbound') {
    throw new InventoryError('Selecione um tipo de movimentação válido.', 'type');
  }
  if (!validWholeNumber(details.quantity, false)) {
    throw new InventoryError('A quantidade deve ser um número inteiro positivo.', 'quantity');
  }
  if (details.type === 'outbound' && details.quantity > product.quantity) {
    const unitLabel = product.quantity === 1 ? 'unidade' : 'unidades';
    throw new InventoryError(`A saída não pode exceder o saldo de ${product.quantity} ${unitLabel}.`, 'quantity');
  }
  if (details.type === 'inbound' && details.quantity > Number.MAX_SAFE_INTEGER - product.quantity) {
    throw new InventoryError('A quantidade ultrapassa o limite seguro.', 'quantity');
  }
  const quantity = details.type === 'inbound' ? product.quantity + details.quantity : product.quantity - details.quantity;
  const updated = { ...product, quantity };
  return {
    products: inventory.products.map((item) => item.id === product.id ? updated : item),
    movements: [createMovement(product, details.type, details.quantity), ...inventory.movements],
  };
}
