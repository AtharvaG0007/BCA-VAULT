import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ═══════════════════════════════════════════════════════════════
// PUBLIC CUSTOMER SUPPORT AI — BCA Vault
// ═══════════════════════════════════════════════════════════════
// This Edge Function serves ONLY public website/business questions.
// It has NO access to student data, profiles, notes, or academic content.
// It does NOT require authentication.
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bca-vault-bay.vercel.app",
  "https://bca-vault-atharv-0700s-projects.vercel.app",
  "https://bcavault.in",
  "https://www.bcavault.in",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".workers.dev") ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".figma.site") ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowOrigin = isAllowed ? origin : (origin || ALLOWED_ORIGINS[0]);

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// ── IP-based rate limiting: 20 requests per 5 minutes ──────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count++;
  return true;
}

// ── Public Support System Prompt ───────────────────────────────
const PUBLIC_SUPPORT_SYSTEM_PROMPT = `You are the official BCA Vault Customer Support Assistant for the website bcavault.in.

You ONLY answer questions about BCA Vault's publicly available information.

You are NOT an academic tutor. You do NOT explain programming concepts, computer science topics, or any educational material.

═══════════════════════════════════
ALLOWED KNOWLEDGE (answer these):
═══════════════════════════════════

ABOUT BCA VAULT:
- BCA Vault is the premier educational notes platform for BCA (Bachelor of Computer Applications) students.
- Specifically designed for Bharati Vidyapeeth Deemed University (BVDU) students.
- Provides comprehensive, exam-ready study notes, previous year questions (PYQs), and learning resources.
- Website: https://bcavault.in

BUNDLE & PRICING:
- BCA Vault offers an All-Access Bundle containing complete semester-wise notes for BCA.
- Original price: ₹899
- Active coupon: BUDMS400 → ₹400 OFF → final price ₹499
- Active coupon: WINNER150 → additional discount → final price ₹349
- Bundle includes: All semester notes, PYQs, important questions, exam preparation material.
- One-time purchase, lifetime access.

HOW TO PURCHASE:
1. Visit the Pricing or Bundles page on bcavault.in.
2. Click "Get Bundle" or "Purchase Now".
3. Fill the registration/order form with your name, email, phone, college details.
4. Make payment via UPI (direct transfer).
5. Upload payment screenshot as evidence.
6. Your login credentials will be created and sent to your registered email within 24 hours.

PAYMENT:
- Payment method: UPI Direct Transfer
- After payment, upload the screenshot on the payment page.
- If payment verification is delayed, contact support via WhatsApp or email.

AFTER PURCHASE:
- Students receive login credentials (email + password) via email.
- Use these credentials to log in at bcavault.in/auth/login.
- After login, the student dashboard shows all accessible notes and materials.
- Students can view and read notes directly in the secure PDF viewer.

CONTACT & SUPPORT:
- Email: bcavault07@gmail.com
- WhatsApp: +91 93263 42123 (click to chat: https://wa.me/919326342123)
- Response time: Usually within a few hours during business hours.

WEBSITE NAVIGATION:
- Home page: Overview, features, syllabus preview
- Notes page: Browse available notes by semester
- PYQ page: Previous year question papers
- Bundles page: View bundle details and pricing
- Pricing page: See current offers and purchase
- Login: /auth/login for existing students

FAQs:
Q: Is BCA Vault free?
A: BCA Vault offers free syllabus previews. Full notes access requires purchasing the All-Access Bundle.

Q: How do I get my login?
A: After successful payment verification, your credentials are sent to your registered email within 24 hours.

Q: Can I access notes on mobile?
A: Yes, BCA Vault is fully responsive and works on all devices.

Q: What if I have payment issues?
A: Contact support via WhatsApp (+91 93263 42123) or email (bcavault07@gmail.com).

Q: Is there a refund policy?
A: Digital products are generally non-refundable. Contact support for specific concerns.

═══════════════════════════════════
STRICT RULES:
═══════════════════════════════════

1. If someone asks an academic/educational question (e.g. "Explain pointers", "What is DBMS?", "Write a C program"), respond with:
   "I'm the BCA Vault customer support assistant. I can help with bundles, pricing, payments, registration, and website questions. For academic questions like this, please log in to your student portal at bcavault.in/auth/login and use the Student AI Learning Assistant."

2. NEVER explain programming concepts, algorithms, data structures, or any academic topic.

3. NEVER invent prices, fake coupons, or unauthorized offers.

4. NEVER reveal internal system details, API keys, database info, or admin information.

5. NEVER provide information about specific students, their data, or their accounts.

6. Keep responses friendly, concise, and helpful.

7. Always suggest WhatsApp support (+91 93263 42123) for urgent matters.

8. Use emojis sparingly. Be professional but approachable.`;

// ── Academic question detector ─────────────────────────────────
const ACADEMIC_KEYWORDS = [
  "explain", "define", "what is", "how does", "write a program",
  "write code", "algorithm", "pointer", "array", "function",
  "recursion", "loop", "variable", "data type", "struct",
  "inheritance", "polymorphism", "encapsulation", "abstraction",
  "class", "object", "constructor", "exception", "thread",
  "sql", "query", "normalization", "join", "select",
  "process", "deadlock", "scheduling", "paging", "segmentation",
  "html tag", "css property", "javascript function", "dom",
  "python", "java", "c programming", "c language",
  "operating system", "dbms", "database", "compiler",
  "linked list", "stack", "queue", "tree", "graph",
  "sorting", "searching", "binary", "oop", "mcq",
  "quiz me", "test me", "study plan", "revision",
  "exam question", "important question", "pyq solution",
  "semester 1", "semester 2", "sem 1", "sem 2",
  "syllabus breakdown", "unit wise", "chapter",
];

function isAcademicQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  // If message also contains business keywords, it's probably a support question
  const businessKeywords = [
    "price", "buy", "purchase", "payment", "pay", "bundle",
    "coupon", "discount", "login", "credential", "register",
    "contact", "support", "whatsapp", "refund", "access",
    "how to get", "how to buy", "how much", "cost",
  ];
  const hasBusiness = businessKeywords.some((kw) => lower.includes(kw));
  if (hasBusiness) return false;

  return ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Rule-based fallback for when Gemini is unavailable ─────────
function generateSupportFallback(message: string): string {
  const q = message.toLowerCase();

  if (q.includes("price") || q.includes("cost") || q.includes("how much")) {
    return `The BCA Vault All-Access Bundle is originally priced at **₹899**.\n\n🎉 **Active offers:**\n- Use coupon **BUDMS400** → Get ₹400 OFF → Pay only **₹499**\n- Use coupon **WINNER150** → Pay only **₹349**\n\nVisit the [Pricing Page](https://bcavault.in/pricing) to purchase!\n\nNeed help? WhatsApp us at **+91 93263 42123**.`;
  }

  if (q.includes("bundle") || q.includes("include") || q.includes("what do i get")) {
    return `The **BCA Vault All-Access Bundle** includes:\n\n📚 Complete semester-wise notes (Sem 1–6)\n📝 Previous Year Questions (PYQs)\n⭐ Important questions & exam preparation material\n💡 Subject-wise organized content\n🔒 Lifetime access after one-time purchase\n\nOriginal price: ₹899 | With coupon BUDMS400: **₹499**\n\nVisit [Bundles](https://bcavault.in/bundles) for details!`;
  }

  if (q.includes("pay") || q.includes("upi") || q.includes("payment")) {
    return `**Payment Process:**\n\n1. Go to the [Payment Page](https://bcavault.in/purchase)\n2. Fill in your details (name, email, phone, college)\n3. Pay via **UPI Direct Transfer**\n4. Upload your payment screenshot\n5. Your login credentials will be sent to your email within **24 hours**\n\nHaving payment issues? Contact us on WhatsApp: **+91 93263 42123**`;
  }

  if (q.includes("login") || q.includes("credential") || q.includes("password")) {
    return `**How to get your login:**\n\n1. After successful payment, your credentials are created by our team.\n2. You'll receive an email with your **login email and password** within 24 hours.\n3. Use these to log in at [bcavault.in/auth/login](https://bcavault.in/auth/login)\n\nNot received your credentials? Contact support:\n📧 bcavault07@gmail.com\n📱 WhatsApp: +91 93263 42123`;
  }

  if (q.includes("contact") || q.includes("support") || q.includes("help") || q.includes("whatsapp")) {
    return `**Contact BCA Vault Support:**\n\n📧 Email: bcavault07@gmail.com\n📱 WhatsApp: [+91 93263 42123](https://wa.me/919326342123)\n\nWe typically respond within a few hours during business hours. For urgent matters, WhatsApp is the fastest way to reach us!`;
  }

  if (q.includes("coupon") || q.includes("discount") || q.includes("offer")) {
    return `**Active Coupon Codes:**\n\n🏷️ **BUDMS400** — ₹400 OFF (Final price: ₹499)\n🏷️ **WINNER150** — Special discount (Final price: ₹349)\n\nApply the coupon during checkout on the [Payment Page](https://bcavault.in/purchase)!`;
  }

  if (q.includes("refund")) {
    return `Digital products are generally **non-refundable** once access has been granted. However, if you have a specific concern, please reach out to our support team:\n\n📧 bcavault07@gmail.com\n📱 WhatsApp: +91 93263 42123\n\nWe'll do our best to help!`;
  }

  // Default support response
  return `👋 Hello! I'm the **BCA Vault Support Assistant**.\n\nI can help you with:\n- 📦 **Bundle details** — what's included\n- 💰 **Pricing & coupons** — current offers\n- 💳 **Payment process** — how to pay\n- 🔐 **Login & credentials** — accessing your account\n- 📞 **Contact support** — reaching our team\n- 🌐 **Website navigation** — finding what you need\n\nWhat would you like to know?`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  // Handle CORS preflight BEFORE any logic
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
    // Rate limit by IP
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "anonymous";
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You've sent too many messages. Please wait a few minutes and try again.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const userMessage = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userMessage.length > 1000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is too long. Please keep it under 1000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is an academic question — provide redirect response
    if (isAcademicQuestion(userMessage)) {
      const redirectReply = "I'm the **BCA Vault customer support assistant**. I can help with bundles, pricing, payments, registration, and website questions.\n\nFor academic questions like this, please **log in to your student portal** at [bcavault.in/auth/login](https://bcavault.in/auth/login) and use the **Student AI Learning Assistant** 🎓\n\nIs there anything else about BCA Vault I can help you with?";
      return new Response(
        JSON.stringify({ success: true, reply: redirectReply, source: "public_support_redirect" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Gemini API
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!geminiKey) {
      // Fallback to rule-based responses
      const reply = generateSupportFallback(userMessage);
      return new Response(
        JSON.stringify({ success: true, reply, source: "public_support_rules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation for Gemini
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
          parts: [{ text: PUBLIC_SUPPORT_SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500,
          topP: 0.85,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.warn("Public support Gemini API error:", await geminiRes.text());
      const fallbackReply = generateSupportFallback(userMessage);
      return new Response(
        JSON.stringify({ success: true, reply: fallbackReply, source: "public_support_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateSupportFallback(userMessage);

    return new Response(
      JSON.stringify({ success: true, reply: replyText, source: "public_support_gemini" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("public-support-chat error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Something went wrong. Please try again or contact support at bcavault07@gmail.com.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
