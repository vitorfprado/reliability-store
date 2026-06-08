from threading import Lock

_lock = Lock()

_DEFAULTS: dict = {
    "checkoutError500": False,
    "checkoutLatency": False,
    "checkoutLatencyMs": 5000,
    "globalApiError500": False,
}

_KNOWN = set(_DEFAULTS.keys())
_state: dict = dict(_DEFAULTS)


def get_flags() -> dict:
    with _lock:
        return dict(_state)


def update_flags(updates: dict) -> dict:
    with _lock:
        for k, v in updates.items():
            if k in _KNOWN:
                _state[k] = v
        return dict(_state)


def reset_flags() -> dict:
    with _lock:
        _state.clear()
        _state.update(_DEFAULTS)
        return dict(_state)
