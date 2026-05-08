from dataclasses import dataclass, field

from .metrics import simulation_mode_enabled


@dataclass
class CheckoutErrorSimulation:
    enabled: bool = False
    error_rate: float = 0.3


@dataclass
class CheckoutLatencySimulation:
    enabled: bool = False
    min_delay_ms: int = 2000
    max_delay_ms: int = 5000


@dataclass
class CatalogUnavailableSimulation:
    enabled: bool = False


@dataclass
class ProductErrorSimulation:
    enabled: bool = False
    product_id: int | None = None


@dataclass
class SimulationState:
    checkout_error: CheckoutErrorSimulation = field(default_factory=CheckoutErrorSimulation)
    checkout_latency: CheckoutLatencySimulation = field(default_factory=CheckoutLatencySimulation)
    catalog_unavailable: CatalogUnavailableSimulation = field(default_factory=CatalogUnavailableSimulation)
    product_error: ProductErrorSimulation = field(default_factory=ProductErrorSimulation)


simulation_state = SimulationState()


def _set_mode_metric(mode: str, enabled: bool):
    simulation_mode_enabled.labels(mode=mode).set(1 if enabled else 0)


def initialize_simulation_metrics():
    _set_mode_metric("checkout_error", simulation_state.checkout_error.enabled)
    _set_mode_metric("checkout_latency", simulation_state.checkout_latency.enabled)
    _set_mode_metric("catalog_unavailable", simulation_state.catalog_unavailable.enabled)
    _set_mode_metric("product_error", simulation_state.product_error.enabled)


def set_checkout_error(enabled: bool, error_rate: float = 0.3):
    simulation_state.checkout_error.enabled = enabled
    simulation_state.checkout_error.error_rate = error_rate
    _set_mode_metric("checkout_error", enabled)


def set_checkout_latency(enabled: bool, min_delay_ms: int = 2000, max_delay_ms: int = 5000):
    simulation_state.checkout_latency.enabled = enabled
    simulation_state.checkout_latency.min_delay_ms = min_delay_ms
    simulation_state.checkout_latency.max_delay_ms = max_delay_ms
    _set_mode_metric("checkout_latency", enabled)


def set_catalog_unavailable(enabled: bool):
    simulation_state.catalog_unavailable.enabled = enabled
    _set_mode_metric("catalog_unavailable", enabled)


def set_product_error(enabled: bool, product_id: int | None = None):
    simulation_state.product_error.enabled = enabled
    simulation_state.product_error.product_id = product_id
    _set_mode_metric("product_error", enabled)


def reset_simulations():
    set_checkout_error(False, 0.3)
    set_checkout_latency(False, 2000, 5000)
    set_catalog_unavailable(False)
    set_product_error(False, None)


def state_as_dict() -> dict:
    return {
        "checkout_error": {"enabled": simulation_state.checkout_error.enabled, "error_rate": simulation_state.checkout_error.error_rate},
        "checkout_latency": {"enabled": simulation_state.checkout_latency.enabled, "min_delay_ms": simulation_state.checkout_latency.min_delay_ms, "max_delay_ms": simulation_state.checkout_latency.max_delay_ms},
        "catalog_unavailable": {"enabled": simulation_state.catalog_unavailable.enabled},
        "product_error": {"enabled": simulation_state.product_error.enabled, "product_id": simulation_state.product_error.product_id},
    }
