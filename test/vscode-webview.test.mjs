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

test("injects live preview actions with a nonce-scoped script", () => {
  const html = `<!doctype html>
<html>
<head>
<title>Preview</title>
</head>
<body>
<script>alert("raw markdown script")</script>
<p>Body</p>
</body>
</html>`;

  const prepared = prepareHtmlForWebview(html, {
    cspSource: "vscode-webview://mdalchemy",
    mapLocalResource: () => undefined,
    actions: {
      nonce: "test-nonce",
      actions: [
        {
          id: "save-html",
          label: "Save HTML",
          title: "Render the current Markdown state and save it as HTML"
        }
      ]
    }
  });

  assert.match(prepared, /script-src 'nonce-test-nonce'/);
  assert.match(prepared, /class="mda-vscode-preview-toolbar"/);
  assert.match(prepared, /data-mda-vscode-command="save-html"/);
  assert.match(prepared, /Render the current Markdown state and save it as HTML/);
  assert.match(prepared, /<script nonce="test-nonce">/);
  assert.match(prepared, /<script>alert\("raw markdown script"\)<\/script>/);
});
