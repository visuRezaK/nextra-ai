import { NextRequest, NextResponse } from "next/server";
import { getStaffUser } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { isLeadStatus, OPEN_LEAD_STATUSES } from "@/lib/admin/leads";

// CSV export of the leads table, honoring the same filters as the list page.
// Stage values stay raw ('new'/'won') rather than Persian — this is a machine
// export meant for a spreadsheet, not a screen.

function csvCell(value: string | null | undefined): string {
  if (value == null) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

const BASE_COLUMNS = "name, email, phone, message, source, created_at";
const CRM_COLUMNS = `${BASE_COLUMNS}, status, next_follow_up_at`;
const MONEY_COLUMNS = `${CRM_COLUMNS}, amount_cad, expected_close, won_at`;

const TIER_COLUMNS: Record<"money" | "crm" | "base", string> = {
  money: MONEY_COLUMNS,
  crm: CRM_COLUMNS,
  base: BASE_COLUMNS,
};

// The PostgREST type parser can't infer a row shape from a column list chosen at
// runtime; the later fields are absent from the lower-tier fallback queries.
type ExportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  created_at: string;
  status?: string | null;
  next_follow_up_at?: string | null;
  amount_cad?: number | string | null;
  expected_close?: string | null;
  won_at?: string | null;
};

export async function GET(request: NextRequest) {
  const staff = await getStaffUser();
  if (!staff || !["admin", "operator", "viewer"].includes(staff.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source");
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue");

  const supabase = getAdminClient();

  // Step down a tier at a time (admin7 → admin6 → original) so the export never
  // 500s, matching the list page.
  const buildQuery = (tier: "money" | "crm" | "base") => {
    const withCrm = tier !== "base";
    let query = supabase
      .from("contacts")
      .select(TIER_COLUMNS[tier])
      .order("created_at", { ascending: false })
      .limit(2000);

    if (source === "web" || source === "chatbot" || source === "voice")
      query = query.eq("source", source);
    if (withCrm && isLeadStatus(status)) query = query.eq("status", status);
    if (withCrm && overdue === "1") {
      query = query
        .not("next_follow_up_at", "is", null)
        .lt("next_follow_up_at", new Date().toISOString())
        .in("status", [...OPEN_LEAD_STATUSES]);
    }
    const term = q ? sanitizeQuery(q) : "";
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
    return query;
  };

  let crmReady = true;
  let moneyReady = true;
  let { data, error } = await buildQuery("money");
  if (error) {
    moneyReady = false;
    ({ data, error } = await buildQuery("crm"));
    if (error) {
      crmReady = false;
      ({ data, error } = await buildQuery("base"));
    }
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "name",
    "email",
    "phone",
    "message",
    "source",
    "created_at",
    ...(crmReady ? ["status", "next_follow_up_at"] : []),
    ...(moneyReady ? ["amount_cad", "expected_close", "won_at"] : []),
  ];
  const rows = (data ?? []) as unknown as ExportRow[];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvCell(row.name),
        csvCell(row.email),
        csvCell(row.phone),
        csvCell(row.message),
        csvCell(row.source),
        csvCell(row.created_at),
        ...(crmReady ? [csvCell(row.status), csvCell(row.next_follow_up_at)] : []),
        ...(moneyReady
          ? [
              // Raw digits, not faCad() — a spreadsheet needs to sum this column.
              csvCell(String(row.amount_cad ?? 0)),
              csvCell(row.expected_close),
              csvCell(row.won_at),
            ]
          : []),
      ].join(","),
    ),
  ];

  // BOM so Excel opens the Persian text as UTF-8.
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads.csv"',
    },
  });
}
