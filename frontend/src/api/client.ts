export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:8000";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_filename: string | null;
}

export interface CartItemPayload {
  product_id: number;
  quantity: number;
}

export function getApiErrorMessage(payload: unknown): string {
  if (payload == null || typeof payload !== "object") {
    return "Não foi possível concluir a operação. Tente novamente.";
  }
  const obj = payload as Record<string, unknown>;
  const detail = obj.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const d = detail as Record<string, unknown>;
    if (typeof d.message === "string") {
      return d.message;
    }
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as Record<string, unknown>;
    if (typeof first.msg === "string") {
      return first.msg;
    }
  }
  return "Ocorreu um erro inesperado.";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw payload;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getProducts: () => request<Product[]>("/products"),
  checkout: (items: CartItemPayload[]) =>
    request<{ order_id: number; status: string; message: string; total: number }>("/checkout", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};
