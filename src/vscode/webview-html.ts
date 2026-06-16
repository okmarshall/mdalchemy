export interface WebviewHtmlOptions {
  cspSource: string;
  mapLocalResource: (reference: string) => string | undefined;
  actions?: WebviewActionOptions | undefined;
}

export interface WebviewActionOptions {
  nonce: string;
  actions: readonly WebviewAction[];
}

export interface WebviewAction {
  id: string;
  label: string;
  title?: string | undefined;
}

export function prepareHtmlForWebview(html: string, options: WebviewHtmlOptions): string {
  const rewritten = rewriteLocalImageSources(html, options.mapLocalResource);
  const withActions = options.actions ? insertWebviewActions(rewritten, options.actions) : rewritten;
  return insertContentSecurityPolicy(withActions, webviewContentSecurityPolicy(options.cspSource, options.actions?.nonce));
}

export function webviewContentSecurityPolicy(cspSource: string, scriptNonce?: string): string {
  const directives = [
    "default-src 'none'",
    `img-src ${cspSource} https: http: data:`,
    "style-src 'unsafe-inline'",
    `font-src ${cspSource} data:`
  ];
  if (scriptNonce) directives.push(`script-src 'nonce-${escapeAttribute(scriptNonce)}'`);
  return directives.join("; ");
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

function insertWebviewActions(html: string, options: WebviewActionOptions): string {
  const controls = webviewActionMarkup(options);
  if (/<body\b[^>]*>/i.test(html)) {
    return html.replace(/<body\b[^>]*>/i, (match) => `${match}\n${controls}`);
  }
  return `${controls}\n${html}`;
}

function webviewActionMarkup(options: WebviewActionOptions): string {
  const buttons = options.actions.map((action) => {
    const title = action.title ? ` title="${escapeAttribute(action.title)}"` : "";
    return `<button class="mda-vscode-preview-action" type="button" data-mda-vscode-command="${escapeAttribute(action.id)}"${title}>${escapeHtml(action.label)}</button>`;
  }).join("");

  return `<style>
.mda-vscode-preview-toolbar {
  align-items: center;
  background: rgba(17, 25, 35, 0.96);
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  box-sizing: border-box;
  color: #d8e1e8;
  display: flex;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  gap: 10px;
  justify-content: flex-end;
  margin: 0;
  padding: 8px 16px;
  position: sticky;
  top: 0;
  z-index: 2147483647;
}
.mda-vscode-preview-action {
  background: #f6f4ee;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 5px;
  color: #111923;
  cursor: pointer;
  font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 6px 10px;
}
.mda-vscode-preview-action:hover,
.mda-vscode-preview-action:focus {
  background: #ffffff;
  outline: 2px solid rgba(125, 207, 255, 0.8);
  outline-offset: 1px;
}
</style>
<div class="mda-vscode-preview-toolbar" role="toolbar" aria-label="mdalchemy preview actions">
${buttons}
</div>
<script nonce="${escapeAttribute(options.nonce)}">
(() => {
  const vscode = acquireVsCodeApi();
  for (const button of document.querySelectorAll("[data-mda-vscode-command]")) {
    button.addEventListener("click", () => {
      vscode.postMessage({ command: button.getAttribute("data-mda-vscode-command") });
    });
  }
})();
</script>`;
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

function escapeHtml(value: string): string {
  return escapeAttribute(value);
}
