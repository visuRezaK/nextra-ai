import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data:runs } = await sb.from("eval_runs").select("id,status").eq("eval_group",2).order("started_at",{ascending:false}).limit(1);
const runId = runs![0].id;
console.log("group-2 runId:", runId, "status:", runs![0].status);
const { runEvaluation } = await import("./lib/chatbot/evaluate.ts");
for (let pass=1; pass<=6; pass++){
  const p = await runEvaluation(runId);
  console.log(`pass ${pass}: done=${p.done}/${p.total} complete=${p.complete}`);
  if (p.complete) break;
}
const { data:fin } = await sb.from("eval_runs").select("status,totals").eq("id",runId).single();
console.log("FINAL:", fin!.status, JSON.stringify(fin!.totals));
