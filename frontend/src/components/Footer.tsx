export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <strong>Reliability Store</strong>
          <p>Lab local para SLI, SLO, SLA e Error Budget</p>
        </div>
        <nav className="site-footer__links" aria-label="Links úteis">
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            API Docs
          </a>
          <a href="http://localhost:9090" target="_blank" rel="noreferrer">
            Prometheus
          </a>
          <a href="http://localhost:3000" target="_blank" rel="noreferrer">
            Grafana
          </a>
        </nav>
      </div>
    </footer>
  );
}
