import { useEffect } from "react";

export default function usePageMetadata({
  title,
  description,
  type = "website",
  image,
  canonicalUrl,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    let canonicalLink = null;
    if (canonicalUrl) {
      try {
        const parsed = new URL(canonicalUrl);
        if (["http:", "https:"].includes(parsed.protocol) && parsed.hostname) {
          canonicalLink = parsed.href;
        }
      } catch {
        canonicalLink = null;
      }
    }
    const tags = [
      {
        selector: 'meta[name="description"]',
        attributes: { name: "description", content: description },
      },
      {
        selector: 'meta[property="og:title"]',
        attributes: { property: "og:title", content: title },
      },
      {
        selector: 'meta[property="og:description"]',
        attributes: { property: "og:description", content: description },
      },
      {
        selector: 'meta[property="og:type"]',
        attributes: { property: "og:type", content: type },
      },
      {
        selector: 'meta[property="og:url"]',
        attributes: {
          property: "og:url",
          content: `${window.location.origin}${window.location.pathname}`,
        },
      },
      {
        selector: 'meta[property="og:site_name"]',
        attributes: { property: "og:site_name", content: "RAJA GAJAK®" },
      },
      ...(image
        ? [
            {
              selector: 'meta[property="og:image"]',
              attributes: {
                property: "og:image",
                content: new URL(image, window.location.origin).href,
              },
            },
          ]
        : []),
    ];

    document.title = title;
    const previousTags = tags.map(({ selector, attributes }) => {
      let element = document.head.querySelector(selector);
      const created = !element;
      if (!element) {
        element = document.createElement("meta");
        document.head.append(element);
      }
      const previousAttributes = Object.keys(attributes).map((name) => [
        name,
        element.getAttribute(name),
      ]);
      Object.entries(attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
      return { element, created, previousAttributes };
    });

    let canonicalElement = null;
    let canonicalCreated = false;
    let previousCanonicalHref = null;
    if (canonicalLink) {
      canonicalElement = document.head.querySelector('link[rel="canonical"]');
      canonicalCreated = !canonicalElement;
      if (!canonicalElement) {
        canonicalElement = document.createElement("link");
        canonicalElement.setAttribute("rel", "canonical");
        document.head.append(canonicalElement);
      } else {
        previousCanonicalHref = canonicalElement.getAttribute("href");
      }
      canonicalElement.setAttribute("href", canonicalLink);
    }

    return () => {
      document.title = previousTitle;
      if (canonicalElement) {
        if (canonicalCreated) canonicalElement.remove();
        else if (previousCanonicalHref === null) {
          canonicalElement.removeAttribute("href");
        } else {
          canonicalElement.setAttribute("href", previousCanonicalHref);
        }
      }
      previousTags.forEach(({ element, created, previousAttributes }) => {
        if (created) {
          element.remove();
          return;
        }
        previousAttributes.forEach(([name, value]) => {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        });
      });
    };
  }, [canonicalUrl, description, image, title, type]);
}
