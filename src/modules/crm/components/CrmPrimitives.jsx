export const crmChartPalette = ["#7c3aed", "#a855f7", "#c084fc", "#d8b4fe", "#8b5cf6", "#6d28d9"];

export const crmClassNames = (...values) => values.filter(Boolean).join(" ");

export function CrmPageShell({
  eyebrow,
  title,
  description,
  actions,
  children
}) {
  return (
    <div className="space-y-6 text-[#171226]">
      <div className="overflow-hidden rounded-[28px] border border-[#eadcf9] bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.2),_transparent_38%),linear-gradient(135deg,_#ffffff,_#fbf7ff_62%,_#f4ecff)] p-6 shadow-crm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8f69d1]">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="m-0 font-display text-3xl font-extrabold tracking-tight text-[#171226] md:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[#6f678a] md:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}

export function MetricCard({ label, value, helper, accent = "violet" }) {
  const accentClass = {
    violet: "from-[#f7f1ff] via-white to-[#efe2ff]",
    mint: "from-[#effff8] via-white to-[#d9fff2]",
    amber: "from-[#fff9ef] via-white to-[#fff1d6]",
    sky: "from-[#f1f6ff] via-white to-[#e7f0ff]"
  }[accent] || "from-[#f7f1ff] via-white to-[#efe2ff]";

  return (
    <div className={`rounded-3xl border border-[#eadcf9] bg-gradient-to-br ${accentClass} p-5 shadow-crm-soft`}>
      <div className="text-sm font-semibold text-[#8f69d1]">{label}</div>
      <div className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#171226]">
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-[#6f678a]">{helper}</div> : null}
    </div>
  );
}

export function SectionCard({ title, description, action, children, className = "" }) {
  return (
    <section className={crmClassNames("rounded-3xl border border-[#eadcf9] bg-white p-5 shadow-crm-soft", className)}>
      {(title || action) ? (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? (
              <h2 className="m-0 font-display text-xl font-bold text-[#171226]">{title}</h2>
            ) : null}
            {description ? (
              <p className="mb-0 mt-2 text-sm leading-6 text-[#6f678a]">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function InsightCard({ title, value, description, tone = "violet" }) {
  const toneClass = {
    violet: "bg-[#f6efff] text-[#6f3cc3]",
    amber: "bg-[#fff5df] text-[#a15e12]",
    mint: "bg-[#ebfff7] text-[#0d8a63]",
    rose: "bg-[#fff1fb] text-[#ad3f7e]"
  }[tone] || "bg-[#f6efff] text-[#6f3cc3]";

  return (
    <div className="rounded-3xl border border-[#eadcf9] bg-white p-4 shadow-crm-soft">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>{title}</div>
      <div className="mt-4 font-display text-2xl font-bold text-[#171226]">{value}</div>
      <p className="mb-0 mt-2 text-sm leading-6 text-[#6f678a]">{description}</p>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const toneClass = {
    neutral: "bg-[#f6f1ff] text-[#6f678a]",
    violet: "bg-[#f2e8ff] text-[#6b21a8]",
    mint: "bg-[#e8fff5] text-[#0f8c67]",
    amber: "bg-[#fff3df] text-[#b76819]",
    rose: "bg-[#fff0f6] text-[#c24180]",
    slate: "bg-[#f3f4f6] text-[#475569]"
  }[tone] || "bg-[#f6f1ff] text-[#6f678a]";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={crmClassNames(
        "inline-flex items-center justify-center rounded-2xl border border-[#7c3aed] bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#6d28d9]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={crmClassNames(
        "inline-flex items-center justify-center rounded-2xl border border-[#dbc8fb] bg-white px-4 py-2.5 text-sm font-semibold text-[#5f4b8b] transition hover:-translate-y-0.5 hover:border-[#c8aff6] hover:bg-[#faf7ff]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d8c3fb] bg-[#fcf9ff] p-8 text-center">
      <div className="font-display text-xl font-bold text-[#171226]">{title}</div>
      <p className="mb-0 mt-2 text-sm leading-6 text-[#6f678a]">{description}</p>
    </div>
  );
}

export function LoadingPanel({ label = "Loading CRM workspace..." }) {
  return (
    <div className="rounded-3xl border border-[#eadcf9] bg-white p-8 shadow-crm-soft">
      <div className="h-4 w-32 rounded-full bg-[#efe5ff]" />
      <div className="mt-4 h-8 w-1/3 rounded-full bg-[#f6efff]" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-3xl bg-[#f7f2ff]" />
        ))}
      </div>
      <div className="mt-5 text-sm text-[#6f678a]">{label}</div>
    </div>
  );
}

export function ErrorPanel({ title = "Something went wrong", description, action }) {
  return (
    <div className="rounded-3xl border border-[#f1c8db] bg-[#fff5fa] p-6 text-[#8f2e5f] shadow-crm-soft">
      <div className="font-display text-xl font-bold">{title}</div>
      <p className="mb-0 mt-2 text-sm leading-6 text-[#9f5f81]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function FormField({ label, children, hint }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-[#47386f]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[#8f84ac]">{hint}</span> : null}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-2xl border border-[#dbc8fb] bg-white px-4 py-3 text-sm text-[#171226] outline-none transition focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ede1ff]"
      {...props}
    />
  );
}

export function Select(props) {
  return (
    <select
      className="w-full rounded-2xl border border-[#dbc8fb] bg-white px-4 py-3 text-sm text-[#171226] outline-none transition focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ede1ff]"
      {...props}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      className="min-h-[120px] w-full rounded-2xl border border-[#dbc8fb] bg-white px-4 py-3 text-sm text-[#171226] outline-none transition focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ede1ff]"
      {...props}
    />
  );
}

export function Modal({ open, title, description, onClose, children, footer }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#120a24]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-[#eadcf9] bg-white p-6 shadow-[0_30px_80px_rgba(44,16,88,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="m-0 font-display text-2xl font-bold text-[#171226]">{title}</h3>
            {description ? (
              <p className="mb-0 mt-2 text-sm leading-6 text-[#6f678a]">{description}</p>
            ) : null}
          </div>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
