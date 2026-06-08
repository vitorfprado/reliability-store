import logging
import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from pythonjsonlogger import jsonlogger


class TraceIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:
            record.trace_id = format(ctx.trace_id, "032x")
            record.span_id = format(ctx.span_id, "016x")
        else:
            record.trace_id = "0" * 32
            record.span_id = "0" * 16
        return True


def setup_telemetry(app, service_name: str, db_engine=None) -> None:
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(trace_id)s %(span_id)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    handler.addFilter(TraceIdFilter())

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]

    otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": os.getenv("ENVIRONMENT", "local"),
    })

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=otel_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    if db_engine is not None:
        SQLAlchemyInstrumentor().instrument(engine=db_engine)
