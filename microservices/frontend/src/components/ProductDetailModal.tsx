import { useState } from "react";

import type { Product } from "../api/client";
import { formatBrl, getProductVisual } from "../lib/productVisual";

type ProductDetailModalProps = {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
};

function stockBadge(stock: number): { text: string; className: string } {
  if (stock <= 0) {
    return { text: "Esgotado", className: "stock-badge stock-badge--out" };
  }
  if (stock <= 5) {
    return { text: "Ultimas unidades", className: "stock-badge stock-badge--low" };
  }
  return { text: "Em estoque", className: "stock-badge stock-badge--ok" };
}

function productRating(productId: number): { value: number; votes: number } {
  const value = 4 + ((productId * 7) % 10) / 10;
  const normalized = Number(Math.min(4.9, Math.max(4.0, value)).toFixed(1));
  const votes = 40 + (productId * 31) % 350;
  return { value: normalized, votes };
}

export function ProductDetailModal({ product, onClose, onAddToCart, onBuyNow }: ProductDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const visual = getProductVisual(product.name);
  const badge = stockBadge(product.stock_quantity);
  const rating = productRating(product.id);
  const imagePath = product.image_filename ? `/assets/products/${product.image_filename}` : "";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Detalhes do produto">
      <div className="product-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar detalhes">
          ×
        </button>
        <div className={`product-modal__media ${visual.gradientClass}`}>
          {!imgFailed && imagePath ? (
            <img className="product-modal__img" src={imagePath} alt={product.name} onError={() => setImgFailed(true)} />
          ) : (
            <div className="product-card__fallback">
              <span className="product-card__emoji">{visual.emoji}</span>
              <span className="product-card__fallback-label">{visual.label}</span>
            </div>
          )}
          <span className={badge.className}>{badge.text}</span>
        </div>
        <div className="product-modal__body">
          <h3>{product.name}</h3>
          <p className="product-modal__description">{product.description}</p>
          <div className="product-card__rating">
            <span className="product-card__stars" aria-hidden>
              ★★★★☆
            </span>
            <span className="product-card__score">{rating.value}</span>
            <span className="product-card__votes">({rating.votes} avaliacoes)</span>
          </div>
          <p className="product-modal__price">{formatBrl(product.price)}</p>
          <p className="product-modal__stock">Status: {badge.text}</p>

          <div className="product-modal__quantity">
            <span>Quantidade</span>
            <div className="cart-line__qty">
              <button type="button" className="qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="qty-val">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                disabled={quantity >= product.stock_quantity}
              >
                +
              </button>
            </div>
          </div>

          <div className="product-modal__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onAddToCart(product, quantity)}
              disabled={product.stock_quantity === 0}
            >
              Adicionar ao carrinho
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onBuyNow(product, quantity)}
              disabled={product.stock_quantity === 0}
            >
              Comprar agora
            </button>
          </div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Voltar para a vitrine
          </button>
        </div>
      </div>
    </div>
  );
}
