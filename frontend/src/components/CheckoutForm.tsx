import { useMemo, useState } from "react";

import type { Product } from "../api/client";
import { formatBrl } from "../lib/productVisual";
import type { CartItem } from "./Cart";

type CheckoutFormProps = {
  items: CartItem[];
  shipping: number;
  loading: boolean;
  onBack: () => void;
  onSubmit: (payload: CheckoutPayload) => void;
};

export type CheckoutPayload = {
  fullName: string;
  email: string;
  phone: string;
  zipCode: string;
  address: string;
  number: string;
  city: string;
  state: string;
  paymentMethod: "pix" | "card" | "boleto";
};

function summarizeItems(items: CartItem[]): { product: Product; quantity: number; subtotal: number }[] {
  return items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
    subtotal: item.quantity * item.product.price,
  }));
}

export function CheckoutForm({ items, shipping, loading, onBack, onSubmit }: CheckoutFormProps) {
  const [form, setForm] = useState<CheckoutPayload>({
    fullName: "",
    email: "",
    phone: "",
    zipCode: "",
    address: "",
    number: "",
    city: "",
    state: "",
    paymentMethod: "pix",
  });
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => summarizeItems(items), [items]);
  const subtotal = useMemo(() => summary.reduce((acc, item) => acc + item.subtotal, 0), [summary]);
  const total = subtotal + shipping;

  function update<K extends keyof CheckoutPayload>(key: K, value: CheckoutPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (!form.fullName || !form.email || !form.phone || !form.zipCode || !form.address || !form.number || !form.city || !form.state) {
      setError("Preencha todos os campos para finalizar o pedido simulado.");
      return;
    }
    setError(null);
    onSubmit(form);
  }

  return (
    <section className="checkout-page">
      <h2>Checkout simulado</h2>
      <p className="checkout-page__helper">Preencha seus dados para concluir o pedido. Nenhuma cobranca real sera processada.</p>
      <div className="checkout-grid">
        <div className="checkout-form">
          <label>
            Nome completo
            <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </label>
          <label>
            E-mail
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label>
            Telefone
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </label>
          <label>
            CEP
            <input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} />
          </label>
          <label>
            Endereco
            <input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </label>
          <label>
            Numero
            <input value={form.number} onChange={(e) => update("number", e.target.value)} />
          </label>
          <label>
            Cidade
            <input value={form.city} onChange={(e) => update("city", e.target.value)} />
          </label>
          <label>
            Estado
            <input value={form.state} onChange={(e) => update("state", e.target.value)} />
          </label>
          <fieldset className="checkout-form__payment">
            <legend>Forma de pagamento (simulada)</legend>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                checked={form.paymentMethod === "pix"}
                onChange={() => update("paymentMethod", "pix")}
              />
              Pix simulado
            </label>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                checked={form.paymentMethod === "card"}
                onChange={() => update("paymentMethod", "card")}
              />
              Cartao ficticio
            </label>
            <label>
              <input
                type="radio"
                name="paymentMethod"
                checked={form.paymentMethod === "boleto"}
                onChange={() => update("paymentMethod", "boleto")}
              />
              Boleto simulado
            </label>
          </fieldset>

          {error && <p className="checkout-form__error">{error}</p>}

          <div className="checkout-form__actions">
            <button type="button" className="btn btn--ghost" onClick={onBack}>
              Voltar ao carrinho
            </button>
            <button type="button" className="btn btn--primary" onClick={submit} disabled={loading}>
              {loading ? "Finalizando..." : "Finalizar pedido simulado"}
            </button>
          </div>
        </div>
        <aside className="checkout-summary">
          <h3>Resumo do pedido</h3>
          <ul>
            {summary.map((item) => (
              <li key={item.product.id}>
                <span>
                  {item.product.name} x{item.quantity}
                </span>
                <strong>{formatBrl(item.subtotal)}</strong>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__totals">
            <p>
              <span>Subtotal</span>
              <strong>{formatBrl(subtotal)}</strong>
            </p>
            <p>
              <span>Frete simulado</span>
              <strong>{formatBrl(shipping)}</strong>
            </p>
            <p className="checkout-summary__grand-total">
              <span>Total</span>
              <strong>{formatBrl(total)}</strong>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
