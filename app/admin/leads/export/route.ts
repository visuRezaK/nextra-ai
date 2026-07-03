import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

// CSV export of the leads table, honoring the same filters as the list page.

function csvCell(value: string | null): string {
  if (value == null) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source");
  const q = searchParams.get("q");

  const supabase = getAdminClient();
  let query = supabase
    .from("contacts")
    .select("name, email, phone, message, source, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (source === "web" || source === "chatbot") query = query.eq("source", source);
  const term = q ? sanitizeQuery(q) : "";
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["name", "email", "phone", "message", "source", "created_at"];
  const lines = [
    header.join(","),
    ...(data ?? []).map((row) =>
      [
        csvCell(row.name),
        csvCell(row.email),
        csvCell(row.phone),
        csvCell(row.message),
        csvCell(row.source),
        csvCell(row.created_at),
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
