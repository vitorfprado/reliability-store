import { formatBrl } from "../lib/productVisual";
import type { CartItem } from "./Cart";

type OrderConfirmationProps = {
  orderCode: string;
  total: number;
  items: CartItem[];
  onBackToStore: () => void;
};

export function OrderConfirmation({ orderCode, total, items, onBackToStore }: OrderConfirmationProps) {
  return (
    <section className="confirmation-page">
      <h2>Pedido simulado realizado com sucesso</h2>
      <p>
        Numero do pedido: <strong>{orderCode}</strong>
      </p>
      <p>Status: Pedido recebido</p>
      <ul className="confirmation-page__items">
        {items.map((item) => (
          <li key={item.product.id}>
            <span>
              {item.product.name} x{item.quantity}
            </span>
            <strong>{formatBrl(item.product.price * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      <p className="confirmation-page__total">
        Total: <strong>{formatBrl(total)}</strong>
      </p>
      <button type="button" className="btn btn--primary" onClick={onBackToStore}>
        Voltar para a loja
      </button>
    </section>
  );
}
