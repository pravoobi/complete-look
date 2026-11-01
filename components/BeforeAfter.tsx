'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';

/** Drag the handle to compare the original photo with the try-on result. */
export function BeforeAfter({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--card)] select-none" style={{ aspectRatio: '900 / 822' }}>
      <img src={after} alt={`${alt}: after`} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={before}
        alt={`${alt}: before`}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm text-[var(--ink)] shadow-md">
          ⇆
        </div>
      </div>
      <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">Before</span>
      <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
