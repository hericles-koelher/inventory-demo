import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  getStockStatus,
  type Inventory,
  type Movement,
  type Product,
  type StockStatus,
} from "../domain/inventory";
import { Icon } from "./icons";

const labels: Record<StockStatus, string> = {
  available: "Em estoque",
  low: "Estoque baixo",
  empty: "Sem estoque",
};
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function stockLabel(product: Product) {
  const status = getStockStatus(product);
  return <span className={`status ${status}`}>{labels[status]}</span>;
}

function productName(product: Product) {
  return (
    <>
      <span className="item-name">{product.name}</span>
      <span className="item-code">{product.sku}</span>
    </>
  );
}

function signed(movement: Movement) {
  return `${movement.type === "inbound" ? "+" : "−"}${movement.quantity}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : dateFormat.format(date).replace(".", "");
}

function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p>{children}</p>
      {action}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  glyph,
  color = "",
}: {
  label: string;
  value: number;
  hint: string;
  glyph: "boxes" | "warning" | "out";
  color?: string;
}) {
  return (
    <div className="metric">
      <p className="metric-label">{label}</p>
      <span className={`tile-icon ${color}`} aria-hidden="true">
        <Icon name={glyph} />
      </span>
      <strong className="metric-value">{value}</strong>
      <p className="metric-meta">{hint}</p>
    </div>
  );
}

export function OverviewView({
  inventory,
  categories,
}: {
  inventory: Inventory;
  categories: string[];
}) {
  const low = inventory.products.filter(
    (product) => getStockStatus(product) === "low",
  );
  const empty = inventory.products.filter(
    (product) => getStockStatus(product) === "empty",
  );
  const attention = [...low, ...empty].sort((a, b) => a.quantity - b.quantity);
  const recent = [...inventory.movements]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 4);

  return (
    <>
      <section className="metrics" aria-label="Indicadores do estoque">
        <Metric
          label="Produtos cadastrados"
          value={inventory.products.length}
          hint={`${categories.length} categorias`}
          glyph="boxes"
        />
        <Metric
          label="Estoque baixo"
          value={low.length}
          hint="No limite ou abaixo do mínimo"
          glyph="warning"
          color="low"
        />
        <Metric
          label="Sem estoque"
          value={empty.length}
          hint="Saídas bloqueadas"
          glyph="out"
          color="empty"
        />
      </section>
      <div className="overview-grid">
        <section className="panel" aria-labelledby="alerts-title">
          <div className="panel-heading">
            <h2 id="alerts-title">Produtos que precisam de atenção</h2>
          </div>
          {attention.length ? (
            <>
              <table className="desktop-data">
                <thead>
                  <tr>
                    <th scope="col">Produto</th>
                    <th scope="col" className="numeric">
                      Saldo
                    </th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((product) => (
                    <tr key={product.id}>
                      <td>{productName(product)}</td>
                      <td className="numeric">{product.quantity} un.</td>
                      <td>{stockLabel(product)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="mobile-data">
                {attention.map((product) => (
                  <li key={product.id}>
                    <div className="mobile-row">
                      <span className="item-name">{product.name}</span>
                      <span className="numeric">{product.quantity} un.</span>
                    </div>
                    {stockLabel(product)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState>Nenhum produto precisa de reposição.</EmptyState>
          )}
          <div className="last-row">
            <a className="text-link" href="#produtos">
              Ver todos os produtos <Icon name="arrow" />
            </a>
          </div>
        </section>
        <section className="panel" aria-labelledby="recent-title">
          <div className="panel-heading">
            <h2 id="recent-title">Movimentações recentes</h2>
          </div>
          {recent.length ? (
            <ul className="activity">
              {recent.map((movement) => (
                <li key={movement.id}>
                  <span className={`tile-icon ${movement.type}`}>
                    <Icon name={movement.type} />
                  </span>
                  <div className="activity-content">
                    <span className="item-name">{movement.productName}</span>
                    <p>
                      {movement.type === "inbound" ? "Entrada" : "Saída"} ·{" "}
                      {formatDate(movement.occurredAt)}
                    </p>
                  </div>
                  <span className={`signed ${movement.type}`}>
                    {signed(movement)} un.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Nenhuma movimentação registrada.</EmptyState>
          )}
          <div className="last-row">
            <a className="text-link" href="#movimentacoes">
              Ver histórico <Icon name="arrow" />
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

type Filters = { search: string; category: string; status: string };
type ProductAction = (
  command: "edit" | "delete",
  product: Product,
  trigger: HTMLElement,
) => void;

export function ProductCatalogView({
  inventory,
  categories,
  filters,
  setFilters,
  onProductAction,
}: {
  inventory: Inventory;
  categories: string[];
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  onProductAction: ProductAction;
}) {
  const query = filters.search.trim().toLocaleLowerCase("pt-BR");
  const products = inventory.products.filter(
    (product) =>
      (!query ||
        `${product.name} ${product.sku}`
          .toLocaleLowerCase("pt-BR")
          .includes(query)) &&
      (!filters.category || product.category === filters.category) &&
      (!filters.status || getStockStatus(product) === filters.status),
  );
  const clearFilters = () => {
    setFilters({ search: "", category: "", status: "" });
    document.querySelector<HTMLInputElement>('[data-filter="search"]')?.focus();
  };
  const actions = (product: Product) => (
    <div className="row-actions">
      <button
        className="icon-button"
        type="button"
        aria-label={`Editar ${product.name}`}
        onClick={(event) =>
          onProductAction("edit", product, event.currentTarget)
        }
      >
        <Icon name="edit" />
      </button>
      <button
        className="icon-button"
        type="button"
        aria-label={`Excluir ${product.name}`}
        onClick={(event) =>
          onProductAction("delete", product, event.currentTarget)
        }
      >
        <Icon name="trash" />
      </button>
    </div>
  );

  return (
    <section className="panel" aria-labelledby="catalog-title">
      <div className="panel-heading">
        <h2 id="catalog-title">Catálogo de produtos</h2>
      </div>
      <div className="filters">
        <label className="search-field">
          <span className="visually-hidden">Buscar por produto ou SKU</span>
          <Icon name="search" />
          <input
            type="search"
            data-filter="search"
            placeholder="Buscar por produto ou SKU"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
        </label>
        <label>
          <span className="visually-hidden">Filtrar por categoria</span>
          <select
            data-filter="category"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="visually-hidden">Filtrar por situação</span>
          <select
            data-filter="status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
          >
            <option value="">Todas as situações</option>
            <option value="available">Em estoque</option>
            <option value="low">Estoque baixo</option>
            <option value="empty">Sem estoque</option>
          </select>
        </label>
      </div>
      {!inventory.products.length ? (
        <EmptyState>Nenhum produto cadastrado.</EmptyState>
      ) : !products.length ? (
        <EmptyState>
          Nenhum produto corresponde à busca.
          <button className="button small" type="button" onClick={clearFilters}>
            Limpar filtros
          </button>
        </EmptyState>
      ) : (
        <>
          <table className="desktop-data">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="numeric">
                  Saldo
                </th>
                <th scope="col" className="numeric">
                  Mínimo
                </th>
                <th scope="col">Situação</th>
                <th scope="col" className="numeric">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{productName(product)}</td>
                  <td className="subtle">{product.category}</td>
                  <td className="numeric">{product.quantity}</td>
                  <td className="numeric subtle">{product.minimum}</td>
                  <td>{stockLabel(product)}</td>
                  <td>{actions(product)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mobile-data">
            {products.map((product) => (
              <li key={product.id}>
                <div className="mobile-row">
                  <span className="item-name">{product.name}</span>
                  <span className="numeric">{product.quantity} un.</span>
                </div>
                {stockLabel(product)}
                <details>
                  <summary>Detalhes e ações</summary>
                  <dl className="details">
                    <div>
                      <dt>SKU</dt>
                      <dd>{product.sku}</dd>
                    </div>
                    <div>
                      <dt>Categoria</dt>
                      <dd>{product.category}</dd>
                    </div>
                    <div>
                      <dt>Estoque mínimo</dt>
                      <dd>{product.minimum}</dd>
                    </div>
                  </dl>
                  {actions(product)}
                </details>
              </li>
            ))}
          </ul>
          <p className="panel-foot">
            {products.length} de {inventory.products.length} produtos
          </p>
        </>
      )}
    </section>
  );
}

export function MovementHistoryView({ inventory }: { inventory: Inventory }) {
  const movements = [...inventory.movements].sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
  return (
    <section className="panel" aria-labelledby="history-title">
      <div className="panel-heading">
        <h2 id="history-title">Histórico de movimentações</h2>
      </div>
      {!movements.length ? (
        <EmptyState>Nenhuma movimentação registrada.</EmptyState>
      ) : (
        <>
          <table className="desktop-data">
            <thead>
              <tr>
                <th scope="col">Data e hora</th>
                <th scope="col">Produto</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="numeric">
                  Quantidade
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="subtle">
                    <time dateTime={movement.occurredAt}>
                      {formatDate(movement.occurredAt)}
                    </time>
                  </td>
                  <td className="item-name">
                    {movement.productName}
                    <span className="item-code">{movement.productSku}</span>
                  </td>
                  <td>
                    <span className={`status ${movement.type}`}>
                      {movement.type === "inbound" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td className="numeric">
                    <span className={`signed ${movement.type}`}>
                      {signed(movement)} un.
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mobile-data">
            {movements.map((movement) => (
              <li key={movement.id}>
                <div className="mobile-row">
                  <span className="item-name">{movement.productName}</span>
                  <span className={`signed ${movement.type}`}>
                    {signed(movement)} un.
                  </span>
                </div>
                <div className="mobile-row">
                  <time className="subtle" dateTime={movement.occurredAt}>
                    {formatDate(movement.occurredAt)}
                  </time>
                  <span className={`status ${movement.type}`}>
                    {movement.type === "inbound" ? "Entrada" : "Saída"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="panel-foot">{movements.length} movimentações</p>
        </>
      )}
    </section>
  );
}
