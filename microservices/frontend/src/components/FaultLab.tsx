import { useEffect, useState, type ReactNode } from "react";

import { api, type FaultFlags } from "../api/client";

type FlagKey = keyof Omit<FaultFlags, "checkoutLatencyMs">;

type ToggleConfig = {
  flag: FlagKey;
  label: string;
  description: string;
};

const CHECKOUT_TOGGLES: ToggleConfig[] = [
  {
    flag: "checkoutError500",
    label: "Forcar erro 500 no checkout",
    description: "Todo POST de checkout retorna HTTP 500. checkout_attempts_total incrementa; checkout_success_total nao incrementa.",
  },
  {
    flag: "checkoutLatency",
    label: "Adicionar latencia de 5s no checkout",
    description: "O endpoint de checkout aguarda 5 segundos antes de responder. Impacta Checkout Latency no Grafana.",
  },
];

const PRODUCT_TOGGLES: ToggleConfig[] = [
  {
    flag: "productListError500",
    label: "Forcar erro 500 na listagem de produtos",
    description: "GET /products retorna HTTP 500. Impacta API Availability e Product Browsing Availability.",
  },
  {
    flag: "productDetailError500",
    label: "Forcar erro 500 no detalhe do produto",
    description: "GET /products/:id retorna HTTP 500. Impacta API Availability e Product Browsing Availability.",
  },
];

const GLOBAL_TOGGLES: ToggleConfig[] = [
  {
    flag: "globalApiError500",
    label: "Forcar erro 500 nas principais APIs",
    description:
      "Checkout, pedidos e produtos retornam HTTP 500. /health, /metrics e o Fault Lab continuam funcionando normalmente.",
  },
];

type FeedbackState = { type: "success" | "error"; message: string } | null;

function FaultToggle({
  config,
  checked,
  disabled,
  onToggle,
}: {
  config: ToggleConfig;
  checked: boolean;
  disabled: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className={`fault-toggle ${checked ? "fault-toggle--active" : ""}`}>
      <div className="fault-toggle__info">
        <span className="fault-toggle__label">{config.label}</span>
        <span className="fault-toggle__description">{config.description}</span>
      </div>
      <div className="fault-toggle__control">
        <span className={`fault-badge ${checked ? "fault-badge--on" : "fault-badge--off"}`}>
          {checked ? "Ativo" : "Inativo"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={config.label}
          disabled={disabled}
          onClick={() => onToggle(!checked)}
          className={`fault-switch ${checked ? "fault-switch--on" : ""}`}
        >
          <span className="fault-switch__knob" />
        </button>
      </div>
    </div>
  );
}

function FaultSection({
  title,
  toggles,
  flags,
  updating,
  onToggle,
  extra,
}: {
  title: string;
  toggles: ToggleConfig[];
  flags: FaultFlags;
  updating: string | null;
  onToggle: (flag: FlagKey, value: boolean) => void;
  extra?: ReactNode;
}) {
  return (
    <section className="fault-section">
      <h3 className="fault-section__title">{title}</h3>
      {toggles.map((cfg) => (
        <FaultToggle
          key={cfg.flag}
          config={cfg}
          checked={flags[cfg.flag] as boolean}
          disabled={updating !== null}
          onToggle={(value) => onToggle(cfg.flag, value)}
        />
      ))}
      {extra}
    </section>
  );
}

export function FaultLab() {
  const [flags, setFlags] = useState<FaultFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void loadFlags();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(id);
  }, [feedback]);

  async function loadFlags() {
    setLoading(true);
    try {
      setFlags(await api.getFaultFlags());
    } catch {
      setFeedback({ type: "error", message: "Nao foi possivel carregar o estado das flags." });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(flag: FlagKey, value: boolean) {
    setUpdating(flag);
    try {
      setFlags(await api.patchFaultFlags({ [flag]: value }));
      setFeedback({ type: "success", message: `"${flag}" ${value ? "ativada" : "desativada"} com sucesso.` });
    } catch {
      setFeedback({ type: "error", message: "Erro ao atualizar a flag. Tente novamente." });
    } finally {
      setUpdating(null);
    }
  }

  async function handleReset() {
    setUpdating("reset");
    try {
      setFlags(await api.resetFaultFlags());
      setFeedback({ type: "success", message: "Todas as falhas foram desativadas." });
    } catch {
      setFeedback({ type: "error", message: "Erro ao resetar as flags. Tente novamente." });
    } finally {
      setUpdating(null);
    }
  }

  const anyActive = flags
    ? Object.entries(flags).some(([k, v]) => k !== "checkoutLatencyMs" && v === true)
    : false;

  return (
    <div className="fault-lab">
      <div className="fault-lab__header">
        <div className="fault-lab__title-row">
          <h2 className="fault-lab__title">Fault Injection Lab</h2>
          {anyActive && <span className="fault-lab__active-badge">Falhas ativas</span>}
        </div>
        <p className="fault-lab__subtitle">
          Use este painel para simular falhas controladas e observar o impacto nas metricas, SLIs, SLOs e Error Budget no Grafana.
        </p>
      </div>

      {feedback && (
        <div className={`fault-feedback fault-feedback--${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      )}

      {loading && (
        <div className="fault-lab__loading" aria-busy="true">
          Carregando estado das flags...
        </div>
      )}

      {!loading && flags && (
        <div className="fault-lab__body">
          <FaultSection
            title="Checkout"
            toggles={CHECKOUT_TOGGLES}
            flags={flags}
            updating={updating}
            onToggle={handleToggle}
            extra={
              flags.checkoutLatency ? (
                <p className="fault-lab__latency-hint">
                  Latencia configurada: <strong>{flags.checkoutLatencyMs}ms</strong>
                </p>
              ) : null
            }
          />

          <FaultSection
            title="Produtos"
            toggles={PRODUCT_TOGGLES}
            flags={flags}
            updating={updating}
            onToggle={handleToggle}
          />

          <FaultSection
            title="Global"
            toggles={GLOBAL_TOGGLES}
            flags={flags}
            updating={updating}
            onToggle={handleToggle}
          />

          <div className="fault-lab__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleReset}
              disabled={updating !== null}
            >
              {updating === "reset" ? "Resetando..." : "Resetar falhas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
