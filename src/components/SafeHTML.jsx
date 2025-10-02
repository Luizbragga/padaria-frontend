// padaria-frontend/src/components/SafeHTML.jsx
import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Componente seguro para renderizar HTML vindo do backend.
 * - Sanitiza com DOMPurify
 * - Remove scripts, handlers inline (on*), iframes perigosos
 * - Reescreve <a target="_blank"> com rel="noopener noreferrer nofollow"
 *
 * Uso:
 *   <SafeHTML html={conteudoHtmlVindoDoServidor} />
 *
 * Props opcionais:
 *   allowedTags, allowedAttrs – para ampliar/estreitar o allowlist por caso
 */
export default function SafeHTML({
  html = "",
  allowedTags,
  allowedAttrs,
  className = "",
  ...rest
}) {
  const sanitized = useMemo(() => {
    // opções base (seguras) – não alteram contrato do backend
    const BASE_ALLOWED_TAGS = [
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "p",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "span",
      "div",
      "a",
      "img", // permitido, mas com attrs restritos
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ];

    const BASE_ALLOWED_ATTRS = [
      "href",
      "title",
      "target",
      "rel",
      "src",
      "alt",
      "width",
      "height",
      "class",
      "style", // style é permitido, mas DOMPurify remove perigos
    ];

    // Sanitiza
    let safe = DOMPurify.sanitize(String(html || ""), {
      ALLOWED_TAGS: allowedTags || BASE_ALLOWED_TAGS,
      ALLOWED_ATTR: allowedAttrs || BASE_ALLOWED_ATTRS,
      // defesa extra – remove tudo que seja "uri" perigosa (javascript:, data: não-imagem, etc)
      ALLOW_UNKNOWN_PROTOCOLS: false,
      FORBID_TAGS: ["script", "noscript"],
      FORBID_ATTR: [/^on/i], // remove onClick, onerror, etc.
      USE_PROFILES: { html: true }, // perfil padrão
      RETURN_TRUSTED_TYPE: false,
    });

    // Hardening extra de <a target="_blank">
    // garante rel seguro e evita phishing/aba-opener
    safe = safe.replaceAll(/<a\b([^>]*?)>/gi, (match, attrs) => {
      // se tiver target=_blank, injeta rel seguro
      const hasBlank = /\btarget\s*=\s*["_']?_blank["_']?/i.test(attrs);
      const hasRel = /\brel\s*=/i.test(attrs);
      if (hasBlank) {
        if (hasRel) {
          // anexa noopener/noreferrer/nofollow se não estiverem presentes
          return `<a ${attrs.replace(
            /\brel\s*=\s*(['"])(.*?)\1/i,
            (m, q, val) => `rel=${q}${ensureRelFlags(val)}${q}`
          )}>`;
        }
        return `<a ${attrs} rel="noopener noreferrer nofollow">`;
      }
      return `<a ${attrs}>`;
    });

    return safe;
  }, [html, allowedTags, allowedAttrs]);

  return (
    <div
      className={className}
      // Só aqui usamos dangerouslySetInnerHTML, mas após sanitização
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...rest}
    />
  );
}

function ensureRelFlags(relVal = "") {
  const flags = new Set(
    String(relVal)
      .split(/\s+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  ["noopener", "noreferrer", "nofollow"].forEach((f) => flags.add(f));
  return Array.from(flags).join(" ");
}
