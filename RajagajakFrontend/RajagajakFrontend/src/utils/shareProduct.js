export async function shareProduct(product, { url = window.location.href } = {}) {
  const title = String(product?.title || "RAJA GAJAK product");
  const text = `${title} - ${String(product?.description || "").replace(/\s+/g, " ").trim()}`.trim();

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return { method: "native" };
    } catch (error) {
      if (error?.name === "AbortError") return { method: "cancelled" };
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { method: "copied" };
    } catch {
      // Try the legacy copy fallback below.
    }
  }

  if (typeof document !== "undefined") {
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand?.("copy");
    input.remove();
    if (copied) return { method: "copied" };
  }

  return { method: "failed" };
}
