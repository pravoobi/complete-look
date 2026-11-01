export type StepId = 'photo' | 'colours' | 'outfit' | 'jewellery' | 'makeup';

const STEPS: { id: StepId; label: string; api: string }[] = [
  { id: 'photo', label: 'Photo', api: 'Upload' },
  { id: 'colours', label: 'Colours', api: 'Facial Color Tones Analyzer' },
  { id: 'outfit', label: 'Outfit', api: 'Clothes Try-On' },
  { id: 'jewellery', label: 'Jewellery', api: 'Earrings + Necklace Try-On' },
  { id: 'makeup', label: 'Makeup', api: 'Makeup Try-On' },
];

/** Each step lights up only when its real YouCam task has returned. */
export function StepRail({ done, running }: { done: StepId[]; running?: StepId | null }) {
  return (
    <ol className="flex w-full gap-1 overflow-x-auto pb-1 text-xs sm:text-sm" aria-label="Steps">
      {STEPS.map((s, i) => {
        const isDone = done.includes(s.id);
        const isRunning = running === s.id;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className={`h-1.5 rounded-full ${isDone ? 'bg-[var(--accent)]' : isRunning ? 'animate-pulse bg-[var(--accent)]/50' : 'bg-[var(--line)]'}`}
            />
            <div className="flex items-baseline gap-1">
              <span className={`font-medium ${isDone ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                {i + 1}. {s.label}
              </span>
            </div>
            <span className="hidden truncate text-[11px] text-[var(--muted)] sm:block">{s.api}</span>
          </li>
        );
      })}
    </ol>
  );
}
