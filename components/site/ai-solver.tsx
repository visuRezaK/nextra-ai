// Screen-1 motion graphic: a friendly AI core that solves daily business tasks
// one by one (each chip gets a ✓). Pure inline SVG + CSS animations (keyframes
// live in app/globals.css under "AI solves your daily tasks"). No image asset,
// transform/opacity only — stays smooth on mobile. Labels are RTL Persian.

type Task = {
  label: string;
  pill: { x: number; y: number; w: number; h: number };
  text: { x: number; y: number };
  port: { x: number; y: number };
  dot: { x: number; y: number; cls: string };
  check: string;
};

const TASKS: Task[] = [
  {
    label: "پاسخ مشتری",
    pill: { x: 148, y: 26, w: 104, h: 34 },
    text: { x: 200, y: 43 },
    port: { x: 200, y: 60 },
    dot: { x: 200, y: 110, cls: "ai-dot-up" },
    check: "ai-check-up",
  },
  {
    label: "CRM",
    pill: { x: 280, y: 133, w: 92, h: 34 },
    text: { x: 326, y: 150 },
    port: { x: 280, y: 150 },
    dot: { x: 240, y: 150, cls: "ai-dot-right" },
    check: "ai-check-right",
  },
  {
    label: "وب‌سایت",
    pill: { x: 148, y: 240, w: 104, h: 34 },
    text: { x: 200, y: 257 },
    port: { x: 200, y: 240 },
    dot: { x: 200, y: 190, cls: "ai-dot-down" },
    check: "ai-check-down",
  },
  {
    label: "چت‌بات",
    pill: { x: 28, y: 133, w: 92, h: 34 },
    text: { x: 74, y: 150 },
    port: { x: 120, y: 150 },
    dot: { x: 160, y: 150, cls: "ai-dot-left" },
    check: "ai-check-left",
  },
];

export function AiSolver() {
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <svg
        viewBox="0 0 400 300"
        width="100%"
        height="auto"
        role="img"
        aria-label="هوش مصنوعی کارهای روزمره‌ی کسب‌وکار را یکی‌یکی حل می‌کند"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="aiCoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#38BDF8" />
            <stop offset="1" stopColor="#0284C7" />
          </linearGradient>
          <radialGradient id="aiHaloGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#7DD3FC" stopOpacity="0.9" />
            <stop offset="1" stopColor="#7DD3FC" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* glow halo */}
        <circle className="ai-halo" cx="200" cy="150" r="82" fill="url(#aiHaloGrad)" />

        {/* connectors core -> task ports */}
        <g stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 6">
          <line x1="200" y1="110" x2="200" y2="62" />
          <line x1="200" y1="190" x2="200" y2="238" />
          <line x1="160" y1="150" x2="122" y2="150" />
          <line x1="240" y1="150" x2="278" y2="150" />
        </g>

        {/* traveling "solution" dots */}
        {TASKS.map((t) => (
          <circle
            key={`dot-${t.label}`}
            className={`ai-dot ${t.dot.cls}`}
            cx={t.dot.x}
            cy={t.dot.y}
            r="4.5"
            fill="#0EA5E9"
          />
        ))}

        {/* task chips */}
        {TASKS.map((t) => (
          <g key={`chip-${t.label}`}>
            <rect
              x={t.pill.x}
              y={t.pill.y}
              width={t.pill.w}
              height={t.pill.h}
              rx="17"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            <text
              x={t.text.x}
              y={t.text.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="600"
              fill="#0f172a"
              style={{ fontFamily: "var(--font-vazir)" }}
            >
              {t.label}
            </text>
            <circle cx={t.port.x} cy={t.port.y} r="5" fill="#0EA5E9" />
          </g>
        ))}

        {/* AI robot core */}
        <g className="ai-core">
          <rect x="160" y="110" width="80" height="80" rx="22" fill="url(#aiCoreGrad)" />
          <rect x="174" y="129" width="52" height="27" rx="13" fill="#082F49" fillOpacity="0.9" />
          <circle cx="188" cy="142" r="5" fill="#ffffff" />
          <circle cx="212" cy="142" r="5" fill="#ffffff" />
          <rect x="191" y="166" width="18" height="4" rx="2" fill="#bae6fd" />
        </g>

        {/* "solved" checkmarks over each port */}
        {TASKS.map((t) => (
          <g key={`check-${t.label}`} className={`ai-check ${t.check}`}>
            <circle cx={t.port.x} cy={t.port.y} r="10" fill="#10b981" />
            <path
              d={`M ${t.port.x - 4.5} ${t.port.y + 0.5} l 3 3 l 6 -7`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
