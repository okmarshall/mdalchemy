const tagName = "[A-Za-z][A-Za-z0-9-]*";
const attributeName = "[A-Za-z_:][A-Za-z0-9_.:-]*";
const unquotedAttributeValue = "[^\\s\"'=<>`]+";
const attributeValue = `(?:${unquotedAttributeValue}|'[^']*'|"[^"]*")`;
const attribute = `(?:[ \\t\\n\\r]+${attributeName}(?:[ \\t\\n\\r]*=[ \\t\\n\\r]*${attributeValue})?)`;
const openTag = new RegExp(`^<${tagName}${attribute}*[ \\t\\n\\r]*/?>$`);
const closingTag = new RegExp(`^</${tagName}[ \\t\\n\\r]*>$`);

export function findHtmlTagEnd(source: string, start: number): number {
  if (source.startsWith("<![CDATA[", start)) {
    const cdataEnd = source.indexOf("]]>", start + 9);
    return cdataEnd === -1 ? -1 : cdataEnd + 2;
  }

  let quote: "\"" | "'" | undefined;

  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === ">") return index;
  }

  return -1;
}

export function isHtmlTag(literal: string): boolean {
  return openTag.test(literal) || closingTag.test(literal);
}

export function isHtmlInlineLiteral(literal: string): boolean {
  return isHtmlTag(literal)
    || /^<!--[\s\S]*>$/.test(literal)
    || /^<![A-Z]+[\s\S]*>$/i.test(literal)
    || /^<!\[CDATA\[[\s\S]*\]\]>$/.test(literal)
    || /^<\?[\s\S]*\?>$/.test(literal);
}
