# Reliability Store

A **Reliability Store** é um ecommerce **didático** para aulas de **SLI, SLO, SLA e Error Budget** com base nos conceitos de SRE (incluindo o material de *Site Reliability Engineering*). O objetivo é mostrar **jornada do usuário**, **métricas** e **observabilidade** — não é uma loja real.

## Momento atual do projeto

Nesta etapa, a aplicação está em **modo funcional normal**: catálogo, carrinho e checkout operam como em um ecommerce simples, **sem painel de simulação de falhas na interface**.

- O backend continua instrumentado com **Prometheus** (`/metrics`).
- **Prometheus** e **Grafana** seguem disponíveis para exploração e futuros painéis de SLI/SLO.
- **Simulações de falha** (ex.: catálogo indisponível, erro intermitente no checkout) ficarão para uma **segunda fase**; endpoints administrativos podem permanecer na API, mas **não há controles disso no frontend** neste momento.
- Ao subir a API, os modos de simulação são **redefinidos para desligados**, garantindo início **saudável** para a demo.

## Stack

- Frontend: React + Vite + TypeScript (CSS organizado, sem biblioteca de UI pesada)
- Backend: FastAPI + SQLAlchemy + Pydantic + Uvicorn
- Banco: PostgreSQL
- Observabilidade: Prometheus + Grafana
- Execução: Docker + Docker Compose

## Como subir localmente

```bash
cp .env.example .env
docker compose up --build
```

### Variáveis importantes

- **`VITE_API_BASE_URL`**: URL da API **como o navegador a chama**, em geral `http://localhost:8000`. Não use o hostname do serviço Docker (`backend`) aqui — isso quebra chamadas feitas pelo browser.
- **`CORS_ORIGINS`**: Origens permitidas pelo backend (ex.: `http://localhost:5173`). Ajuste se mudar a porta do frontend.

Se você alterar `BACKEND_PORT`, atualize também `VITE_API_BASE_URL` para apontar para a porta publicada no host.

## Acessos

- Frontend: http://localhost:5173
- Backend (Swagger): http://localhost:8000/docs
- Métricas: http://localhost:8000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (usuário/senha padrão: `admin` / `admin`)

## Fluxo para a aula

1. Abra o frontend e navegue pelo **hero**, **catálogo** e **carrinho**.
2. Adicione produtos, ajuste quantidades e **finalize a compra**.
3. Observe o **estoque** atualizado após um checkout bem-sucedido.
4. Em paralelo, mostre **métricas** no Prometheus/Grafana (taxas, latências, contadores de checkout, etc.).

## Observabilidade

A API expõe métricas como:

- `http_requests_total`, `http_request_duration_seconds`
- `checkout_attempts_total`, `checkout_success_total`, `checkout_failure_total`
- `checkout_duration_seconds`
- `products_stock_quantity`, `orders_total`, `orders_revenue_total`
- `simulation_mode_enabled` (permanece disponível para quando a fase de simulações for reativada)

## Imagens de produtos

Coloque arquivos em `frontend/public/assets/products/` (mesmos nomes do seed, ex.: `notebook-atlas-14.jpg`). Se a imagem não existir, o card exibe um **fallback visual** (gradiente + emoji).

## Conceitos (didático)

- **SLI**: como medir qualidade percebida (ex.: sucesso do checkout, disponibilidade do catálogo).
- **SLO**: meta sobre um SLI (ex.: 99% de checkouts bem-sucedidos).
- **Error Budget**: quanto de falha ainda é aceitável dentro da janela do SLO.

## Queries PromQL úteis (referência)

### Disponibilidade do catálogo

```promql
sum(rate(http_requests_total{path="/products",status_code=~"2.."}[5m]))
/
sum(rate(http_requests_total{path="/products"}[5m]))
```

### Disponibilidade do checkout

```promql
sum(rate(checkout_success_total[5m]))
/
sum(rate(checkout_attempts_total[5m]))
```

### Latência p95 do checkout (HTTP)

```promql
histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket{path="/checkout"}[5m])) by (le)
)
```

### Taxa de erro 5xx

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

### Disponibilidade geral da API (2xx e 3xx)

```promql
sum(rate(http_requests_total{status_code=~"2..|3.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```
