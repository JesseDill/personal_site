"use client";

import type { InteractionContent } from "@/data/interactions";

export function InteractionPanel({
  content,
  onClose,
}: {
  content: InteractionContent;
  onClose: () => void;
}) {
  return (
    <aside className="panel" role="dialog" aria-label={content.title} data-ui-layer="true">
      <p className="panel-strapline">{content.strapline}</p>
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <div className="panel-actions">
        {content.cta ? (
          <a className="cta" href={content.cta.href}>
            {content.cta.label}
          </a>
        ) : null}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </aside>
  );
}
