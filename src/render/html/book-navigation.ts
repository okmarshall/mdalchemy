import { renderToc, type TocItem } from "./toc-renderer.js";
import { escapeText } from "./escape.js";

export const bookSearchScriptAttribute = "data-mda-book-search-script";

export interface BookNavigationRenderOptions {
  title: string;
  sidebar: boolean;
  search: boolean;
  items: readonly TocItem[];
  depth: number;
  collapsible: boolean;
}

export function renderBookNavigation(options: BookNavigationRenderOptions): string {
  if (options.sidebar) return renderBookSidebar(options);
  if (options.search) return renderBookSearchPanel();
  return "";
}

export function renderBookNavigationScript(options: BookNavigationRenderOptions | undefined): string {
  return options?.search ? renderBookSearchScript() : "";
}

function renderBookSidebar(options: BookNavigationRenderOptions): string {
  const search = options.search ? `\n${indent(renderBookSearchControls(), 4)}` : "";
  const toc = renderToc(options.items, options.depth, {
    collapsible: options.collapsible
  });
  const navigation = toc ? `\n${indent(toc, 4)}` : "";
  return `  <aside class="mda-book-sidebar" aria-label="Book navigation">
    <a class="mda-book-sidebar-title" href="#top">${escapeText(options.title)}</a>${search}${navigation}
  </aside>`;
}

function renderBookSearchPanel(): string {
  return `  <section class="mda-book-search-panel" aria-label="Book search">
${indent(renderBookSearchControls(), 4)}
  </section>`;
}

function renderBookSearchControls(): string {
  return `<div class="mda-book-search" role="search" data-mda-book-search>
  <label class="mda-book-search-label" for="mda-book-search-input">Search this book</label>
  <input class="mda-book-search-input" id="mda-book-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search this book" data-mda-book-search-input>
  <div class="mda-book-search-status" aria-live="polite" data-mda-book-search-status></div>
  <ol class="mda-book-search-results" hidden data-mda-book-search-results></ol>
</div>`;
}

function renderBookSearchScript(): string {
  return `  <script ${bookSearchScriptAttribute}>
    (() => {
      const root = document.querySelector("[data-mda-book-search]");
      if (!root) return;

      const input = root.querySelector("[data-mda-book-search-input]");
      const results = root.querySelector("[data-mda-book-search-results]");
      const status = root.querySelector("[data-mda-book-search-status]");
      if (!(input instanceof HTMLInputElement) || !(results instanceof HTMLOListElement) || !status) return;

      const collapseWhitespace = (value) => value.replace(/\\s+/g, " ").trim();
      const normalize = (value) => collapseWhitespace(value).toLocaleLowerCase();
      const isHeading = (element) => /^H[1-6]$/.test(element.tagName);
      const headingLevel = (element) => Number(element.tagName.slice(1));
      const headingTitle = (heading) => {
        const clone = heading.cloneNode(true);
        clone.querySelectorAll(".mda-heading-anchor").forEach((anchor) => anchor.remove());
        return collapseWhitespace(clone.textContent || heading.textContent || "");
      };
      const textForHeading = (heading, title) => {
        const section = heading.closest(".mda-section");
        if (section) return collapseWhitespace(section.textContent || title);

        const parts = [title];
        const level = headingLevel(heading);
        let node = heading.nextElementSibling;
        while (node) {
          if (isHeading(node) && headingLevel(node) <= level) break;
          parts.push(node.textContent || "");
          node = node.nextElementSibling;
        }
        return collapseWhitespace(parts.join(" "));
      };
      const snippet = (value, query) => {
        const index = value.toLocaleLowerCase().indexOf(query);
        const start = index < 0 ? 0 : Math.max(0, index - 56);
        const end = Math.min(value.length, start + 160);
        return \`\${start > 0 ? "..." : ""}\${value.slice(start, end)}\${end < value.length ? "..." : ""}\`;
      };

      const entries = Array.from(document.querySelectorAll(".mda-content h1[id], .mda-content h2[id], .mda-content h3[id], .mda-content h4[id], .mda-content h5[id], .mda-content h6[id]"))
        .map((heading) => {
          const title = headingTitle(heading);
          const text = textForHeading(heading, title);
          return {
            id: heading.id,
            level: headingLevel(heading),
            title,
            text,
            normalized: normalize(text)
          };
        })
        .filter((entry) => entry.id && entry.title);

      const renderResults = () => {
        const query = normalize(input.value);
        results.replaceChildren();
        if (!query) {
          results.hidden = true;
          status.textContent = "";
          return;
        }

        const terms = query.split(" ").filter(Boolean);
        const matches = entries.filter((entry) => terms.every((term) => entry.normalized.includes(term)));
        for (const entry of matches.slice(0, 12)) {
          const item = document.createElement("li");
          item.className = "mda-book-search-result";

          const link = document.createElement("a");
          link.href = \`#\${entry.id}\`;

          const title = document.createElement("span");
          title.className = "mda-book-search-result-title";
          title.textContent = entry.title;

          const meta = document.createElement("span");
          meta.className = "mda-book-search-result-meta";
          meta.textContent = \`H\${entry.level}\`;

          const excerpt = document.createElement("p");
          excerpt.className = "mda-book-search-result-snippet";
          excerpt.textContent = snippet(entry.text, query);

          link.append(title, meta);
          item.append(link, excerpt);
          results.append(item);
        }

        results.hidden = matches.length === 0;
        status.textContent = matches.length === 1
          ? "1 result"
          : \`\${matches.length} results\`;
      };

      input.addEventListener("input", renderResults);
      renderResults();
    })();
  </script>`;
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value.split("\n").map((line) => `${prefix}${line}`).join("\n");
}
