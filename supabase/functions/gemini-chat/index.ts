import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// In-memory rate limiting: max 30 requests per 5 minutes per user/IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 30) {
    return false;
  }

  entry.count++;
  return true;
}

// BCA Syllabus Knowledge Base
const SYLLABUS_KNOWLEDGE = `
BCA Curriculum Overview (Bharati Vidyapeeth BVDU FMS / General BCA):
- Semester 1 Subjects:
  1. Algorithms & Program Design using C (Course Code 101):
     - Algorithms, Flowcharts, Problem Solving
     - C Tokens, Data Types, Variables, Operators, Header files
     - Control Structures: if-else, switch-case, while, for, do-while, break, continue
     - Functions: Declaration, Definition, Call by Value, Recursion
     - Pointers: Pointer arithmetic, Call by Reference, Pointers with arrays
     - Arrays (1D & 2D), Strings (string.h functions), Structures & Unions
  2. Foundations of Computing (Course Code 103):
     - Computer Fundamentals, Generations, Block diagram, Hardware vs Software
     - Input/Output Devices: Keyboard, Mouse, Scanner, MICR, OMR, VDU, Printers
     - Memory Hierarchy: RAM, ROM, Cache, Virtual memory, Secondary storage
     - System & Application Software, Computer Networks, Data Transmission Media
     - MS Office: Word, Excel, PowerPoint, Access
  3. Communication Skills (Course Code 104):
     - Concept & Process of Communication, Types, Barriers to Communication
     - Verbal & Non-verbal Communication, Body Language
     - Language Skills: Listening, Reading, Speaking, Writing (LSRW)
  4. Client-Side Web Technologies (Course Code 105):
     - HTML & HTML5: Tags, Text formatting, Tables, Lists, Forms, Multimedia
     - CSS: Inline/Internal/External, Selectors, Box Model, Flexbox, Positioning
     - JavaScript Basics: Data types, Operators, Functions, Dialog boxes, Window objects
     - DOM Manipulation, Event Handling, Client-side Form Validation

- Semester 2 Subjects:
  1. Database Management Systems (DBMS - 201):
     - DBMS Architecture, ER Modeling, Relational Model, Keys, Normalization (1NF, 2NF, 3NF, BCNF)
     - SQL: DDL, DML, DQL, Joins, Subqueries, Aggregate functions, Views, Transactions (ACID)
  2. Object Oriented Programming with Java (202):
     - OOP Concepts: Encapsulation, Inheritance, Polymorphism, Abstraction
     - Classes, Objects, Constructors, 'this' and 'super', Packages, Interfaces
     - Exception Handling (try-catch-finally, throw, throws), Multithreading
  3. Operating Systems (203):
     - OS Functions, Process Management, CPU Scheduling (FCFS, SJF, RR, Priority)
     - Process Synchronization, Deadlocks (Prevention, Avoidance, Banker's Algorithm)
     - Memory Management: Paging, Segmentation, Virtual Memory
  4. Python Programming (204):
     - Syntax, Control flow, Functions, Lists, Tuples, Dictionaries, Sets, File I/O
  5. Cyber Security (205) & Environmental Studies (206)
`;

function buildSystemPrompt(
  studentProfile: { name: string; course: string; semester: number | null; email: string } | null,
  activeBundles: string[],
  accessibleNotes: Array<{ title: string; subject: string | null; semester: number | null }>
): string {
  let contextSection = "";
  if (studentProfile) {
    contextSection = `
AUTHENTICATED STUDENT PROFILE:
- Name: ${studentProfile.name}
- Enrolled Course: ${studentProfile.course || "BCA"}
- Current Semester: ${studentProfile.semester ? `Semester ${studentProfile.semester}` : "BCA Student"}
- Active Subscribed Bundles: ${activeBundles.length > 0 ? activeBundles.join(", ") : "Standard Access"}
- Accessible Study Notes in BCA Vault:
${accessibleNotes.length > 0 ? accessibleNotes.map((n) => `  * ${n.title} (Subject: ${n.subject || "Theory"}, Sem ${n.semester || 1})`).join("\n") : "  * All preview notes and syllabus materials"}
`;
  } else {
    contextSection = `
VISITOR STATUS:
- Public guest visitor exploring BCA Vault platform and syllabus previews.
`;
  }

  return `You are the official AI Learning Assistant for BCA Vault (bcavault.in), the premier educational platform for Bachelor of Computer Applications (BCA) students (especially Bharati Vidyapeeth BVDU curriculum).

${contextSection}

${SYLLABUS_KNOWLEDGE}

CORE CAPABILITIES & PEDAGOGICAL MODES:
1. EXPLAIN MODE:
   - Provide clear, simple, step-by-step conceptual breakdowns.
   - For beginners: Use simple English, analogies, and real-world intuition.
   - For code: Provide clean, commented C / Java / Python / JavaScript snippets.

2. REVISION & SUMMARY MODE:
   - Provide high-yield summaries, key definitions, formulas, and comparison tables (e.g. Call by Value vs Call by Reference, Structure vs Union, Process vs Thread).

3. EXAM PREPARATION MODE:
   - Provide standard 5-mark and 10-mark exam questions, structured answers, and PYQ trends.

4. INTERACTIVE QUIZ MODE:
   - When a student wants to practice or test themselves, present 1 Multiple Choice Question at a time with 4 options (A, B, C, D).
   - Once the student answers, evaluate their response, explain the underlying concept, and offer the next question.

5. 7-DAY STUDY PLAN MODE:
   - Create a realistic day-by-day timetable tailored to the student's semester and subjects.

STRICT BEHAVIORAL RULES:
- Address the student warmly and encouragingly (use their name if available).
- Prioritize BCA Vault's curriculum and note topics. If a topic is part of their notes or syllabus (e.g., C Programming, DBMS, OOP), reference the subject naturally.
- If a concept is outside BCA Vault notes, explain it using general computer science knowledge while clearly noting: "Your BCA Vault notes don't have this specific topic, but here is a clear explanation...".
- NEVER invent false prices, fake discount codes, or hallucinate unauthorized files.
- Official support email: bcavault07@gmail.com | WhatsApp: +919326342123
- Active coupon code: BUDMS400 (₹400 OFF, final price ₹499) | WINNER150 (₹349)
- Do NOT generate or execute arbitrary SQL queries. Keep output safe, educational, and formatting clean using Markdown.`;
}

// Educational Fallback Engine for offline / quota fallback
function generateEducationalFallback(
  message: string,
  studentName?: string,
  semester?: number | null
): string {
  const q = message.toLowerCase();
  const greeting = studentName ? `Hello **${studentName}**!` : "Hello!";

  // 1. C Pointers / Memory
  if (q.includes("pointer") || q.includes("address")) {
    return `${greeting} Here is a beginner-friendly explanation of **Pointers in C** (Covered in BCA Semester 1):

### 1. What is a Pointer?
A **pointer** is a special variable in C that stores the **memory address** of another variable rather than storing a direct data value.

### 2. Syntax & Operators
- \`&\` (Address-of Operator): Returns the memory address of a variable.
- \`*\` (Dereference Operator): Accesses the value stored at the memory address pointed by the pointer.

\`\`\`c
#include <stdio.h>

int main() {
    int num = 25;
    int *ptr = &num; // ptr stores the address of num

    printf("Value of num: %d\\n", num);       // 25
    printf("Address of num: %p\\n", &num);    // Memory address (e.g. 0x7ffd...)
    printf("Value using ptr: %d\\n", *ptr);   // 25 (Dereferencing)

    return 0;
}
\`\`\`

### 3. Key Exam Points:
1. **Memory Allocation**: Used for dynamic memory allocation (\`malloc\`, \`calloc\`, \`free\`).
2. **Call by Reference**: Enables functions to modify original arguments passed from the caller.
3. **Arrays and Strings**: Array names act as constant pointers to their first element.

*Would you like to practice a quiz question on Pointers, or see Call by Reference examples?*`;
  }

  // 2. Recursion in C
  if (q.includes("recursion") || q.includes("recursive")) {
    return `${greeting} Here is an easy explanation of **Recursion**:

### 1. Definition
**Recursion** is a programming technique where a function calls itself directly or indirectly to solve a smaller sub-problem of the same type.

### 2. Crucial Components:
1. **Base Case**: The stopping condition that terminates recursion. Without it, the program causes a **Stack Overflow**.
2. **Recursive Case**: The step where the function calls itself with modified arguments.

\`\`\`c
// Factorial using recursion in C
int factorial(int n) {
    if (n <= 1) return 1; // Base case
    return n * factorial(n - 1); // Recursive case
}
\`\`\`

### 3. Exam Tip:
In exams, always draw the **activation stack diagram** showing function frames being pushed and popped!`;
  }

  // 3. OOP Concepts (Java / C++)
  if (q.includes("oop") || q.includes("object oriented") || q.includes("polymorphism") || q.includes("inheritance")) {
    return `${greeting} Here are the **4 Pillars of Object-Oriented Programming (OOP)** (BCA Semester 2):

1. **Encapsulation**: Wrapping data (variables) and methods into a single unit (Class) and restricting direct access using private access specifiers with getters/setters.
2. **Abstraction**: Hiding complex internal implementation details and showing only the essential features to the user (e.g., using Abstract Classes & Interfaces in Java).
3. **Inheritance**: The mechanism by which one class inherits properties and behaviors from a parent class (\`extends\` in Java), promoting code reusability.
4. **Polymorphism**: The ability of a message or function to be processed in more than one form:
   - *Compile-time (Static)*: Method Overloading
   - *Runtime (Dynamic)*: Method Overriding

*Would you like code examples in Java or practice MCQs on OOP?*`;
  }

  // 4. Syllabus / Semester inquiry
  if (q.includes("syllabus") || q.includes("subject") || q.includes("semester 1") || q.includes("sem 1")) {
    return `${greeting} Here is the official **BCA Semester 1 Theory Curriculum** (Syllabus 2026–27):

1. **Course 101: Algorithms & Program Design using C**
   - Problem solving, Flowcharts, C fundamentals, Decision making, Loops, Functions, Pointers, Arrays, Strings, Structures & Unions.
2. **Course 103: Foundations of Computing**
   - Computer hardware, I/O devices, Memory hierarchy (RAM/ROM/Cache), OS basics, Networks, MS Office tools.
3. **Course 104: Communication Skills**
   - Communication process, Verbal & Non-verbal language, LSRW skills, Corporate communication.
4. **Course 105: Client-Side Web Technologies**
   - HTML5, CSS3, Responsive Design, JavaScript core syntax, DOM, Form Validation.

*All notes, unit breakdowns, and solved PYQs are available in your BCA Vault Library!*`;
  }

  // 5. Quiz / Test Request
  if (q.includes("quiz") || q.includes("mcq") || q.includes("test")) {
    return `${greeting} Let's do a quick quiz! Here is Question 1:

**Q1: In C programming, which operator is used to access the memory address of a variable?**
- **A)** \`*\`
- **B)** \`&\`
- **C)** \`->\`
- **D)** \`%\`

*Reply with your option (A, B, C, or D) to check your answer!*`;
  }

  // 6. Study Plan
  if (q.includes("study plan") || q.includes("7 day") || q.includes("prepare") || q.includes("plan")) {
    return `${greeting} Here is a structured **7-Day BCA Revision Plan**:

- **Day 1–2 (C Programming)**: Focus on Functions, Call by Value vs Reference, Pointers, and 1D/2D Arrays.
- **Day 3 (Foundations of Computing)**: Memory hierarchy, RAM vs ROM, Computer generations, and Network topologies.
- **Day 4 (Web Technologies)**: HTML5 form elements, CSS Box model, and basic JavaScript DOM event handling.
- **Day 5 (Communication Skills)**: Communication barriers, 7 Cs of effective communication, and business email writing.
- **Day 6 (PYQ Solving)**: Solve at least 3 previous year papers (2022–2025) from the BCA Vault PYQ section.
- **Day 7 (Quick Revision)**: Review definitions, syntax, and most repeated questions.

*What topic would you like to review first?*`;
  }

  // 7. General fallback
  return `${greeting} I am your **BCA Vault AI Learning Assistant**!

I can help you with:
- 💡 **Conceptual Explanations**: C Programming, Foundations of Computing, Web Tech, Java, DBMS, and OS.
- 📝 **Revision & Summaries**: Key definitions, formulas, and comparison tables.
- 🎯 **Interactive Quizzes & MCQs**: Practice unit-wise questions.
- 📋 **Exam Prep**: 5-mark / 10-mark model answers and important PYQs.
- 📅 **Custom Study Plans**: Structured timetables for your semester exams.

What topic or question would you like to explore?`;
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
    const clientIp = request.headers.get("x-forwarded-for") || "anonymous";
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Authenticate user if token is provided
    let studentProfile: { name: string; course: string; semester: number | null; email: string } | null = null;
    let activeBundles: string[] = [];
    let accessibleNotes: Array<{ title: string; subject: string | null; semester: number | null }> = [];
    let userId: string | null = null;

    if (token) {
      const { data: authData } = await admin.auth.getUser(token);
      if (authData?.user) {
        userId = authData.user.id;

        // Fetch student profile
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, email, course, semester, status")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile) {
          studentProfile = {
            name: profile.full_name || authData.user.email?.split("@")[0] || "Student",
            course: profile.course || "BCA",
            semester: profile.semester || 1,
            email: profile.email || authData.user.email || "",
          };
        }

        // Fetch student's active bundles and notes
        const { data: permissions } = await admin
          .from("access_permissions")
          .select("bundle_id, bundles(title, published)")
          .eq("user_id", userId)
          .eq("status", "active");

        if (permissions && permissions.length > 0) {
          const bundleIds: string[] = [];
          for (const p of permissions as any[]) {
            if (p.bundles?.published) {
              activeBundles.push(p.bundles.title);
              bundleIds.push(p.bundle_id);
            }
          }

          if (bundleIds.length > 0) {
            const { data: notesData } = await admin
              .from("notes")
              .select("title, subject, semester")
              .in("bundle_id", bundleIds)
              .eq("published", true)
              .limit(15);

            if (notesData) {
              accessibleNotes = notesData;
            }
          }
        }
      }
    }

    // Rate limit check
    const rateLimitKey = userId || clientIp;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You have reached the AI learning assistant limit. Please wait a few moments and try again.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userMessage = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userMessage.length > 1500) {
      return new Response(
        JSON.stringify({ success: false, error: "Message exceeds maximum allowed length of 1500 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log student learning question
    if (userId) {
      try {
        await admin.from("activity_logs").insert({
          actor_id: userId,
          action: "ai_question_asked",
          target_type: "ai_assistant",
          metadata: {
            preview: userMessage.slice(0, 100),
            semester: studentProfile?.semester,
          },
        });
      } catch (logErr) {
        console.warn("AI activity log warning:", logErr);
      }
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const systemPrompt = buildSystemPrompt(studentProfile, activeBundles, accessibleNotes);

    if (!geminiKey) {
      // Fallback educational engine
      const reply = generateEducationalFallback(
        userMessage,
        studentProfile?.name,
        studentProfile?.semester
      );
      return new Response(
        JSON.stringify({ success: true, reply, source: "rules_learning_engine" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversation history for Gemini API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const item of history.slice(-8)) {
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
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.9,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.warn("Gemini API error, activating educational fallback:", await geminiRes.text());
      const fallbackReply = generateEducationalFallback(
        userMessage,
        studentProfile?.name,
        studentProfile?.semester
      );
      return new Response(
        JSON.stringify({ success: true, reply: fallbackReply, source: "rules_learning_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateEducationalFallback(userMessage, studentProfile?.name, studentProfile?.semester);

    return new Response(
      JSON.stringify({ success: true, reply: replyText, source: "gemini_learning_assistant" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("gemini-chat error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unable to generate learning assistant response.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
