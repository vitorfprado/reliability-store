import { useCallback, useEffect, useMemo, useState } from "react";

import { api, getApiErrorMessage, type Product } from "./api/client";
import { Cart, type CartItem } from "./components/Cart";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ProductCard } from "./components/ProductCard";
import { Toast } from "./components/Toast";

function reconcileCart(catalog: Product[], previous: CartItem[]): CartItem[] {
  return previous
    .map((item) => {
      const fresh = catalog.find((p) => p.id === item.product.id);
      if (!fresh) {
        return null;
      }
      const quantity = Math.min(item.quantity, Math.max(0, fresh.stock_quantity));
      if (quantity <= 0) {
        return null;
      }
      return { product: fresh, quantity };
    })
    .filter((x): x is CartItem => x != null);
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const cartItemCount = useMemo(() => cart.reduce((n, i) => n + i.quantity, 0), [cart]);

  const loadProducts = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await api.getProducts();
      setProducts(data);
      setCart((prev) => reconcileCart(data, prev));
    } catch (error) {
      setCatalogError(getApiErrorMessage(error));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function addToCart(product: Product) {
    const fresh = products.find((p) => p.id === product.id);
    if (!fresh || fresh.stock_quantity === 0) {
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === fresh.id);
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > fresh.stock_quantity) {
        return prev;
      }
      if (existing) {
        return prev.map((item) => (item.product.id === fresh.id ? { product: fresh, quantity: nextQty } : item));
      }
      return [...prev, { product: fresh, quantity: 1 }];
    });
  }

  function increase(productId: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }
        if (item.quantity >= item.product.stock_quantity) {
          return item;
        }
        return { ...item, quantity: item.quantity + 1 };
      }),
    );
  }

  function decrease(productId: number) {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item)),
    );
  }

  function remove(productId: number) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  const checkoutItems = useMemo(() => cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })), [cart]);

  async function checkout() {
    setLoadingCheckout(true);
    try {
      const result = await api.checkout(checkoutItems);
      setToast({ type: "success", message: `Compra finalizada com sucesso. Pedido #${result.order_id} · ${result.message}` });
      setCart([]);
      await loadProducts();
    } catch (error) {
      const reason =
        typeof error === "object" && error && "detail" in error
          ? (error as { detail?: { reason?: string } }).detail?.reason
          : undefined;
      const friendly = getApiErrorMessage(error);
      if (reason === "insufficient_stock" || reason === "validation_error") {
        setToast({ type: "error", message: friendly });
      } else {
        setToast({
          type: "error",
          message: "Estamos com instabilidade temporária no checkout. Tente novamente em instantes.",
        });
      }
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <div className="app">
      <Header cartItemCount={cartItemCount} />

      <main className="app__main">
        <div className="app__container">
          <Hero />

          <div className="layout-split">
            <div className="layout-split__primary">
              <section id="catalogo" className="catalog" aria-labelledby="catalog-title">
                <div className="catalog__head">
                  <h2 id="catalog-title" className="catalog__title">
                    Produtos em destaque
                  </h2>
                  <p className="catalog__subtitle">Tecnologia selecionada para aulas de observabilidade e confiabilidade.</p>
                </div>

                {catalogLoading && (
                  <div className="catalog__skeleton" aria-busy="true">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="skeleton-card" />
                    ))}
                  </div>
                )}

                {!catalogLoading && catalogError && (
                  <div className="inline-alert inline-alert--error" role="alert">
                    <strong>Não foi possível carregar o catálogo.</strong>
                    <p>{catalogError}</p>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={loadProducts}>
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!catalogLoading && !catalogError && (
                  <div className="catalog__grid">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={addToCart} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="layout-split__aside">
              <Cart
                items={cart}
                onIncrease={increase}
                onDecrease={decrease}
                onRemove={remove}
                onClear={clearCart}
                onCheckout={checkout}
                loading={loadingCheckout}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="toast-host">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} durationMs={toast.type === "error" ? 8500 : 5500} />
        </div>
      )}
    </div>
  );
}
