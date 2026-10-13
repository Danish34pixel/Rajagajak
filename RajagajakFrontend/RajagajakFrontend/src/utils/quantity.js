export const MIN_QUANTITY_KG = 0.3;
export const DEFAULT_QUANTITY_KG = MIN_QUANTITY_KG;

const quantityOptionsKg = [
  0.3, 0.5, 0.7, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
];

export const formatQuantity = (quantityKg) => {
  const grams = Math.round(Number(quantityKg) * 1000);
  if (grams < 1000) return `${grams} g`;
  const kilograms = grams / 1000;
  return `${kilograms.toFixed(3).replace(/\.?0+$/, "")} kg`;
};

export const normalizeQuantityKg = (quantityKg) => {
  const value = Number(quantityKg);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_QUANTITY_KG;
  return Math.max(MIN_QUANTITY_KG, Math.round(value * 10) / 10);
};

export const getSelectableMaxStockKg = (stockKg) => {
  const stock = Number(stockKg);
  if (!Number.isFinite(stock)) return 10;
  return Math.floor((stock + Number.EPSILON) * 10) / 10;
};

export const getQuantityOptions = (maxStockKg = 10) => {
  const maxStock = Number(maxStockKg);
  return quantityOptionsKg.filter(
    (quantityKg) => quantityKg <= maxStock + Number.EPSILON,
  );
};

export const getNextQuantityKg = (quantityKg, direction, maxStockKg = 10) => {
  const current = Number(quantityKg);
  const options = getQuantityOptions(maxStockKg);
  if (direction < 0) {
    return (
      options.filter((value) => value < current - Number.EPSILON).at(-1) ??
      MIN_QUANTITY_KG
    );
  }
  const nextOption = options.find(
    (value) => value > current + Number.EPSILON,
  );
  if (nextOption !== undefined) return nextOption;
  return current >= 10 && current < Number(maxStockKg)
    ? Math.min(current + 1, Number(maxStockKg))
    : current;
};
