import { Fragment, type ReactNode } from "react";

export type BillboardDomLink = {
  start: number;
  end: number;
  href: string;
};

function textWithNewlines(s: string, keyPrefix: string): ReactNode {
  const lines = s.split("\n");
  return lines.map((line, idx) => (
    <Fragment key={`${keyPrefix}-${idx}`}>
      {idx > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

/** Same span logic as troika `colorRanges` + link hit tests: split `fullText` by sorted `[start,end)` links. */
export function renderLinkedBillboardText(fullText: string, links: BillboardDomLink[], keyPrefix = "l"): ReactNode {
  const sorted = [...links].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  let li = 0;
  for (const link of sorted) {
    if (link.end <= link.start) continue;
    if (link.start < cursor) continue;
    if (link.start > cursor) {
      parts.push(textWithNewlines(fullText.slice(cursor, link.start), `${keyPrefix}-t${li++}`));
    }
    parts.push(
      <a
        key={`${keyPrefix}-a${link.start}`}
        href={link.href}
        className="fallback-billboard-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {fullText.slice(link.start, link.end)}
      </a>,
    );
    cursor = link.end;
  }
  if (cursor < fullText.length) {
    parts.push(textWithNewlines(fullText.slice(cursor), `${keyPrefix}-end`));
  }
  return <>{parts}</>;
}
