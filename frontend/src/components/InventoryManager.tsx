import { useCallback, useEffect, useState } from "react";

import { api, getApiErrorMessage, type InventoryItem, type Product } from "../api/client";
import { formatBrl, getProductVisual } from "../lib/productVisual";

type StockToast = { id: number; message: string; type: "success" | "error" };

function stockLevel(qty: number): { label: string; className: string } {
  if (qty <= 0) return { label: "Esgotado", className: "stock-badge stock-badge--out" };
  if (qty <= 5) return { label: "Crítico", className: "stock-badge stock-badge--low" };
  return { label: "Normal", className: "stock-badge stock-badge--ok" };
}

export function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setInputs, setSetInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [toasts, setToasts] = useState<StockToast[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, inv] = await Promise.all([api.getProducts(), api.getInventory()]);
      setProducts(prods);
      setInventory(inv);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addToast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  function updateInventoryItem(updated: InventoryItem) {
    setInventory((prev) =>
      prev.map((item) => (item.product_id === updated.product_id ? updated : item)),
    );
  }

  async function handleAdjust(productId: number, delta: number) {
    setSaving((prev) => ({ ...prev, [productId]: true }));
    try {
      const updated = await api.adjustStock(productId, delta);
      updateInventoryItem(updated);
      addToast(`Estoque ajustado: ${updated.quantity} unidades`, "success");
    } catch (e) {
      addToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function handleSetStock(productId: number) {
    const raw = setInputs[productId] ?? "";
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) {
      addToast("Informe um número válido (≥ 0).", "error");
      return;
    }
    setSaving((prev) => ({ ...prev, [productId]: true }));
    try {
      const updated = await api.setStock(productId, qty);
      updateInventoryItem(updated);
      setSetInputs((prev) => ({ ...prev, [productId]: "" }));
      addToast(`Estoque definido: ${updated.quantity} unidades`, "success");
    } catch (e) {
      addToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving((prev) => ({ ...prev, [productId]: false }));
    }
  }

  const stockMap: Record<number, number> = {};
  for (const item of inventory) {
    stockMap[item.product_id] = item.quantity;
  }

  return (
    <section className="inventory-page">
      <div className="catalog__head">
        <h2 className="catalog__title">Gerenciador de Estoque</h2>
        <p className="catalog__subtitle">
          Ajuste quantidades por produto. Fonte: <strong>inventory-service</strong> (porta 8003).
        </p>
      </div>

      {loading && (
        <div className="catalog__skeleton" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="inline-alert inline-alert--error" role="alert">
          <strong>Não foi possível carregar o estoque.</strong>
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="inventory-grid">
          {products.map((product) => {
            const visual = getProductVisual(product.name);
            const qty = stockMap[product.id] ?? 0;
            const level = stockLevel(qty);
            const isBusy = saving[product.id] ?? false;

            return (
              <article key={product.id} className="inventory-card">
                <div className={`inventory-card__media ${visual.gradientClass}`}>
                  <span className="product-card__emoji" aria-hidden>{visual.emoji}</span>
                  <span className={level.className}>{level.label}</span>
                </div>

                <div className="inventory-card__body">
                  <h3 className="inventory-card__name">{product.name}</h3>
                  <p className="inventory-card__price">{formatBrl(product.price)}</p>

                  <div className="inventory-card__stock-row">
                    <span className="inventory-card__stock-label">Estoque atual</span>
                    <strong className="inventory-card__stock-value">{qty}</strong>
                  </div>

                  <div className="inventory-card__controls">
                    <div className="inventory-card__quick">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleAdjust(product.id, -1)}
                        disabled={isBusy || qty <= 0}
                        aria-label="Remover 1 unidade"
                      >
                        −1
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleAdjust(product.id, 1)}
                        disabled={isBusy}
                        aria-label="Adicionar 1 unidade"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handleAdjust(product.id, 10)}
                        disabled={isBusy}
                        aria-label="Adicionar 10 unidades"
                      >
                        +10
                      </button>
                    </div>

                    <div className="inventory-card__set">
                      <input
                        type="number"
                        min="0"
                        placeholder="Definir qtd."
                        value={setInputs[product.id] ?? ""}
                        onChange={(e) =>
                          setSetInputs((prev) => ({ ...prev, [product.id]: e.target.value }))
                        }
                        className="inventory-card__input"
                        disabled={isBusy}
                      />
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleSetStock(product.id)}
                        disabled={isBusy || !(setInputs[product.id] ?? "").trim()}
                      >
                        {isBusy ? "…" : "Definir"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toasts.length > 0 && (
        <div className="inventory-toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`inventory-toast inventory-toast--${t.type}`} role="alert">
              {t.message}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
