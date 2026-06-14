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
