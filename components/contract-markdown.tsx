import { Fragment, type ReactNode } from "react";

// Minimal, dependency-free Markdown renderer for the contract body. Covers the
// subset the template (lib/admin/contracts.ts) produces and the admin editor is
// expected to stay within: #/##/### headings, `- ` bullet lists, blank-line
// paragraphs, and **bold** inline. Anything else renders as plain text.

// Split a line on **bold** spans.
function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>;
  });
}

export function ContractMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const key = `p-${blocks.length}`;
    blocks.push(
      <p key={key} className="mt-3 leading-8 text-foreground/85">
        {inline(paragraph.join(" "), key)}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    const key = `ul-${blocks.length}`;
    blocks.push(
      <ul key={key} className="mt-3 list-disc space-y-1.5 pe-6 leading-8 text-foreground/85">
        {list.map((item, i) => (
          <li key={`${key}-${i}`}>{inline(item, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      flushAll();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-5 text-base font-semibold">
          {inline(line.slice(4), `h3-${blocks.length}`)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushAll();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-6 border-b border-border pb-1 text-lg font-bold">
          {inline(line.slice(3), `h2-${blocks.length}`)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushAll();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-2xl font-bold">
          {inline(line.slice(2), `h1-${blocks.length}`)}
        </h1>,
      );
    } else if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushAll();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushAll();

  return <div className="contract-body">{blocks}</div>;
}
