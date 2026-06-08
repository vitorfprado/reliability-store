export type ProductVisual = {
  emoji: string;
  label: string;
  gradientClass: string;
};

export function getProductVisual(name: string): ProductVisual {
  const n = name.toLowerCase();
  if (n.includes("notebook")) {
    return { emoji: "💻", label: "Notebook", gradientClass: "product-visual--notebook" };
  }
  if (n.includes("headset")) {
    return { emoji: "🎧", label: "Headset", gradientClass: "product-visual--headset" };
  }
  if (n.includes("teclado")) {
    return { emoji: "⌨️", label: "Teclado", gradientClass: "product-visual--keyboard" };
  }
  if (n.includes("mouse")) {
    return { emoji: "🖱️", label: "Mouse", gradientClass: "product-visual--mouse" };
  }
  if (n.includes("monitor")) {
    return { emoji: "🖥️", label: "Monitor", gradientClass: "product-visual--monitor" };
  }
  if (n.includes("webcam")) {
    return { emoji: "📷", label: "Webcam", gradientClass: "product-visual--webcam" };
  }
  if (n.includes("dock")) {
    return { emoji: "🔌", label: "Dock", gradientClass: "product-visual--dock" };
  }
  if (n.includes("ssd")) {
    return { emoji: "💾", label: "SSD", gradientClass: "product-visual--ssd" };
  }
  return { emoji: "🛒", label: "Produto", gradientClass: "product-visual--default" };
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
