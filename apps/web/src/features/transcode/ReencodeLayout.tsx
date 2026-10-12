export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-2 grid grid-cols-[110px_1fr] items-center gap-3 mobile-max:grid-cols-1">
      <span className="text-[13px] text-neutral-400">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-neutral-800 py-3.5 last:border-b-0">
      <h3 className="mb-2.5 font-mono text-xs uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  );
}
