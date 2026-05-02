import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { session_id } = await req.json();

    // 1. Pick batch - Batch size: 3 jobs per cycle (conservative)
    const { data: jobs } = await supabase
      .from("import_jobs")
      .select("id")
      .eq("session_id", session_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(3);

    if (!jobs || jobs.length === 0) {
      // Check if all are terminal
      const { data: remaining } = await supabase
        .from("import_jobs")
        .select("id")
        .eq("session_id", session_id)
        .eq("status", "pending")
        .limit(1);

      if (!remaining || remaining.length === 0) {
        await supabase.from("import_sessions").update({ 
          status: "done", 
          finished_at: new Date().toISOString() 
        }).eq("id", session_id);
      }
      return new Response("Done", { headers: corsHeaders });
    }

    // 2. Process batch sequentially with delay
    for (const job of jobs) {
      try {
        await fetch(`${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/process-import-job`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ job_id: job.id })
        });
        // Delay between jobs: 2000ms minimum
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Error processing job ${job.id}:`, e);
      }
    }

    // 3. Self-invoke for next batch - Delay between batches: 3000ms
    await new Promise(r => setTimeout(r, 3000));
    
    await fetch(`${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/orchestrate-import`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_id })
    });

    return new Response("Batch processed", { headers: corsHeaders });

  } catch (error) {
    console.error("Orchestration error:", error);
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }
});
