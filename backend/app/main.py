import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import Base, SessionLocal, engine, wait_for_database
from .metrics import get_metrics_response, track_http_metrics
from .routes import admin, checkout, health, orders, products
from .seed import refresh_products_stock_gauge, seed_products
from .simulation import initialize_simulation_metrics, reset_simulations

app = FastAPI(title="Reliability Store API", version="1.0.0")

_origins_default = "http://localhost:5173,http://127.0.0.1:5173"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", _origins_default).split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    return await track_http_metrics(request, call_next)


@app.on_event("startup")
def on_startup():
    wait_for_database()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_products(db)
        refresh_products_stock_gauge(db)
        reset_simulations()
        initialize_simulation_metrics()
    finally:
        db.close()


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"status": "failed", "reason": "internal_error", "message": "Erro interno ao processar a requisição"})


app.include_router(health.router)
app.include_router(products.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/metrics", include_in_schema=False)
def metrics_endpoint():
    return get_metrics_response()
