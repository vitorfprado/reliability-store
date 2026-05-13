import { useCallback, useEffect, useMemo, useState } from "react";

import { api, getApiErrorMessage, type Product } from "./api/client";
import { Cart, type CartItem } from "./components/Cart";
import { CheckoutForm, type CheckoutPayload } from "./components/CheckoutForm";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { InventoryManager } from "./components/InventoryManager";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { ProductCard } from "./components/ProductCard";
import { Toast } from "./components/Toast";
import { formatBrl } from "./lib/productVisual";

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
  const SHIPPING_FEE = 19.9;
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activePage, setActivePage] = useState<"store" | "cart" | "checkout" | "confirmation" | "inventory">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastOrderCode, setLastOrderCode] = useState("");
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
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

  function addToCart(product: Product, quantity = 1) {
    const fresh = products.find((p) => p.id === product.id);
    if (!fresh || fresh.stock_quantity === 0) {
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === fresh.id);
      const nextQty = (existing?.quantity ?? 0) + quantity;
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
  const cartSubtotal = useMemo(() => cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cartSubtotal + (cart.length > 0 ? SHIPPING_FEE : 0), [cartSubtotal, cart.length]);

  async function openProductDetails(product: Product) {
    try {
      const detailed = await api.getProduct(product.id);
      setSelectedProduct(detailed);
    } catch {
      setSelectedProduct(product);
    }
  }

  function closeProductDetails() {
    setSelectedProduct(null);
  }

  function buyNow(product: Product, quantity: number) {
    addToCart(product, quantity);
    closeProductDetails();
    setActivePage("checkout");
  }

  async function checkout(payload: CheckoutPayload) {
    if (checkoutItems.length === 0) {
      setToast({ type: "info", message: "Seu carrinho esta vazio. Adicione itens para continuar." });
      return;
    }

    setLoadingCheckout(true);
    try {
      const result = await api.checkout(checkoutItems);
      const orderCode = `RS-${new Date().getFullYear()}-${String(result.order_id).padStart(4, "0")}`;
      setLastOrderCode(orderCode);
      setLastOrderTotal(result.total + SHIPPING_FEE);
      setLastOrderItems(cart);
      setToast({
        type: "success",
        message: `Pedido ${orderCode} confirmado para ${payload.fullName}. Total ${formatBrl(result.total + SHIPPING_FEE)}.`,
      });
      setCart([]);
      setActivePage("confirmation");
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
      <Header
        cartItemCount={cartItemCount}
        onGoHome={() => setActivePage("store")}
        onGoToCart={() => setActivePage("cart")}
        onGoToInventory={() => setActivePage("inventory")}
      />

      <main className="app__main">
        <div className="app__container">
          {activePage === "store" && (
            <>
              <Hero />
              <section id="catalogo" className="catalog" aria-labelledby="catalog-title">
                <div className="catalog__head">
                  <h2 id="catalog-title" className="catalog__title">
                    Produtos em destaque
                  </h2>
                  <p className="catalog__subtitle">Selecao de tecnologia para equipar sua rotina.</p>
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
                    <strong>Nao foi possivel carregar o catalogo.</strong>
                    <p>{catalogError}</p>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={loadProducts}>
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!catalogLoading && !catalogError && (
                  <div className="catalog__grid">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={addToCart} onViewDetails={openProductDetails} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activePage === "cart" && (
            <section className="cart-page">
              <h2>Carrinho de compras</h2>
              <Cart
                items={cart}
                shipping={SHIPPING_FEE}
                onIncrease={increase}
                onDecrease={decrease}
                onRemove={remove}
                onClear={clearCart}
                onContinueShopping={() => setActivePage("store")}
                onGoToCheckout={() => setActivePage("checkout")}
                loading={loadingCheckout}
              />
            </section>
          )}

          {activePage === "checkout" && (
            <CheckoutForm
              items={cart}
              shipping={SHIPPING_FEE}
              loading={loadingCheckout}
              onBack={() => setActivePage("cart")}
              onSubmit={checkout}
            />
          )}

          {activePage === "confirmation" && (
            <OrderConfirmation
              orderCode={lastOrderCode}
              total={lastOrderTotal || cartTotal}
              items={lastOrderItems}
              onBackToStore={() => setActivePage("store")}
            />
          )}

          {activePage === "inventory" && <InventoryManager />}
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="toast-host">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} durationMs={toast.type === "error" ? 8500 : 5500} />
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={closeProductDetails}
          onAddToCart={(product, quantity) => {
            addToCart(product, quantity);
            closeProductDetails();
            setToast({ type: "success", message: "Produto adicionado ao carrinho." });
          }}
          onBuyNow={buyNow}
        />
      )}
    </div>
  );
}
