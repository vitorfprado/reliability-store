export function Hero() {
  function scrollToCatalog() {
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow">Nova coleção</p>
          <h2 id="hero-title" className="hero__title">
            Tecnologia para sua rotina
          </h2>
          <p className="hero__text">
            Produtos selecionados para produtividade, estudo e trabalho. Monte seu carrinho e conclua um pedido simulado em
            poucos passos.
          </p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary" onClick={scrollToCatalog}>
              Ver produtos
            </button>
          </div>
        </div>
        <div className="hero__panel" aria-hidden>
          <div className="hero__panel-card hero__panel-card--a">
            <strong>Entrega para todo o Brasil</strong>
            <span>Frete simulado a partir de R$ 19,90</span>
          </div>
          <div className="hero__panel-card hero__panel-card--b">
            <strong>Compra rápida</strong>
            <span>Finalize em um checkout simples</span>
          </div>
          <div className="hero__panel-card hero__panel-card--c">
            <strong>Produtos em destaque</strong>
            <span>Curadoria com foco em tecnologia</span>
          </div>
        </div>
      </div>
    </section>
  );
}
