import time
from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

http_requests_total = Counter("http_requests_total", "Total de requisições HTTP", ["method", "path", "status_code"])
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "Duração de requisições HTTP",
    ["method", "path", "status_code"],
    buckets=(0.05, 0.1, 0.2, 0.4, 0.8, 1, 2, 5, 10),
)
checkout_attempts_total = Counter("checkout_attempts_total", "Total de tentativas de checkout")
checkout_success_total = Counter("checkout_success_total", "Total de checkouts com sucesso")
checkout_failure_total = Counter("checkout_failure_total", "Total de checkouts com falha", ["failure_reason"])
checkout_duration_seconds = Histogram("checkout_duration_seconds", "Duração do checkout", buckets=(0.05, 0.1, 0.2, 0.4, 0.8, 1, 2, 5, 10))
products_stock_quantity = Gauge("products_stock_quantity", "Estoque atual por produto", ["product_id", "product_name"])
orders_total = Counter("orders_total", "Total de pedidos por status", ["status"])
orders_revenue_total = Counter("orders_revenue_total", "Receita total dos pedidos confirmados")
simulation_mode_enabled = Gauge("simulation_mode_enabled", "Estado dos modos de simulação", ["mode"])


def get_metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


async def track_http_metrics(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    route = request.scope.get("route")
    normalized_path = getattr(route, "path", request.url.path)
    status_code = str(response.status_code)
    http_requests_total.labels(request.method, normalized_path, status_code).inc()
    http_request_duration_seconds.labels(request.method, normalized_path, status_code).observe(elapsed)
    return response
