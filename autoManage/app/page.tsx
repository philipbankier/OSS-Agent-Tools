export default function HomePage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header className="rounded-xl border border-slate-800 bg-panel p-6">
        <h1 className="text-2xl font-semibold">autoManage B1 Scaffold</h1>
        <p className="mt-2 text-slate-300">
          Dashboard foundation is wired to TasteKit trace contracts. Next slices add ingestion,
          storage, SSE, and live cards.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-medium">Contract Policy</h2>
          <p className="mt-2 text-sm text-slate-300">
            Canonical traces: <code>.tastekit/ops/traces/</code>. Legacy fallback: <code>.tastekit/traces/</code>.
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-lg font-medium">B1 Boundaries</h2>
          <p className="mt-2 text-sm text-slate-300">
            Local-first and read-only. No remote websocket transport or command execution in this wave.
          </p>
        </article>
      </section>
    </main>
  );
}
