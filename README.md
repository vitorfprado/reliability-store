# Reliability Store

A **Reliability Store** é um ecommerce **didático** para aulas de **SLI, SLO, SLA e Error Budget** com base nos conceitos de SRE (incluindo o material de *Site Reliability Engineering*). O objetivo é mostrar **jornada do usuário**, **métricas** e **observabilidade** — não é uma loja real.

## Arquitetura de microserviços

```
Browser
  └─ Nginx (porta 80)
       ├─ /products   → product-service  :8001  (catálogo: nome, preço, imagem)
       ├─ /checkout   → order-service    :8002  (pedidos + checkout)
       ├─ /orders     → order-service    :8002
       ├─ /inventory  → inventory-service:8003  (fonte da verdade do estoque)
       └─ /           → frontend         :5173  (React + Vite)

Fluxo de checkout:
  order-service
    ├─ GET  product-service/products/{id}         → valida produto e obtém preço
    │       (product-service chama inventory para stock_quantity ao responder)
    └─ POST inventory-service/inventory/{id}/deduct → deduz estoque atomicamente
```

### Decisão de design: separação de responsabilidades

| Serviço | Responsabilidade |
|---|---|
| `product-service` | Catálogo: nome, descrição, preço, imagem. Retorna `stock_quantity` lido do `inventory-service` (fallback para valor em DB se indisponível). |
| `inventory-service` | **Fonte da verdade** para quantidades em estoque. Tabela própria `inventory(product_id, quantity)`. Expõe ajuste manual e dedução atômica para checkout. |
| `order-service` | Pedidos e checkout. Valida produto via `product-service`; deduz estoque via `inventory-service`. |

## Momento atual do projeto

- Aplicação funcional: catálogo, carrinho, checkout, **gerenciador de estoque**.
- Observabilidade completa: traces distribuídos (OTEL → Tempo), logs JSON com `trace_id` (Loki), métricas Prometheus.
- Simulações de falha disponíveis via API (`/admin/simulation`) — sem controles no frontend nesta fase.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | FastAPI + SQLAlchemy + Pydantic + Uvicorn |
| Banco | PostgreSQL (tabelas `products` e `inventory` isoladas por serviço) |
| Observabilidade | Prometheus + Grafana + Loki + Tempo + OpenTelemetry |
| Execução | Docker + Docker Compose |

## Como subir localmente

```bash
cp .env.example .env
docker compose up --build
```

### Variáveis importantes

- **`VITE_API_BASE_URL`**: URL da API **como o navegador a chama**, em geral `http://localhost`. Não use o hostname do serviço Docker aqui — isso quebra chamadas feitas pelo browser.
- **`CORS_ORIGINS`**: Origens permitidas pelo backend. Ajuste se mudar a porta do frontend.
- **`INVENTORY_SERVICE_URL`**: URL interna do `inventory-service` (padrão: `http://inventory-service:8003`). Usado por `product-service` e `order-service`.

Se você alterar `BACKEND_PORT`, atualize também `VITE_API_BASE_URL`.

## Acessos

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API (Swagger) | http://localhost/docs |
| product-service direto | http://localhost:8001/docs |
| order-service direto | http://localhost:8002/docs |
| inventory-service direto | http://localhost:8003/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin/admin) |

## Fluxo para a aula

1. Abra o frontend e navegue pelo **catálogo** e **carrinho**.
2. Adicione produtos e **finalize a compra** — observe o estoque diminuir.
3. Acesse **Estoque** no menu para ajustar quantidades via `inventory-service`.
4. Em paralelo, explore métricas no Prometheus/Grafana (taxas, latências, contadores).
5. Opcional: acione simulações de falha via `/admin/simulation` e observe o impacto nos SLIs.

## Observabilidade

Métricas expostas em `/metrics` de cada serviço:

- `http_requests_total`, `http_request_duration_seconds`
- `checkout_attempts_total`, `checkout_success_total`, `checkout_failure_total`
- `checkout_duration_seconds`, `orders_total`, `orders_revenue_total`
- `inventory_stock_quantity` (no `inventory-service` — estoque em tempo real)
- `simulation_mode_enabled`

Traces distribuídos propagam `traceparent` em todas as chamadas HTTP internas:
`browser → nginx → order-service → product-service → inventory-service`

## Imagens de produtos

Coloque arquivos em `frontend/public/assets/products/` (ex.: `notebook-atlas-14.jpg`). Se a imagem não existir, o card exibe um fallback visual (gradiente + emoji).

## Conceitos (didático)

- **SLI**: como medir qualidade percebida (ex.: sucesso do checkout, disponibilidade do catálogo).
- **SLO**: meta sobre um SLI (ex.: 99% de checkouts bem-sucedidos em 30 dias).
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

### Latência p95 do checkout

```promql
histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket{path="/checkout"}[5m])) by (le)
)
```

### Estoque atual por produto (inventory-service)

```promql
inventory_stock_quantity
```

### Taxa de erro 5xx geral

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```
