# Conformance Fixtures

`commonmark-0.31.2.json` is the official CommonMark 0.31.2 example corpus downloaded from:

```text
https://spec.commonmark.org/0.31.2/spec.json
```

Refresh it with:

```sh
curl -L https://spec.commonmark.org/0.31.2/spec.json -o test/fixtures/conformance/commonmark-0.31.2.json
```

The seed fixture packs are small strict checks for behavior mdalchemy already supports. The full CommonMark corpus is used by `npm run test:commonmark` as a pass-rate report and by `npm run test:commonmark:strict` as the future all-examples gate.

`gfm-0.29.json` is extracted from the official `github/cmark-gfm` spec source:

```text
https://raw.githubusercontent.com/github/cmark-gfm/master/test/spec.txt
```

Refresh it with:

```sh
curl -L https://raw.githubusercontent.com/github/cmark-gfm/master/test/spec.txt -o /tmp/gfm-spec.txt
node test/fixtures/conformance/extract-gfm-corpus.mjs /tmp/gfm-spec.txt test/fixtures/conformance/gfm-0.29.json
```

The GFM report uses each example's official extension tags, matching the
cmark-gfm test runner model. Examples tagged `disabled` are omitted, which is
why the enabled corpus contains 670 examples.
