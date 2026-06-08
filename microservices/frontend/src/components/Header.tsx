type HeaderProps = {
  cartItemCount: number;
  onGoHome: () => void;
  onGoToCart: () => void;
  onGoToInventory: () => void;
  onGoToFaultLab: () => void;
};

export function Header({ cartItemCount, onGoHome, onGoToCart, onGoToInventory, onGoToFaultLab }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <span className="site-header__logo" aria-hidden>
            RS
          </span>
          <div>
            <h1 className="site-header__title">Reliability Store</h1>
            <p className="site-header__tagline">Sua loja de tecnologia para estudo, trabalho e produtividade</p>
          </div>
        </div>
        <nav className="site-header__nav" aria-label="Navegação principal">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onGoHome}>
            Início
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onGoToCart}>
            Carrinho
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onGoToInventory}>
            Estoque
          </button>
          <button type="button" className="btn btn--ghost btn--sm header-faultlab-btn" onClick={onGoToFaultLab}>
            Fault Lab
          </button>
        </nav>
        <button type="button" className="site-header__cart" onClick={onGoToCart}>
          <span className="site-header__cart-icon" aria-hidden>
            🛒
          </span>
          <span className="site-header__cart-label">Carrinho</span>
          <span className="site-header__cart-badge">{cartItemCount}</span>
        </button>
      </div>
    </header>
  );
}
