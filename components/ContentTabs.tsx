'use client';

import { useId, useState, type ReactNode } from 'react';

/** Mounted panels preserve searches and expanded evidence when switching tabs. */
export default function ContentTabs({ label, items }: {
  label: string;
  items: { key: string; label: string; content: ReactNode }[];
}) {
  const id = useId();
  const [active, setActive] = useState(items[0].key);
  return <div className="content-tabs">
    <div role="tablist" aria-label={label} className="product-tabs">
      {items.map((item, index) => <button key={item.key} type="button" role="tab"
        id={`${id}-tab-${item.key}`} aria-controls={`${id}-panel-${item.key}`}
        aria-selected={active === item.key} tabIndex={active === item.key ? 0 : -1}
        onClick={() => setActive(item.key)} onKeyDown={event => {
          const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + offset + items.length) % items.length;
          if (!offset && event.key !== 'Home' && event.key !== 'End') return;
          event.preventDefault(); setActive(items[next].key);
          document.getElementById(`${id}-tab-${items[next].key}`)?.focus();
        }}>{item.label}</button>)}
    </div>
    {items.map(item => <div key={item.key} role="tabpanel" tabIndex={0}
      id={`${id}-panel-${item.key}`} aria-labelledby={`${id}-tab-${item.key}`}
      hidden={active !== item.key} className="product-tab-panel">{item.content}</div>)}
  </div>;
}
