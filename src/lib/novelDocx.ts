/** Standalone, dependency-free DOCX export for Shiorivia Novel.
 * A DOCX is an Open Packaging Convention ZIP containing WordprocessingML.
 * Store-mode ZIP keeps this entirely client-side without extra npm packages.
 */
export type NovelChapter = { title: string; body: string };

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const cleanXml = (value: string): string => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Exclude metadata, controls, options and illustration references from reading copies. */
export function extractNovelChapters(messages: Array<{ role: string; content: unknown }>): NovelChapter[] {
  return messages.filter(m => m.role === "assistant" && typeof m.content === "string")
    .map((m, index) => {
      const source = m.content as string;
      const meta = source.match(/<meta\b[^>]*\bchapter\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/i);
      const title = meta?.[1]?.trim() || `第 ${index + 1} 章`;
      const body = source
        .replace(/<meta\b[^>]*\/?>/gi, "")
        .replace(/<draw\b[^>]*>[\s\S]*?<\/draw\s*>/gi, "")
        .replace(/<draw\b[^>]*\/\s*>/gi, "")
        .replace(/<audio\b[^>]*>[\s\S]*?<\/audio\s*>/gi, "")
        .replace(/<(thinking|game_state|memory_update|file)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
        .replace(/^\s*>\s*\*\*Option\s+\d+\*\*\s*:\s*.*$/gim, "")
        .replace(/^\s*\[\s*(?:SYSTEM|Director Instruction|User Choice|Instruction)\s*\]\s*:.*$/gim, "")
        .replace(/\r\n?/g, "\n").trim();
      return { title, body };
    }).filter(ch => ch.body.length > 0);
}

function paragraph(text: string, style?: "Title" | "Heading1"): string {
  const run = `<w:r><w:t xml:space="preserve">${cleanXml(text)}</w:t></w:r>`;
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${run}</w:p>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const CONTENT_TYPES = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const RELS = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOCUMENT_RELS = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const STYLES = `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:eastAsia="宋体" w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="23"/></w:rPr><w:pPr><w:spacing w:after="160" w:line="350" w:lineRule="auto"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="400"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:color w:val="304B40"/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="180"/></w:pPr><w:rPr><w:b/><w:color w:val="527966"/><w:sz w:val="30"/></w:rPr></w:style></w:styles>`;

function documentXml(title: string, chapters: NovelChapter[]): string {
  const blocks = [paragraph(title, "Title")];
  for (const chapter of chapters) {
    blocks.push(paragraph(chapter.title, "Heading1"));
    for (const line of chapter.body.split(/\n/)) {
      blocks.push(paragraph(line));
    }
  }
  return `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const b of data) crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function le16(out: number[], n: number): void { out.push(n & 255, (n >>> 8) & 255); }
function le32(out: number[], n: number): void { le16(out, n & 0xFFFF); le16(out, n >>> 16); }
function append(out: number[], data: Uint8Array): void { for (const b of data) out.push(b); }

/** Build an uncompressed but standards-compliant ZIP (no runtime dependencies). */
function zip(entries: Array<[string, string]>): Uint8Array {
  const bytes: number[] = [];
  const central: number[] = [];
  for (const [name, xml] of entries) {
    const file = encode(xml); const path = encode(name);
    const crc = crc32(file); const offset = bytes.length;
    le32(bytes, 0x04034b50); le16(bytes, 20); le16(bytes, 0x0800); le16(bytes, 0);
    le16(bytes, 0); le16(bytes, 0); le32(bytes, crc); le32(bytes, file.length);
    le32(bytes, file.length); le16(bytes, path.length); le16(bytes, 0);
    append(bytes, path); append(bytes, file);
    le32(central, 0x02014b50); le16(central, 20); le16(central, 20); le16(central, 0x0800);
    le16(central, 0); le16(central, 0); le16(central, 0); le32(central, crc);
    le32(central, file.length); le32(central, file.length); le16(central, path.length);
    le16(central, 0); le16(central, 0); le16(central, 0); le16(central, 0);
    le32(central, 0); le32(central, offset); append(central, path);
  }
  const offset = bytes.length; for (const b of central) bytes.push(b);
  le32(bytes, 0x06054b50); le16(bytes, 0); le16(bytes, 0);
  le16(bytes, entries.length); le16(bytes, entries.length);
  le32(bytes, central.length); le32(bytes, offset); le16(bytes, 0);
  return new Uint8Array(bytes);
}

export function createNovelDocx(title: string, chapters: NovelChapter[]): Uint8Array {
  return zip([
    ["[Content_Types].xml", CONTENT_TYPES],
    ["_rels/.rels", RELS],
    ["word/document.xml", documentXml(title, chapters)],
    ["word/styles.xml", STYLES],
    ["word/_rels/document.xml.rels", DOCUMENT_RELS],
  ]);
}
