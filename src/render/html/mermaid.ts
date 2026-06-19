import { readFile } from "node:fs/promises";
import type { CodeBlockNode } from "../../markdown/ast.js";
import { escapeText } from "./escape.js";

const mermaidLanguages = new Set(["mermaid", "mmd"]);
const mermaidRuntimeUrl = new URL("../../vendor/mermaid.min.js", import.meta.url);
let mermaidRuntimeScript: Promise<string> | undefined;

export const mermaidDiagramAttribute = "data-mda-mermaid";

export function isMermaidCodeBlock(block: CodeBlockNode): boolean {
  return block.kind === "fenced" && mermaidLanguages.has(block.language?.toLowerCase() ?? "");
}

export function renderMermaidDiagram(block: CodeBlockNode): string {
  return `<figure class="mda-mermaid" ${mermaidDiagramAttribute} role="region" aria-label="Mermaid diagram" tabindex="0">\n  <div class="mda-mermaid-canvas" data-mda-mermaid-canvas></div>\n  <pre class="mermaid" data-mda-mermaid-source>${escapeText(block.literal)}</pre>\n</figure>`;
}

export function hasMermaidDiagrams(content: string): boolean {
  return content.includes(mermaidDiagramAttribute);
}

export async function renderMermaidRuntimeScript(): Promise<string> {
  const script = await loadMermaidRuntimeScript();
  return `  <script data-mda-mermaid-runtime>\n${script}\n  </script>`;
}

export function renderMermaidInitializerScript(): string {
  return `  <script data-mda-mermaid-script>
    (() => {
      const renderDiagrams = async () => {
        const mermaid = window.mermaid;
        const diagrams = document.querySelectorAll("[data-mda-mermaid]");
        if (!diagrams.length || !mermaid) return;
        if (typeof mermaid.initialize === "function") {
          mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        }

        let index = 0;
        for (const diagram of diagrams) {
          const source = diagram.querySelector("[data-mda-mermaid-source]");
          const canvas = diagram.querySelector("[data-mda-mermaid-canvas]");
          if (!source || !canvas || typeof mermaid.render !== "function") continue;

          try {
            const id = \`mda-mermaid-\${Date.now()}-\${index++}\`;
            const rendered = await mermaid.render(id, source.textContent || "");
            canvas.innerHTML = rendered.svg;
            rendered.bindFunctions?.(canvas);
            diagram.dataset.mdaMermaidRendered = "true";
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            diagram.dataset.mdaMermaidError = message;
            canvas.textContent = "";
          }
        }
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { void renderDiagrams(); }, { once: true });
      } else {
        void renderDiagrams();
      }
    })();
  </script>`;
}

function loadMermaidRuntimeScript(): Promise<string> {
  mermaidRuntimeScript ??= readFile(mermaidRuntimeUrl, "utf8").then(escapeInlineScript);
  return mermaidRuntimeScript;
}

function escapeInlineScript(script: string): string {
  return script.replace(/<\/script/gi, "<\\/script");
}
