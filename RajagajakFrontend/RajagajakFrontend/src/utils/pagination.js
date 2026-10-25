export const getPageNumbers = (totalPages, currentPage) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages]);
  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(totalPages - 1, currentPage + 1);
    page += 1
  ) {
    pages.add(page);
  }

  const items = [];
  let previousPage = 0;
  Array.from(pages)
    .sort((a, b) => a - b)
    .forEach((page) => {
      if (page - previousPage > 1) items.push("ellipsis");
      items.push(page);
      previousPage = page;
    });

  return items;
};

export const getPageSlice = (items, page, pageSize) => {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
};
