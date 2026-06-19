import { randomBytes } from "node:crypto";
import { documentControlScriptAttribute } from "../render/html/document-actions.js";
import {
  mermaidInitializerScriptAttribute,
  mermaidRuntimeScriptAttribute
} from "../render/html/mermaid.js";

export interface WebviewHtmlOptions {
  cspSource: string;
  mapLocalResource: (reference: string) => string | undefined;
}

export function prepareHtmlForWebview(html: string, options: WebviewHtmlOptions): string {
  const nonce = randomBytes(16).toString("base64");
  return insertContentSecurityPolicy(
    addFirstPartyScriptNonce(rewriteLocalImageSources(html, options.mapLocalResource), nonce),
    webviewContentSecurityPolicy(options.cspSource, nonce)
  );
}

export function webviewContentSecurityPolicy(cspSource: string, scriptNonce?: string): string {
  return [
    "default-src 'none'",
    `img-src ${cspSource} https: http: data:`,
    "style-src 'unsafe-inline'",
    `font-src ${cspSource} data:`,
    ...(scriptNonce ? [`script-src 'nonce-${scriptNonce}'`] : [])
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

function addFirstPartyScriptNonce(html: string, nonce: string): string {
  const firstPartyScriptAttributes = [
    documentControlScriptAttribute,
    mermaidRuntimeScriptAttribute,
    mermaidInitializerScriptAttribute
  ];
  const firstPartyScriptPattern = new RegExp(
    `<script\\b((?=[^>]*\\b(?:${firstPartyScriptAttributes.map(escapeRegExp).join("|")})\\b)[^>]*)>`,
    "gi"
  );
  return html.replace(firstPartyScriptPattern, (match, attributes: string) => {
    if (/\bnonce\s*=/.test(attributes)) return match;
    return `<script nonce="${escapeAttribute(nonce)}"${attributes}>`;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
