export function Hero() {
  function scrollToCatalog() {
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow">Ecommerce didático</p>
          <h2 id="hero-title" className="hero__title">
            Compre tecnologia com confiabilidade
          </h2>
          <p className="hero__text">
            Uma loja didática para demonstrar disponibilidade, latência, falhas e experiência do usuário — com métricas reais
            no Prometheus e painéis no Grafana.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={scrollToCatalog}>
              Ver produtos
            </button>
          </div>
        </div>
        <div className="hero__panel" aria-hidden>
          <div className="hero__panel-card hero__panel-card--a">
            <strong>Checkout monitorado</strong>
            <span>Eventos registrados na API</span>
          </div>
          <div className="hero__panel-card hero__panel-card--b">
            <strong>Métricas em tempo real</strong>
            <span>Scrape Prometheus a cada 5s</span>
          </div>
          <div className="hero__panel-card hero__panel-card--c">
            <strong>SLI / SLO ready</strong>
            <span>Pronto para laboratório de SRE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
