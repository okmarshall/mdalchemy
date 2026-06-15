export interface WebviewHtmlOptions {
  cspSource: string;
  mapLocalResource: (reference: string) => string | undefined;
}

export function prepareHtmlForWebview(html: string, options: WebviewHtmlOptions): string {
  return insertContentSecurityPolicy(
    rewriteLocalImageSources(html, options.mapLocalResource),
    webviewContentSecurityPolicy(options.cspSource)
  );
}

export function webviewContentSecurityPolicy(cspSource: string): string {
  return [
    "default-src 'none'",
    `img-src ${cspSource} https: http: data:`,
    "style-src 'unsafe-inline'",
    `font-src ${cspSource} data:`
  ].join("; ");
}

function insertContentSecurityPolicy(html: string, policy: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy)}">`;
  if (/<head>/i.test(html)) return html.replace(/<head>/i, `<head>\n${meta}`);
  return `${meta}\n${html}`;
}

function rewriteLocalImageSources(
  html: string,
  mapLocalResource: WebviewHtmlOptions["mapLocalResource"]
): string {
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (match, prefix: string, source: string, suffix: string) => {
    if (!isLocalResourceReference(source)) return match;
    const mapped = mapLocalResource(source);
    return mapped ? `${prefix}${escapeAttribute(mapped)}${suffix}` : match;
  });
}

function isLocalResourceReference(reference: string): boolean {
  return reference.length > 0
    && !reference.startsWith("#")
    && !/^[a-z][a-z0-9+.-]*:/i.test(reference)
    && !reference.startsWith("//");
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
