import test from "node:test";
import assert from "node:assert/strict";
import { prepareHtmlForWebview } from "../dist/vscode/webview-html.js";

test("prepares rendered HTML for VS Code webviews", () => {
  const html = `<!doctype html>
<html>
<head>
<title>Preview</title>
</head>
<body>
<img src="images/example one.png" alt="local">
<img src="https://example.com/image.png" alt="remote">
<img src="data:image/png;base64,abc" alt="data">
</body>
</html>`;

  const prepared = prepareHtmlForWebview(html, {
    cspSource: "vscode-webview://mdalchemy",
    mapLocalResource: (reference) => `vscode-resource:${reference}?mapped=1&safe=true`
  });

  assert.match(prepared, /<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-webview:\/\/mdalchemy https: http: data:; style-src 'unsafe-inline'; font-src vscode-webview:\/\/mdalchemy data:">/);
  assert.match(prepared, /<img src="vscode-resource:images\/example one\.png\?mapped=1&amp;safe=true" alt="local">/);
  assert.match(prepared, /<img src="https:\/\/example\.com\/image\.png" alt="remote">/);
  assert.match(prepared, /<img src="data:image\/png;base64,abc" alt="data">/);
});
