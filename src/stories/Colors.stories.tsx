import React from 'react';

export const ColorsStory = () => (
  <div className="min-h-screen bg-[var(--surface-page)] p-8 font-sans">
    <h1 className="text-3xl font-black text-[var(--fg-default)] mb-12">
      Perplexta Color System (GitHub Primer Architecture)
    </h1>

    {/* Surfaces */}
    <section className="mb-12">
      <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
        Surfaces
      </h2>
      <div className="grid grid-cols-4 gap-4">
        {[
          ['--surface-page', 'var(--surface-page)'],
          ['--surface-card', 'var(--surface-card)'],
          ['--surface-subtle', 'var(--surface-subtle)'],
          ['--surface-inset', 'var(--surface-inset)'],
        ].map(([name, value]) => (
          <div
            key={name}
            className="border border-[var(--border-default)] rounded-[var(--radius-md)] p-4 shadow-sm"
            style={{ backgroundColor: value }}
          >
            <code className="text-xs font-mono text-[var(--fg-muted)]">{name}</code>
          </div>
        ))}
      </div>
    </section>

    {/* Text Colors */}
    <section className="mb-12">
      <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
        Foreground / Text
      </h2>
      <div className="space-y-3 bg-[var(--surface-card)] p-6 rounded-[var(--radius-md)] border border-[var(--border-default)]">
        <div className="text-[var(--fg-default)] font-semibold">
          Default Text (var(--fg-default))
        </div>
        <div className="text-[var(--fg-muted)]">
          Muted Text (var(--fg-muted))
        </div>
        <div className="text-[var(--fg-disabled)]">
          Disabled Text (var(--fg-disabled))
        </div>
        <div className="text-[var(--fg-accent)] font-bold">
          Accent Text (var(--fg-accent))
        </div>
      </div>
    </section>

    {/* Status Colors */}
    <section>
      <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
        Status Colors
      </h2>
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Success', 'var(--bg-success-muted)', 'var(--fg-success)'],
          ['Danger', 'var(--bg-danger-muted)', 'var(--fg-danger)'],
          ['Warning', 'var(--bg-attention-muted)', 'var(--fg-attention)'],
          ['Info', 'var(--bg-info-muted)', 'var(--fg-info)'],
        ].map(([name, bg, fg]) => (
          <div
            key={name}
            className="rounded-[var(--radius-sm)] p-4 font-bold text-center border border-current/10"
            style={{
              backgroundColor: bg,
              color: fg,
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default ColorsStory;
