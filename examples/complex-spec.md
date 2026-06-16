---
title: CommonMark Complex Fixture
audience: mdalchemy maintainers
fixture: extension coverage
---

# CommonMark Complex Fixture

This fixture is intentionally dense. It should be useful as a parser and
renderer smoke test, not as polished prose.

Inline basics include *emphasis*, **strong emphasis**, ***strong and emphasis***,
`inline code`, and `` code with a ` backtick ``. Links include an [inline
link](https://example.com/path?alpha=1&beta=2 "Example title"), a [full
reference][docs], a [collapsed reference][], and a [shortcut reference].

Images:

![inline image alt](./images/inline.svg "Inline image")

![reference image alt][image-ref]

Autolinks: <https://example.com/autolink> and <person@example.com>.
Entities: &amp; &lt; &gt; &quot; &#35; &#x41;.
Escapes: \*literal asterisks\*, \[literal brackets\], \`literal backticks\`,
and \\literal backslashes\\.
Inline HTML: <span data-kind="inline">raw span</span> and <kbd>Ctrl</kbd>.

GFM table extension:

| Feature | Status | Notes |
| :--- | :---: | ---: |
| Tables | Working | `gfm-table` |
| Alignment | Centered | Right aligned |
| Escaped pipe | A \| B | Inline `a | b` code |

GFM extension coverage:

- [x] Render checked task list items.
- [ ] Render unchecked task list items with ~~obsolete wording~~ left visible as deleted text.
- [ ] Keep task item prose readable when it includes a literal link such as https://example.com/release-notes.

Literal autolinks include www.example.org and docs@example.org without angle
brackets. A footnote reference should become an endnote.[^extension-note]

Wide table edge case:

| Test | What it verifies |
| --- | --- |
| `SyntheticReportRenderer_HandlesRidiculouslyLongIdentifierWithoutPageOverflow` | `VeryLongConfigurationFlagNameForLayoutTesting` is present -> the table scrolls inside its container |
| `ExamplePipeline_FallsBackToReadableSummaryWhenTelemetryTokenIsMissing` | No `ImaginaryTelemetryToken`, no `DemoChecksumMarker` -> the rendered document keeps its page width |
| `FictionalScenario_SkipsOptionalProbeWhenDemoFeatureSwitchIsDisabled` | `DemoFeatureSwitch=false`, no `PlaceholderProbeName` -> inline code remains readable in a narrow viewport |

This line ends with a soft break
and continues in the same paragraph.
This line ends with a hard break\
and this text follows the hard break.

Setext Level One
================

Setext Level Two
----------------

## ATX Heading With Closing Hashes ##

### Heading With `code` And [Reference][docs]

####### Seven hashes are paragraph text, not a heading.

***

___

---

> A simple block quote paragraph with *inline emphasis* and a [link][docs].
>
> > A nested block quote.
> >
> > 1. Nested ordered item one.
> > 2. Nested ordered item two.
> >    - Nested bullet inside the ordered item.
> >    - Another nested bullet with `code`.
>
> - Bullet item inside a quote.
> - Second bullet item inside a quote.
>
> ```js
> const quoted = "fenced code inside a block quote";
> console.log(quoted);
> ```
>
> Lazy continuation text belongs to the previous block quote paragraph
even though this source line has no quote marker.

- Tight bullet one.
- Tight bullet two with nested content.
  1. Nested ordered one.
  2. Nested ordered two.
     - Deep bullet one.
     - Deep bullet two.
- Tight bullet three.

1. Loose ordered item one.

   This second paragraph makes the list loose.

2. Loose ordered item two.

   - Child bullet paragraph.

     Child continuation paragraph.

9) Ordered list starting at nine.
10) Ordered list continuing at ten.

Paragraph before an ordered-looking line.
2. This line should stay part of the paragraph if paragraph interruption rules
are implemented exactly.

    function indentedCode() {
      return "four leading spaces";
    }

```ts title="sample.ts"
export function fencedCode(value: string): string {
  return value.trim();
}
```

```csharp
public sealed class MarkdownRenderer
{
    public string Render(string markdown)
    {
        Console.WriteLine("Rendering Markdown");
        return markdown.Trim();
    }
}
```

Expanded syntax highlighting examples:

```python
@task
def render(value: str) -> str:
    # keep the rendered output tidy
    return f"{value.strip()}"
```

```java
@Deprecated
public final class Demo {
    public String render(String value) {
        return value.trim();
    }
}
```

```go
package main

func render(value string) string {
    return strings.TrimSpace(value)
}
```

```rust
#[derive(Debug)]
pub fn render(value: &str) -> String {
    println!("{}", value);
    value.trim().to_string()
}
```

```sql
SELECT status, COUNT(*) AS total
FROM reports
WHERE status = 'ready' AND total >= 1
GROUP BY status;
```

```yaml
name: demo
enabled: true
items:
  - &default readable
copy: *default
```

```dockerfile
FROM node:24
WORKDIR /app
COPY package*.json ./
RUN npm ci
CMD ["npm", "start"]
```

```powershell
param([string]$Name)
Write-Host "Hello $Name"
if ($Name -eq "demo") { return }
```

```diff
diff --git a/guide.md b/guide.md
@@ -1,2 +1,2 @@
-old heading
+new heading
```

~~~html
<div class="from-fence">
  Fenced HTML is code, not raw HTML.
</div>
~~~

<section class="raw-html-block">
<p>Raw HTML block content with <strong>HTML strong</strong>.</p>
</section>

<!-- Raw HTML comment block. -->

Paragraph after raw HTML should resume Markdown parsing with **strong text**.

[docs]: https://example.com/docs "Docs title"
[collapsed reference]: https://example.com/collapsed
[shortcut reference]: https://example.com/shortcut
[image-ref]: ./images/reference.svg "Reference image"

[^extension-note]: Footnotes are rendered after the main content, with a back link
    to the reference. They can contain **inline formatting** and regular
    Markdown links such as [the example site](https://example.com).
