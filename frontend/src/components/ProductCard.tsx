import { useState } from "react";

import type { Product } from "../api/client";
import { formatBrl, getProductVisual } from "../lib/productVisual";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

function stockBadge(stock: number): { text: string; className: string } {
  if (stock <= 0) {
    return { text: "Esgotado", className: "stock-badge stock-badge--out" };
  }
  if (stock <= 5) {
    return { text: "Últimas unidades", className: "stock-badge stock-badge--low" };
  }
  return { text: "Em estoque", className: "stock-badge stock-badge--ok" };
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const visual = getProductVisual(product.name);
  const badge = stockBadge(product.stock_quantity);
  const [imgFailed, setImgFailed] = useState(false);
  const imagePath = product.image_filename ? `/assets/products/${product.image_filename}` : "";

  return (
    <article className="product-card">
      <div className={`product-card__media ${visual.gradientClass}`}>
        {!imgFailed && imagePath ? (
          <img
            className="product-card__img"
            src={imagePath}
            alt=""
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="product-card__fallback">
            <span className="product-card__emoji">{visual.emoji}</span>
            <span className="product-card__fallback-label">{visual.label}</span>
          </div>
        )}
        <span className={badge.className}>{badge.text}</span>
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__desc">{product.description}</p>
        <div className="product-card__footer">
          <span className="product-card__price">{formatBrl(product.price)}</span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onAdd(product)}
            disabled={product.stock_quantity === 0}
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
