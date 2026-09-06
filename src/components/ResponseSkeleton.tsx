
export const ResponseSkeleton = ({ dir }: { dir?: 'ltr' | 'rtl' }) => (
  <div className="flex flex-col gap-3 w-full animate-pulse transition-theme">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-[4px] bg-accent/40" />
      <div className="h-1.5 w-32 bg-[var(--bg-overlay)] rounded-[4px]" />
    </div>
    <div className="space-y-3">
      <div className="h-2 w-full bg-[var(--bg-overlay)] rounded-[4px]" />
      <div className="h-2 w-[85%] bg-[var(--bg-overlay)] rounded-[4px]" />
      <div className="h-2 w-[60%] bg-[var(--bg-overlay)] rounded-[4px]" />
    </div>
  </div>
);
