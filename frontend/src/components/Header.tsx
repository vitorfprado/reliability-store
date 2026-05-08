type HeaderProps = {
  cartItemCount: number;
  onCartAnchorClick?: () => void;
};

const DOCS = "http://localhost:8000/docs";
const PROM = "http://localhost:9090";
const GRAF = "http://localhost:3000";

export function Header({ cartItemCount, onCartAnchorClick }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__brand">
          <span className="site-header__logo" aria-hidden>
            RS
          </span>
          <div>
            <h1 className="site-header__title">Reliability Store</h1>
            <p className="site-header__tagline">Loja demonstrativa para confiabilidade e observabilidade</p>
          </div>
        </div>
        <nav className="site-header__nav" aria-label="Links externos">
          <a href={DOCS} target="_blank" rel="noreferrer">
            API Docs
          </a>
          <a href={PROM} target="_blank" rel="noreferrer">
            Prometheus
          </a>
          <a href={GRAF} target="_blank" rel="noreferrer">
            Grafana
          </a>
        </nav>
        <a href="#carrinho" className="site-header__cart" onClick={() => onCartAnchorClick?.()}>
          <span className="site-header__cart-icon" aria-hidden>
            🛒
          </span>
          <span className="site-header__cart-label">Carrinho</span>
          <span className="site-header__cart-badge">{cartItemCount}</span>
        </a>
      </div>
    </header>
  );
}
