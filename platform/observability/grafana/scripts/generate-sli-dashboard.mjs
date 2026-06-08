import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "dashboards", "sli-slo-error-budget.json");

const sliThresholds = [
  { color: "red", value: 0 },
  { color: "yellow", value: 0.9 },
  { color: "green", value: 0.99 },
];

const budgetSteps = [
  { color: "green", value: null },
  { color: "#EAB839", value: 70 },
  { color: "dark-red", value: 90 },
];

const budgetStepsCheckout = [
  { color: "green", value: null },
  { color: "#EAB839", value: 70 },
  { color: "semi-dark-red", value: 90 },
];

function statViz(steps, unit = "percentunit") {
  return {
    group: "stat",
    kind: "VizConfig",
    spec: {
      fieldConfig: {
        defaults: {
          color: { mode: "thresholds" },
          thresholds: { mode: "absolute", steps },
          unit,
        },
        overrides: [],
      },
      options: {
        colorMode: "value",
        graphMode: "none",
        justifyMode: "auto",
        orientation: "auto",
        percentChangeColorMode: "standard",
        reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
        showPercentChange: false,
        textMode: "auto",
        wideLayout: true,
      },
    },
    version: "13.0.1",
  };
}

/** SLI com fundo por limiar (checkout / latência) */
function sliBackgroundViz(steps, unit = "percentunit") {
  const v = statViz(steps, unit);
  v.spec.fieldConfig.defaults.decimals = 2;
  v.spec.options.colorMode = "background";
  return v;
}

const apiAvailabilityViz = sliBackgroundViz([
  { color: "semi-dark-red", value: 0 },
  { color: "#EAB839", value: 0.95 },
  { color: "green", value: 0.98 },
]);

const productBrowsingSliViz = sliBackgroundViz([
  { color: "semi-dark-red", value: 0 },
  { color: "#EAB839", value: 0.95 },
  { color: "green", value: 0.98 },
]);

function panel(id, title, expr, vizConfig) {
  return {
    kind: "Panel",
    spec: {
      data: {
        kind: "QueryGroup",
        spec: {
          queries: [
            {
              kind: "PanelQuery",
              spec: {
                hidden: false,
                query: {
                  group: "prometheus",
                  kind: "DataQuery",
                  spec: {
                    editorMode: "code",
                    expr,
                    legendFormat: "__auto",
                    range: true,
                  },
                  version: "v0",
                },
                refId: "A",
              },
            },
          ],
          queryOptions: {},
          transformations: [],
        },
      },
      description: "",
      id,
      links: [],
      title,
      vizConfig: vizConfig,
    },
  };
}

const sloTargetViz = {
  group: "stat",
  kind: "VizConfig",
  spec: {
    fieldConfig: {
      defaults: {
        color: { mode: "thresholds" },
        decimals: 2,
        thresholds: { mode: "absolute", steps: [{ color: "text", value: null }] },
        unit: "percent",
      },
      overrides: [],
    },
    options: {
      colorMode: "value",
      graphMode: "none",
      justifyMode: "auto",
      orientation: "auto",
      percentChangeColorMode: "standard",
      reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
      showPercentChange: false,
      textMode: "auto",
      wideLayout: true,
    },
  },
  version: "13.0.1",
};

const budgetViz = (steps) => ({
  group: "stat",
  kind: "VizConfig",
  spec: {
    fieldConfig: {
      defaults: {
        color: { mode: "thresholds" },
        decimals: 2,
        thresholds: { mode: "absolute", steps },
        unit: "percent",
      },
      overrides: [],
    },
    options: {
      colorMode: "background",
      graphMode: "none",
      justifyMode: "auto",
      orientation: "auto",
      percentChangeColorMode: "standard",
      reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false },
      showPercentChange: false,
      textMode: "auto",
      wideLayout: true,
    },
  },
  version: "13.0.1",
});

const dashboard = {
  annotations: [
    {
      kind: "AnnotationQuery",
      spec: {
        builtIn: true,
        enable: true,
        hide: true,
        iconColor: "rgba(0, 211, 255, 1)",
        name: "Annotations & Alerts",
        query: {
          group: "grafana",
          kind: "DataQuery",
          spec: {},
          version: "v0",
        },
      },
    },
  ],
  cursorSync: "Off",
  editable: true,
  elements: {
    "panel-1": panel(
      1,
      "SLI — HTTP não-5xx (agregado)",
      'sum(rate(http_requests_total{status_code!~"5.."}[$__range])) / sum(rate(http_requests_total[$__range]))',
      apiAvailabilityViz
    ),
    "panel-2": panel(
      2,
      "SLI — checkout sucesso / tentativas",
      "sum(rate(checkout_success_total[$__range])) / sum(rate(checkout_attempts_total[$__range]))",
      sliBackgroundViz(sliThresholds)
    ),
    "panel-3": panel(
      3,
      "SLI — checkout ≤ 2s",
      'sum(rate(checkout_duration_seconds_bucket{le="2.0"}[$__range])) / sum(rate(checkout_duration_seconds_count[$__range]))',
      sliBackgroundViz(sliThresholds)
    ),
    "panel-4": panel(4, "SLO alvo (disponibilidade)", "vector(99)", sloTargetViz),
    "panel-5": panel(
      5,
      "Error budget consumido (HTTP, janela do dashboard)",
      `clamp_min(
  100 *
  (
    1 -
    (
      sum(increase(http_requests_total{status_code!~"5.."}[$__range]))
      /
      sum(increase(http_requests_total[$__range]))
    )
  )
  /
  (1 - 0.99),
  0
)`,
      budgetViz(budgetSteps)
    ),
    "panel-6": panel(6, "SLO alvo (checkout)", "vector(99)", sloTargetViz),
    "panel-7": panel(
      7,
      "Error budget consumido (checkout, janela do dashboard)",
      `clamp_min(
  100 *
  (
    1 -
    (
      sum(increase(checkout_success_total[$__range]))
      /
      sum(increase(checkout_attempts_total[$__range]))
    )
  )
  /
  (1 - 0.99),
  0
)`,
      budgetViz(budgetStepsCheckout)
    ),
    "panel-8": panel(8, "SLO alvo (latência checkout)", "vector(99)", sloTargetViz),
    "panel-9": panel(
      9,
      "Error budget consumido (latência checkout, janela do dashboard)",
      `clamp_min(
  100 *
  (
    1 -
    (
      sum(increase(checkout_duration_seconds_bucket{le="2.0"}[$__range]))
      /
      sum(increase(checkout_duration_seconds_count[$__range]))
    )
  )
  /
  (1 - 0.99),
  0
)`,
      budgetViz(budgetStepsCheckout)
    ),
    "panel-10": panel(
      10,
      "SLI — GET /products (lista + detalhe) não-5xx",
      '(sum(rate(http_requests_total{job="product-service",method="GET",path="/products",status_code!~"5.."}[$__range])) + sum(rate(http_requests_total{job="product-service",method="GET",path="/products/{product_id}",status_code!~"5.."}[$__range]))) / (sum(rate(http_requests_total{job="product-service",method="GET",path="/products"}[$__range])) + sum(rate(http_requests_total{job="product-service",method="GET",path="/products/{product_id}"}[$__range])))',
      productBrowsingSliViz
    ),
    "panel-11": panel(11, "SLO alvo (catálogo)", "vector(99)", sloTargetViz),
    "panel-12": panel(
      12,
      "Error budget consumido (catálogo, janela do dashboard)",
      `clamp_min(
  100 *
  (
    1 -
    (
      (
        sum(increase(http_requests_total{job="product-service",method="GET",path="/products",status_code!~"5.."}[$__range]))
        +
        sum(increase(http_requests_total{job="product-service",method="GET",path="/products/{product_id}",status_code!~"5.."}[$__range]))
      )
      /
      (
        sum(increase(http_requests_total{job="product-service",method="GET",path="/products"}[$__range]))
        +
        sum(increase(http_requests_total{job="product-service",method="GET",path="/products/{product_id}"}[$__range]))
      )
    )
  )
  /
  (1 - 0.99),
  0
)`,
      budgetViz(budgetSteps)
    ),
  },
  layout: {
    kind: "RowsLayout",
    spec: {
      rows: [
        {
          kind: "RowsLayoutRow",
          spec: {
            collapse: false,
            layout: {
              kind: "GridLayout",
              spec: {
                items: [
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-1" },
                      height: 6,
                      width: 8,
                      x: 0,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-4" },
                      height: 6,
                      width: 8,
                      x: 8,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-5" },
                      height: 6,
                      width: 8,
                      x: 16,
                      y: 0,
                    },
                  },
                ],
              },
            },
            title: "API Availability",
          },
        },
        {
          kind: "RowsLayoutRow",
          spec: {
            collapse: false,
            layout: {
              kind: "GridLayout",
              spec: {
                items: [
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-2" },
                      height: 6,
                      width: 8,
                      x: 0,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-6" },
                      height: 6,
                      width: 8,
                      x: 8,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-7" },
                      height: 6,
                      width: 8,
                      x: 16,
                      y: 0,
                    },
                  },
                ],
              },
            },
            title: "Checkout Success",
          },
        },
        {
          kind: "RowsLayoutRow",
          spec: {
            collapse: false,
            layout: {
              kind: "GridLayout",
              spec: {
                items: [
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-3" },
                      height: 6,
                      width: 8,
                      x: 0,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-8" },
                      height: 6,
                      width: 8,
                      x: 8,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-9" },
                      height: 6,
                      width: 8,
                      x: 16,
                      y: 0,
                    },
                  },
                ],
              },
            },
            title: "Checkout Latency",
          },
        },
        {
          kind: "RowsLayoutRow",
          spec: {
            collapse: false,
            layout: {
              kind: "GridLayout",
              spec: {
                items: [
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-10" },
                      height: 6,
                      width: 8,
                      x: 0,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-11" },
                      height: 6,
                      width: 8,
                      x: 8,
                      y: 0,
                    },
                  },
                  {
                    kind: "GridLayoutItem",
                    spec: {
                      element: { kind: "ElementReference", name: "panel-12" },
                      height: 6,
                      width: 8,
                      x: 16,
                      y: 0,
                    },
                  },
                ],
              },
            },
            title: "Product Browsing Availability",
          },
        },
      ],
    },
  },
  links: [],
  liveNow: false,
  preferences: { layout: { kind: "GridLayout", spec: { items: [] } } },
  preload: false,
  tags: ["reliability-store", "sli", "slo"],
  timeSettings: {
    autoRefresh: "",
    autoRefreshIntervals: ["5s", "10s", "30s", "1m", "5m", "15m", "30m", "1h", "2h", "1d"],
    fiscalYearStartMonth: 0,
    from: "now-6h",
    hideTimepicker: false,
    timezone: "browser",
    to: "now",
  },
  title: "SLI, SLO & Error Budget - TESTE",
  variables: [],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(dashboard, null, 2) + "\n", "utf8");
console.log("Wrote", out);
