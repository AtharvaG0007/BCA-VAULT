const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://bcavault.in",
  "https://www.bcavault.in",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".figma.site");
  const allowOrigin = isAllowed ? origin : (origin || "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const SYSTEM_INSTRUCTION = `You are the official AI Assistant for BCA Vault (bcavault.in), a dedicated educational platform for Bachelor of Computer Applications (BCA) students, especially Bharati Vidyapeeth Deemed University (BVDU).

Key Platform Facts:
- Purpose: BCA Vault provides semester-wise notes, Previous Year Questions (PYQs) with solutions, and comprehensive theory bundles.
- Semesters: Covers BCA Semesters 1 through 6.
- Access: Free previews are available on the website. Full bundles require manual purchase verification.
- Payment Process: Students transfer via UPI (QR code / UPI ID provided at checkout), upload their transaction screenshot and enter the 12-digit UTR/transaction ID. The administration team manually verifies payments and activates dashboard access.
- Support Email: bcavault07@gmail.com
- Rules:
  1. Be concise, friendly, encouraging, and accurate.
  2. If a student asks about subject syllabus, explain key topics (e.g. C Programming, Data Structures, Java, DBMS, Web Tech, OS, Software Engineering).
  3. Never invent fake phone numbers, unofficial discount codes, or promise immediate instant automated access without payment verification.
  4. Always guide students to the Notes, Bundles, or Checkout pages on the platform when relevant.`;

// Fallback knowledge engine if no Gemini API key is configured
function generateRuleBasedAnswer(message: string): string {
  const q = message.toLowerCase();
  if (q.includes("payment") || q.includes("upi") || q.includes("utr") || q.includes("buy") || q.includes("purchase")) {
    return "To purchase a course bundle on BCA Vault:\n1. Browse to **Bundles** or **Pricing** and choose your semester.\n2. Click **Get Access** or **Purchase** to see the UPI payment details.\n3. Complete the transfer using any UPI app and save the screenshot & 12-digit UTR number.\n4. Submit your payment evidence on the form. Our admin team will verify it and activate your notes in your Student Dashboard!";
  }
  if (q.includes("support") || q.includes("contact") || q.includes("help") || q.includes("email")) {
    return "You can reach the BCA Vault administrative team directly at **bcavault07@gmail.com**. We typically respond within a few hours to assist with access, verification, or questions.";
  }
  if (q.includes("semester") || q.includes("sem 1") || q.includes("sem 2") || q.includes("sem 3") || q.includes("sem 4") || q.includes("sem 5") || q.includes("sem 6")) {
    return "BCA Vault covers BCA curriculum across Semesters 1 to 6, including Core Programming (C, C++, Java, Python), Web Technologies, DBMS, Computer Networks, and Software Engineering with solved PYQs. Check the **Notes** page to explore available units!";
  }
  if (q.includes("free") || q.includes("preview") || q.includes("demo")) {
    return "You can explore the syllabus breakdown, subject previews, and sample PYQ analysis directly on the **Notes** and **PYQ** sections without logging in!";
  }
  return "Hello! I am the BCA Vault AI Assistant. I can help you with questions regarding BCA study notes, PYQ solutions, semester bundles, payment verification, and platform navigation. How can I help you today?";
}

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const userMessage = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!geminiKey) {
      // Return intelligent rule-based answer if key is not yet set in Supabase secrets
      const reply = generateRuleBasedAnswer(userMessage);
      return new Response(
        JSON.stringify({ success: true, reply, source: "rules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversation for Gemini generateContent API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const item of history.slice(-6)) {
      if (item && item.content && (item.role === "user" || item.role === "model")) {
        contents.push({
          role: item.role,
          parts: [{ text: String(item.content) }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.warn("Gemini API error, falling back to rule engine:", await geminiRes.text());
      const fallbackReply = generateRuleBasedAnswer(userMessage);
      return new Response(
        JSON.stringify({ success: true, reply: fallbackReply, source: "rules_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateRuleBasedAnswer(userMessage);

    return new Response(
      JSON.stringify({ success: true, reply: replyText, source: "gemini" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("gemini-chat error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unable to generate AI response.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
