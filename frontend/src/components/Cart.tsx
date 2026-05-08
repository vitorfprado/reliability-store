import type { Product } from "../api/client";
import { formatBrl } from "../lib/productVisual";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartProps = {
  items: CartItem[];
  onIncrease: (productId: number) => void;
  onDecrease: (productId: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
  onCheckout: () => void;
  loading: boolean;
};

export function Cart({ items, onIncrease, onDecrease, onRemove, onClear, onCheckout, loading }: CartProps) {
  const total = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <aside id="carrinho" className="cart-panel">
      <div className="cart-panel__head">
        <h2 className="cart-panel__title">Carrinho</h2>
        {items.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
            Limpar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="cart-panel__empty">
          <span className="cart-panel__empty-icon" aria-hidden>
            🛒
          </span>
          <p>
            Seu carrinho está vazio.
            <br />
            Adicione produtos para iniciar uma compra.
          </p>
        </div>
      ) : (
        <ul className="cart-panel__list">
          {items.map((item) => {
            const subtotal = item.product.price * item.quantity;
            return (
              <li key={item.product.id} className="cart-line">
                <div className="cart-line__info">
                  <span className="cart-line__name">{item.product.name}</span>
                  <span className="cart-line__meta">{formatBrl(item.product.price)} · un.</span>
                </div>
                <div className="cart-line__qty">
                  <button type="button" className="qty-btn" onClick={() => onDecrease(item.product.id)} aria-label="Diminuir">
                    −
                  </button>
                  <span className="qty-val">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => onIncrease(item.product.id)}
                    disabled={item.quantity >= item.product.stock_quantity}
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
                <div className="cart-line__sub">{formatBrl(subtotal)}</div>
                <button type="button" className="cart-line__remove" onClick={() => onRemove(item.product.id)}>
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="cart-panel__foot">
        <div className="cart-panel__total-row">
          <span>Total</span>
          <strong>{formatBrl(total)}</strong>
        </div>
        <button type="button" className="btn btn--primary cart-panel__checkout" onClick={onCheckout} disabled={items.length === 0 || loading}>
          {loading ? "Finalizando…" : "Finalizar compra"}
        </button>
      </div>
    </aside>
  );
}
