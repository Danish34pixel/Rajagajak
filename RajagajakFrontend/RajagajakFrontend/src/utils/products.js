export const shuffleProducts = (products) => {
  const shuffled = [...products];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
};

export const getProductSuggestions = (products, currentProduct, limit = 4) => {
  const currentId = String(currentProduct?._id || currentProduct?.id || "");
  const uniqueProducts = Array.from(
    new Map(
      products
        .filter((item) => String(item._id || item.id || "") !== currentId)
        .map((item) => [String(item._id || item.id || item.title), item]),
    ).values(),
  );
  const category = String(currentProduct?.category || "")
    .trim()
    .toLowerCase();
  const sameCategory = category
    ? uniqueProducts.filter(
        (item) =>
          String(item.category || "")
            .trim()
            .toLowerCase() === category,
      )
    : [];
  const preferred = shuffleProducts(sameCategory);
  const remaining = shuffleProducts(
    uniqueProducts.filter((item) => !sameCategory.includes(item)),
  );

  return [...preferred, ...remaining].slice(0, limit);
};
