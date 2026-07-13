import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = {};
for (const l of readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
console.log("now:", new Date().toISOString());
const { data:runs } = await sb.from("eval_runs").select("id,status,model,judge_model,started_at").eq("eval_group",4).order("started_at",{ascending:false}).limit(1);
if(!runs || !runs.length){console.log("هنوز اجرایی برای دستهٔ ۴ نیست — تبِ نو + login؟");process.exit(0);}
const r=runs[0];
console.log(`run ${r.started_at} status=${r.status} model=${r.model} judge=${r.judge_model}`);
const runId=r.id;
for(let i=0;i<9;i++){
  const { data:rows } = await sb.from("eval_results").select("verdict,scores,question").eq("run_id",runId).order("created_at",{ascending:true});
  const { data:run } = await sb.from("eval_runs").select("status,totals").eq("id",runId).single();
  const sc=(rows??[]).filter(x=>x.verdict!=="skipped").length, sk=(rows??[]).filter(x=>x.verdict==="skipped").length;
  console.log(`[+${i*15}s] status=${run.status} scored=${sc} skipped=${sk} health=${run.totals?.health??"-"}`);
  if(run.status!=="running"){
    console.log("--- FINAL ---");
    for(const q of rows??[]){const s=q.scores??{};console.log(`  [${q.verdict}] F${s.faithfulness??"-"} R${s.relevance??"-"} T${s.tone??"-"} Ret${s.retrieval??"-"} :: ${q.question.slice(0,42)}`);}
    break;
  }
  if(i<8)await sleep(15000);
}
