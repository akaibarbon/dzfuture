import { useEffect } from "react";

interface DocumentMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

function setMeta(selector: string, attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useDocumentMeta({ title, description, image, url, type = "article" }: DocumentMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    const canonical = url || (typeof window !== "undefined" ? window.location.href : "");

    if (title) {
      setMeta(`meta[property="og:title"]`, "property", "og:title", title);
      setMeta(`meta[name="twitter:title"]`, "name", "twitter:title", title);
    }
    if (description) {
      setMeta(`meta[name="description"]`, "name", "description", description);
      setMeta(`meta[property="og:description"]`, "property", "og:description", description);
      setMeta(`meta[name="twitter:description"]`, "name", "twitter:description", description);
    }
    if (image) {
      setMeta(`meta[property="og:image"]`, "property", "og:image", image);
      setMeta(`meta[name="twitter:image"]`, "name", "twitter:image", image);
      setMeta(`meta[name="twitter:card"]`, "name", "twitter:card", "summary_large_image");
    }
    if (canonical) {
      setMeta(`meta[property="og:url"]`, "property", "og:url", canonical);
      setLink("canonical", canonical);
    }
    setMeta(`meta[property="og:type"]`, "property", "og:type", type);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, image, url, type]);
}
