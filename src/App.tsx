import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  InventoryError,
  createProduct,
  deleteProduct,
  recordMovement,
  updateProduct,
  type Inventory,
  type MovementType,
  type Product,
  type ProductDetails,
} from "./domain/inventory";
import { createDemoInventory } from "./domain/demo-data";
import { Icon } from "./ui/icons";
import { useInventory } from "./ui/useInventory";
import {
  MovementHistoryView,
  OverviewView,
  ProductCatalogView,
} from "./ui/views";

type Page = "visao-geral" | "produtos" | "movimentacoes";
type Modal = {
  kind: "movement" | "create" | "edit" | "delete" | "reset" | "no-products";
  productId?: string;
};
type FieldErrors = Partial<
  Record<
    "name" | "sku" | "category" | "minimum" | "quantity" | "productId" | "type",
    string
  >
>;

const pages: Record<
  Page,
  { title: string; action: string; command: "movement" | "create" }
> = {
  "visao-geral": {
    title: "Visão geral",
    action: "Registrar movimentação",
    command: "movement",
  },
  produtos: { title: "Produtos", action: "Novo produto", command: "create" },
  movimentacoes: {
    title: "Movimentações",
    action: "Registrar movimentação",
    command: "movement",
  },
};
const portfolioUrl = (() => {
  const value =
    import.meta.env.VITE_PORTFOLIO_URL || "https://hericles-koelher.github.io/";
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
})();

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="field-error" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir esta ação.";
}

function errorField(error: unknown): keyof FieldErrors | undefined {
  if (error && typeof error === "object" && "field" in error)
    return (error as { field?: keyof FieldErrors }).field;
  return undefined;
}

export default function App() {
  const { inventory, updateInventory, storageStatus } = useInventory();
  const [page, setPage] = useState<Page>(() => getPageFromHash());
  const pageRef = useRef(page);
  const [modal, setModal] = useState<Modal | null>(null);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
  });
  const [movementError, setMovementError] = useState("");
  const [movementErrorField, setMovementErrorField] = useState<
    "productId" | "type" | "quantity"
  >("quantity");
  const [productErrors, setProductErrors] = useState<FieldErrors>({});
  const [movementProductId, setMovementProductId] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("inbound");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submissionError, setSubmissionError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const latestPage = pages[page];
  const product = modal?.productId
    ? inventory.products.find((item) => item.id === modal.productId)
    : undefined;

  useEffect(() => {
    const syncPage = () => {
      const next = getPageFromHash();
      if (next === pageRef.current) return;
      pageRef.current = next;
      setPage(next);
      setNotice("");
      requestAnimationFrame(() => {
        mainRef.current?.focus();
        window.scrollTo(0, 0);
      });
    };
    window.addEventListener("hashchange", syncPage);
    if (!location.hash) location.hash = "visao-geral";
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !modal) return;
    dialog.showModal();
    const focusTarget =
      dialog.querySelector<HTMLElement>("[data-initial-focus]") ??
      dialog.querySelector<HTMLElement>(
        '.dialog-actions [data-command="close"]',
      );
    focusTarget?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [modal]);

  const categories = useMemo(
    () =>
      [...new Set(inventory.products.map((item) => item.category))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [inventory.products],
  );
  function openModal(next: Modal, trigger?: HTMLElement) {
    returnFocusRef.current = trigger ?? (document.activeElement as HTMLElement);
    setSubmissionError("");
    setModal(next);
  }

  function restoreDialogFocus() {
    window.setTimeout(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      else
        mainRef.current
          ?.querySelector<HTMLElement>(".page-header button")
          ?.focus();
    }, 0);
  }

  function closeModal(restoreFocus = true) {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setModal(null);
    setSubmissionError("");
    if (restoreFocus) restoreDialogFocus();
  }

  function announce(message: string) {
    setNotice(message);
  }

  async function runSubmission(task: () => Promise<void>) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionError("");
    try {
      await task();
    } catch (error) {
      setSubmissionError(errorMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function commit(
    mutator: (current: Inventory) => Inventory,
    success: string,
  ) {
    try {
      await updateInventory(mutator);
      closeModal();
      announce(success);
    } catch (error) {
      return error;
    }
    return null;
  }

  function handlePrimary(event: MouseEvent<HTMLButtonElement>) {
    if (latestPage.command === "create") {
      setProductErrors({});
      openModal({ kind: "create" }, event.currentTarget);
    } else if (!inventory.products.length)
      openModal({ kind: "no-products" }, event.currentTarget);
    else {
      setMovementProductId("");
      setMovementType("inbound");
      setMovementError("");
      setMovementErrorField("quantity");
      openModal({ kind: "movement" }, event.currentTarget);
    }
  }

  async function handleReset() {
    await updateInventory(createDemoInventory());
    setFilters({ search: "", category: "", status: "" });
    closeModal();
    announce("Dados de demonstração restaurados.");
  }

  function handleProductAction(
    command: "edit" | "delete",
    item: Product,
    trigger: HTMLElement,
  ) {
    setProductErrors({});
    openModal({ kind: command, productId: item.id }, trigger);
  }

  async function submitMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await runSubmission(async () => {
      const data = new FormData(form);
      const type = String(data.get("type")) as MovementType;
      const id = String(data.get("productId"));
      const rawAmount = String(data.get("quantity") ?? "");
      const amount = rawAmount ? Number(rawAmount) : Number.NaN;
      const error = await commit(
        (current) =>
          recordMovement(current, { productId: id, type, quantity: amount }),
        `${type === "inbound" ? "Entrada" : "Saída"} registrada.`,
      );
      if (error) {
        const field = errorField(error);
        const targetField =
          field === "productId" || field === "type" ? field : "quantity";
        setMovementErrorField(targetField);
        setMovementError(errorMessage(error));
        requestAnimationFrame(() =>
          document
            .getElementById(
              targetField === "productId"
                ? "movement-product"
                : targetField === "type"
                  ? "movement-type"
                  : "movement-quantity",
            )
            ?.focus(),
        );
      }
    });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await runSubmission(async () => {
      const data = new FormData(form);
      const values: ProductDetails = {
        name: String(data.get("name") ?? "").trim(),
        sku: String(data.get("sku") ?? "")
          .trim()
          .toUpperCase(),
        category: String(data.get("category") ?? "").trim(),
        minimum: String(data.get("minimum") ?? "")
          ? Number(data.get("minimum"))
          : Number.NaN,
      };
      const isEdit = modal?.kind === "edit";
      const editProductId = isEdit ? modal?.productId : undefined;
      const result = await commit(
        (current) => {
          if (isEdit) {
            if (!editProductId)
              throw new InventoryError("Produto não encontrado.", "productId");
            return updateProduct(current, editProductId, values);
          }
          const rawQuantity = String(data.get("quantity") ?? "");
          return createProduct(current, {
            ...values,
            quantity: rawQuantity ? Number(rawQuantity) : Number.NaN,
          });
        },
        isEdit ? "Produto atualizado." : "Produto cadastrado.",
      );
      if (!result) return;
      const field = errorField(result);
      const key =
        field && field in values
          ? field
          : field === "quantity"
            ? "quantity"
            : "name";
      setProductErrors({ [key]: errorMessage(result) });
      requestAnimationFrame(() =>
        document.getElementById(`product-${key}`)?.focus(),
      );
    });
  }

  function dialogContent() {
    if (!modal) return null;
    if (modal.kind === "movement")
      return (
        <form onSubmit={submitMovement} noValidate aria-busy={submitting}>
          <div className="dialog-heading">
            <h2 id="dialog-title">Registrar movimentação</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              data-command="close"
              onClick={() => closeModal()}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="dialog-content">
            <div className="field">
              <label htmlFor="movement-product">Produto</label>
              <select
                id="movement-product"
                name="productId"
                required
                disabled={submitting}
                data-initial-focus
                aria-invalid={
                  !!movementError && movementErrorField === "productId"
                }
                aria-describedby={
                  movementErrorField === "productId"
                    ? "movement-product-error"
                    : undefined
                }
                value={movementProductId}
                onChange={(event) => {
                  setMovementProductId(event.target.value);
                  setMovementError("");
                }}
              >
                <option value="">Selecione um produto</option>
                {inventory.products.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} · {item.sku}
                  </option>
                ))}
              </select>
              <FieldError
                id="movement-product-error"
                message={
                  movementErrorField === "productId" ? movementError : undefined
                }
              />
            </div>
            <div className="field">
              <label htmlFor="movement-type">Tipo de movimentação</label>
              <select
                id="movement-type"
                name="type"
                disabled={submitting}
                value={movementType}
                aria-invalid={!!movementError && movementErrorField === "type"}
                aria-describedby={
                  movementErrorField === "type"
                    ? "movement-type-error"
                    : undefined
                }
                onChange={(event) => {
                  setMovementType(event.target.value as MovementType);
                  setMovementError("");
                }}
              >
                <option value="inbound">Entrada</option>
                <option value="outbound">Saída</option>
              </select>
              <FieldError
                id="movement-type-error"
                message={
                  movementErrorField === "type" ? movementError : undefined
                }
              />
            </div>
            <div className="field">
              <label htmlFor="movement-quantity">Quantidade</label>
              <input
                id="movement-quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                required
                disabled={submitting}
                aria-describedby={`movement-balance${movementErrorField === "quantity" ? " movement-error" : ""}`}
                aria-invalid={
                  !!movementError && movementErrorField === "quantity"
                }
                onChange={() => setMovementError("")}
              />
              <p id="movement-balance" className="field-hint">
                {movementType === "outbound"
                  ? `Saldo disponível: ${inventory.products.find((item) => item.id === movementProductId)?.quantity ?? "—"} un.`
                  : ""}
              </p>
              <FieldError
                id="movement-error"
                message={
                  movementErrorField === "quantity" ? movementError : undefined
                }
              />
            </div>
          </div>
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              disabled={submitting}
              data-command="close"
              onClick={() => closeModal()}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Registrando…" : "Registrar movimentação"}
            </button>
          </div>
        </form>
      );
    if (modal.kind === "create" || modal.kind === "edit")
      if (modal.kind === "edit" && !product)
        return (
          <div>
            <div className="dialog-heading">
              <h2 id="dialog-title">Editar produto</h2>
              <button
                className="icon-button"
                type="button"
                aria-label="Fechar"
                onClick={() => closeModal()}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="dialog-content">
              <p>
                Este produto não está mais disponível. A lista foi atualizada em
                outra aba.
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="button primary"
                type="button"
                onClick={() => closeModal()}
              >
                Fechar
              </button>
            </div>
          </div>
        );
    if (modal.kind === "create" || modal.kind === "edit")
      return (
        <ProductForm
          key={`${modal.kind}-${modal.productId ?? "new"}`}
          product={modal.kind === "edit" ? product : undefined}
          categories={categories}
          errors={productErrors}
          submitting={submitting}
          onChange={() => setProductErrors({})}
          onSubmit={submitProduct}
          onClose={() => closeModal()}
        />
      );
    if (modal.kind === "delete")
      return (
        <form
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault();
            if (product)
              void runSubmission(async () => {
                await updateInventory((current) =>
                  deleteProduct(current, product.id),
                );
                closeModal();
                announce("Produto excluído.");
              });
          }}
        >
          <div className="dialog-heading">
            <h2 id="dialog-title">Excluir produto?</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              disabled={submitting}
              onClick={() => closeModal()}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="dialog-content">
            <p>
              O produto <strong>{product?.name}</strong> sairá do catálogo. As
              movimentações já registradas continuarão no histórico.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              disabled={submitting}
              onClick={() => closeModal()}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Excluindo…" : "Excluir produto"}
            </button>
          </div>
        </form>
      );
    if (modal.kind === "reset")
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runSubmission(handleReset);
          }}
        >
          <div className="dialog-heading">
            <h2 id="dialog-title">Restaurar dados de demonstração?</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Fechar"
              disabled={submitting}
              onClick={() => closeModal()}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="dialog-content">
            <p>
              As alterações salvas neste navegador serão substituídas pelos
              produtos e movimentações fictícios iniciais.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="button"
              type="button"
              disabled={submitting}
              onClick={() => closeModal()}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Restaurando…" : "Restaurar dados"}
            </button>
          </div>
        </form>
      );
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          closeModal();
          location.hash = "produtos";
        }}
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">Registrar movimentação</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="Fechar"
            onClick={() => closeModal()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="dialog-content">
          <p>Cadastre um produto antes de registrar uma movimentação.</p>
        </div>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={() => closeModal()}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            Ver produtos
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <div className="app">
        <header className="navigation">
          <div className="navigation-inner">
            <a className="brand" href="#visao-geral">
              <span className="brand-icon">
                <Icon name="box" />
              </span>
              Estoque
            </a>
            <nav className="nav-links" aria-label="Principal">
              {(
                [
                  ["visao-geral", "dashboard", "Visão geral"],
                  ["produtos", "boxes", "Produtos"],
                  ["movimentacoes", "swap", "Movimentações"],
                ] as const
              ).map(([key, glyph, title]) => (
                <a
                  key={key}
                  href={`#${key}`}
                  className="nav-link"
                  aria-current={page === key ? "page" : undefined}
                >
                  <Icon name={glyph} />
                  {title}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} ref={mainRef}>
          <div className="shell">
            <div className="page-header">
              <h1>{latestPage.title}</h1>
              <button
                className="button primary"
                type="button"
                onClick={handlePrimary}
              >
                <Icon name="plus" />
                {latestPage.action}
              </button>
            </div>
            <div className="announcement" role="status" aria-live="polite">
              {notice && (
                <>
                  <Icon name="check" />
                  {notice}
                </>
              )}
            </div>
            {page === "produtos" ? (
              <ProductCatalogView
                inventory={inventory}
                categories={categories}
                filters={filters}
                setFilters={setFilters}
                onProductAction={handleProductAction}
              />
            ) : page === "movimentacoes" ? (
              <MovementHistoryView inventory={inventory} />
            ) : (
              <OverviewView inventory={inventory} categories={categories} />
            )}
          </div>
        </main>
        <aside className="demo" aria-label="Sobre a demonstração">
          <div className="demo-inner">
            <p className="demo-name">Demonstração</p>
            <p className="demo-caption">
              {storageStatus === "ready"
                ? "Alterações salvas neste navegador."
                : storageStatus === "invalid"
                  ? "Dados locais inválidos; usando os dados de demonstração."
                  : "Armazenamento indisponível; alterações valem nesta sessão."}
            </p>
            <button
              className="demo-action"
              type="button"
              onClick={(event) =>
                openModal({ kind: "reset" }, event.currentTarget)
              }
            >
              <Icon name="reset" />
              Restaurar dados de demonstração
            </button>
            {portfolioUrl && (
              <a
                className="portfolio"
                href={portfolioUrl}
                target="_blank"
                rel="noreferrer"
              >
                Quero um sistema para minha empresa <Icon name="external" />
              </a>
            )}
          </div>
        </aside>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-title"
        onCancel={(event) => {
          if (submittingRef.current) event.preventDefault();
        }}
        onClose={() => {
          setModal(null);
          restoreDialogFocus();
        }}
      >
        {dialogContent()}
        <FieldError id="submission-error" message={submissionError} />
      </dialog>
    </>
  );
}

function ProductForm({
  product,
  categories,
  errors,
  submitting,
  onChange,
  onSubmit,
  onClose,
}: {
  product?: Product;
  categories: string[];
  errors: FieldErrors;
  submitting: boolean;
  onChange: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <div className="dialog-heading">
        <h2 id="dialog-title">{product ? "Editar produto" : "Novo produto"}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Fechar"
          disabled={submitting}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-content">
        <div className="field">
          <label htmlFor="product-name">Nome do produto</label>
          <input
            id="product-name"
            name="name"
            required
            disabled={submitting}
            maxLength={64}
            defaultValue={product?.name ?? ""}
            data-initial-focus
            aria-describedby={errors.name ? "product-name-error" : undefined}
            aria-invalid={!!errors.name}
            onChange={onChange}
          />
          <FieldError id="product-name-error" message={errors.name} />
        </div>
        <div className="field">
          <label htmlFor="product-sku">SKU</label>
          <input
            id="product-sku"
            name="sku"
            required
            disabled={submitting}
            maxLength={24}
            defaultValue={product?.sku ?? ""}
            aria-describedby={errors.sku ? "product-sku-error" : undefined}
            aria-invalid={!!errors.sku}
            onChange={onChange}
          />
          <FieldError id="product-sku-error" message={errors.sku} />
        </div>
        <div className="field">
          <label htmlFor="product-category">Categoria</label>
          <input
            id="product-category"
            name="category"
            required
            disabled={submitting}
            maxLength={40}
            list="product-categories"
            defaultValue={product?.category ?? ""}
            aria-describedby={
              errors.category ? "product-category-error" : undefined
            }
            aria-invalid={!!errors.category}
            onChange={onChange}
          />
          <datalist id="product-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <FieldError id="product-category-error" message={errors.category} />
        </div>
        <div className="fields-inline">
          {product ? (
            <p className="field-hint">Saldo atual: {product.quantity} un.</p>
          ) : (
            <div className="field">
              <label htmlFor="product-quantity">Saldo inicial</label>
              <input
                id="product-quantity"
                name="quantity"
                type="number"
                required
                disabled={submitting}
                min="0"
                step="1"
                defaultValue="0"
                aria-describedby={
                  errors.quantity ? "product-quantity-error" : undefined
                }
                aria-invalid={!!errors.quantity}
                onChange={onChange}
              />
              <FieldError
                id="product-quantity-error"
                message={errors.quantity}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="product-minimum">Estoque mínimo</label>
            <input
              id="product-minimum"
              name="minimum"
              type="number"
              required
              disabled={submitting}
              min="0"
              step="1"
              defaultValue={product?.minimum ?? 0}
              aria-describedby={
                errors.minimum ? "product-minimum-error" : undefined
              }
              aria-invalid={!!errors.minimum}
              onChange={onChange}
            />
            <FieldError id="product-minimum-error" message={errors.minimum} />
          </div>
        </div>
      </div>
      <div className="dialog-actions">
        <button
          className="button"
          type="button"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}

function getPageFromHash(): Page {
  const value = location.hash.slice(1);
  return value === "produtos" ||
    value === "movimentacoes" ||
    value === "visao-geral"
    ? value
    : "visao-geral";
}
