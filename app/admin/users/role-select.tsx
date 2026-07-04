"use client";

import { useActionState } from "react";
import { changeRoleAction, type RoleActionState } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  user: "کاربر عادی",
  admin: "ادمین",
  editor: "ویرایشگر",
  operator: "اپراتور",
  viewer: "فقط‌خواندنی",
};

export function RoleSelect({
  id,
  role,
  isSelf,
}: {
  id: string;
  role: string;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<RoleActionState, FormData>(
    changeRoleAction,
    undefined,
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        defaultValue={role}
        disabled={isSelf || pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-accent disabled:opacity-60"
        title={isSelf ? "نقش خودتان را نمی‌توانید تغییر دهید" : undefined}
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-muted">…</span> : null}
      {state && !state.ok ? (
        <span className="text-xs text-red-500">{state.error}</span>
      ) : null}
    </form>
  );
}
