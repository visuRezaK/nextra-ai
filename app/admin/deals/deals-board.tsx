"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { daysInStage, type PipelineStage } from "@/lib/admin/crm";
import { moveDealAction } from "./actions";

export type BoardDeal = {
  id: string;
  title: string;
  amount: number;
  stageKey: string;
  stageEnteredAt: string | null;
  personId: string | null;
  personName: string | null;
};

// Latin digits + CAD, matching faCad — redeclared locally because this is a
// client component (ui.tsx is a server module).
function cad(n: number): string {
  if (!n) return "—";
  return new Intl.NumberFormat("fa-IR-u-nu-latn", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "code",
  }).format(n);
}

export function DealsBoard({
  stages,
  initialDeals,
}: {
  stages: PipelineStage[];
  initialDeals: BoardDeal[];
}) {
  const [deals, setDeals] = useState<BoardDeal[]>(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function move(dealId: string, toStage: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageKey === toStage) return;

    const stage = stages.find((s) => s.key === toStage);
    let reason: string | null = null;
    if (stage?.is_lost) {
      reason = window.prompt("دلیل باخت؟ (Lost reason)");
      if (reason === null) return; // cancelled
    }

    const prev = deals;
    setError("");
    setDeals((ds) =>
      ds.map((d) =>
        d.id === dealId ? { ...d, stageKey: toStage, stageEnteredAt: new Date().toISOString() } : d,
      ),
    );
    startTransition(async () => {
      const res = await moveDealAction(dealId, toStage, reason);
      if (!res.ok) {
        setDeals(prev); // revert
        setError(res.error);
      }
    });
  }

  return (
    <>
      {error ? (
        <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {/* Stages stack vertically (top→bottom in stage order); cards within each
          stage wrap horizontally. Columns are identified by stage key, not
          position, so drag targeting is unaffected by the layout. */}
      <div className="flex flex-col gap-4">
        {stages.map((stage) => {
          const column = deals.filter((d) => d.stageKey === stage.key);
          const sum = column.reduce((s, d) => s + d.amount, 0);
          const tone = stage.is_won
            ? "border-emerald-500/30"
            : stage.is_lost
              ? "border-red-500/30"
              : "border-border";
          return (
            <div
              key={stage.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.key);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                if (dragId) move(dragId, stage.key);
              }}
              className={`flex w-full flex-col rounded-xl border bg-surface/50 ${tone} ${
                overStage === stage.key ? "ring-2 ring-accent/40" : ""
              }`}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-medium">
                  {stage.label_fa}
                  <span dir="ltr" className="text-muted"> ({stage.label_en})</span>
                </span>
                <span className="text-xs text-muted">{column.length}</span>
              </div>

              <div className="flex min-h-16 flex-1 flex-wrap gap-2 p-2">
                {column.length === 0 ? (
                  <span className="px-1 py-2 text-xs text-muted">—</span>
                ) : null}
                {column.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => setDragId(null)}
                    className="w-60 cursor-grab rounded-lg border border-border bg-background p-3 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <Link
                      href={`/admin/deals/${d.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {d.title}
                    </Link>
                    {d.personName ? (
                      <p className="mt-0.5 text-xs text-muted">{d.personName}</p>
                    ) : null}
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-xs">{cad(d.amount)}</span>
                      <span className="text-[10px] text-muted">
                        {daysInStage(d.stageEnteredAt)} روز
                      </span>
                    </div>
                    {/* Mobile / touch fallback — dragging is unreliable on touch. */}
                    <select
                      value={d.stageKey}
                      onChange={(e) => move(d.id, e.target.value)}
                      className="mt-2 w-full rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none focus:border-accent"
                      aria-label="انتقال به مرحله"
                    >
                      {stages.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label_fa}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="border-t border-border px-3 py-2 text-xs text-muted">
                جمع: {cad(sum)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
