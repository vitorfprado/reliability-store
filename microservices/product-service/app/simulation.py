from dataclasses import dataclass, field

from .metrics import simulation_mode_enabled


@dataclass
class CatalogUnavailableSimulation:
    enabled: bool = False


@dataclass
class ProductErrorSimulation:
    enabled: bool = False
    product_id: int | None = None


@dataclass
class SimulationState:
    catalog_unavailable: CatalogUnavailableSimulation = field(default_factory=CatalogUnavailableSimulation)
    product_error: ProductErrorSimulation = field(default_factory=ProductErrorSimulation)


simulation_state = SimulationState()


def _set_mode_metric(mode: str, enabled: bool):
    simulation_mode_enabled.labels(mode=mode).set(1 if enabled else 0)


def initialize_simulation_metrics():
    _set_mode_metric("catalog_unavailable", simulation_state.catalog_unavailable.enabled)
    _set_mode_metric("product_error", simulation_state.product_error.enabled)


def set_catalog_unavailable(enabled: bool):
    simulation_state.catalog_unavailable.enabled = enabled
    _set_mode_metric("catalog_unavailable", enabled)


def set_product_error(enabled: bool, product_id: int | None = None):
    simulation_state.product_error.enabled = enabled
    simulation_state.product_error.product_id = product_id
    _set_mode_metric("product_error", enabled)


def reset_simulations():
    set_catalog_unavailable(False)
    set_product_error(False, None)


def state_as_dict() -> dict:
    return {
        "catalog_unavailable": {"enabled": simulation_state.catalog_unavailable.enabled},
        "product_error": {"enabled": simulation_state.product_error.enabled, "product_id": simulation_state.product_error.product_id},
    }
