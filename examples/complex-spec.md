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
