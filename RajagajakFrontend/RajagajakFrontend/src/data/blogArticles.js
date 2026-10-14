export const blogCategories = [
  "Gajak Guide",
  "Traditional Sweets",
  "Ingredients",
  "Food & Festive Traditions",
];

export const formatPublicationDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
