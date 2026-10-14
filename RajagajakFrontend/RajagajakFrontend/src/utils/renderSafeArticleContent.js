import { createElement, Fragment } from "react";

const allowedTags = new Set([
  "P",
  "H2",
  "H3",
  "STRONG",
  "B",
  "EM",
  "I",
  "UL",
  "OL",
  "LI",
  "A",
  "BLOCKQUOTE",
  "BR",
  "IMG",
]);

const safeUrl = (value, image = false) => {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin) return url.href;
    if (url.protocol === "https:" || (!image && url.protocol === "http:")) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
};

function convertNode(node, key) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName;
  const children = Array.from(node.childNodes).map((child, index) =>
    convertNode(child, `${key}-${index}`),
  );
  if (!allowedTags.has(tag)) return createElement(Fragment, { key }, ...children);

  if (tag === "A") {
    const href = safeUrl(node.getAttribute("href") || "");
    return href
      ? createElement("a", { key, href, rel: "noopener noreferrer" }, ...children)
      : createElement(Fragment, { key }, ...children);
  }

  if (tag === "IMG") {
    const src = safeUrl(node.getAttribute("src") || "", true);
    return src
      ? createElement("img", {
          key,
          src,
          alt: node.getAttribute("alt") || "",
          loading: "lazy",
        })
      : null;
  }

  return createElement(tag.toLowerCase(), { key }, ...children);
}

export default function renderSafeArticleContent(html = "") {
  const template = document.createElement("template");
  template.innerHTML = String(html);
  return Array.from(template.content.childNodes).map((node, index) =>
    convertNode(node, `article-content-${index}`),
  );
}
