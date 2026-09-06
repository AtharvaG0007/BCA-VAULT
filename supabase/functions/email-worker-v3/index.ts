import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => Response.json({
  success: false,
  error: "Legacy Resend email worker retired. Use the admin email console at /admin/email.",
}, { status: 410 }));
