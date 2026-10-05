import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════
// STUDENT LEARNING AI — BCA Vault
// ═══════════════════════════════════════════════════════════════
// This Edge Function serves ONLY authenticated students.
// It verifies JWT, fetches the student's profile and authorized
// content, then provides personalized academic assistance.
// It NEVER serves public/anonymous visitors.
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = new Set([
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bcavault.in",
  "https://www.bcavault.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https:\/\/bca-vault(-[a-z0-9]+)?\.portalbcavault\.workers\.dev$/.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowOrigin = isAllowedOrigin(origin) ? origin : "https://bcavault.in";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ── Supabase admin client (server-side only) ───────────────────
const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Per-user rate limiting: 40 requests per 5 minutes ──────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 40) {
    return false;
  }

  entry.count++;
  return true;
}

// ── BCA Detailed Syllabus Knowledge Base ───────────────────────
const SYLLABUS_KNOWLEDGE = `
═══════════════════════════════════════════════════════════════════
BCA COMPREHENSIVE CURRICULUM SPECIFICATION (BVDU & UNIVERSITY BCA)
═══════════════════════════════════════════════════════════════════

SEMESTER 1 CORE SUBJECTS:

1. ALGORITHMS AND PROGRAMMING DESIGN USING C (Course Code 101):
   - Unit 1: Problem Solving Basics — Algorithms, Characteristics, Flowcharts (Symbols & Guidelines), Pseudocode, Step-form algorithms, Complexity intuition.
   - Unit 2: C Fundamentals & Control Structures — C Tokens, Keywords, Identifiers, Constants, Data types, Variables, Operators (Arithmetic, Relational, Logical, Bitwise, Conditional, Increment/Decrement), Type casting.
     Decision making (if, if-else, nested if, else-if ladder, switch-case), Loops (while, for, do-while), Jump statements (break, continue, goto).
   - Unit 3: Functions & Storage Classes — Function declaration, Definition, Call by Value, Call by Reference, Recursion (Base case & Recursive step, Stack frames), Storage classes (auto, static, register, extern).
   - Unit 4: Pointers, Arrays & Strings — Pointers concept, Address-of (&), Dereference (*), Pointer arithmetic, Pointer to Pointer, Pointers with arrays. 1D/2D Arrays, Matrix operations. Strings (string.h: strlen, strcpy, strcat, strcmp, strrev).
   - Unit 5: Structures, Unions & File I/O — Structures vs Unions, Nested structures, Array of structures, Arrow operator (->), typedef. File handling (fopen, fclose, fprintf, fscanf, fgets, fputs, fread, fwrite).

2. FOUNDATION OF COMPUTING (Course Code 103):
   - Computer Fundamentals, Generations (1st to 5th Gen), Block diagram, Hardware vs Software, System vs Application software.
   - Input/Output Devices: Keyboard, Mouse, Optical Scanner, OMR, MICR, OCR, Barcode reader, VDU, Printers (Impact vs Non-Impact, Laser, Inkjet, Dot Matrix).
   - Memory Hierarchy: Registers, Cache Memory (L1, L2, L3), Primary Memory (RAM: SRAM/DRAM, ROM: PROM/EPROM/EEPROM), Virtual Memory, Secondary Storage (HDD, SSD, Optical Disks).
   - Computer Networks Basics: LAN, MAN, WAN, Network Topologies (Star, Bus, Ring, Mesh, Tree, Hybrid), OSI Model layers, Transmission media (Twisted pair, Coaxial, Fiber optic, Wireless).
   - MS Office Suite: MS Word (Formatting, Mail Merge), MS Excel (Formulas, Functions, Charts, Pivot tables), MS PowerPoint, MS Access.

3. COMMUNICATION SKILLS (Course Code 104):
   - Concept, Process & Cycle of Communication (Sender, Encoding, Channel, Receiver, Decoding, Feedback).
   - Types of Communication: Verbal (Oral vs Written), Non-Verbal (Kinesics/Body language, Proxemics, Paralanguage, Haptics), Formal vs Informal (Grapevine).
   - Barriers to Communication: Physical, Psychological, Semantic/Linguistic, Cultural, Organizational. 7 Cs of Effective Communication.
   - Professional Writing: Business letters, Resume/CV, Email etiquette, Notice, Agenda, Minutes of Meeting (MoM), Report writing.

4. CLIENT-SIDE WEB TECHNOLOGY (Course Code 105):
   - HTML & HTML5: Page structure, Doctype, Semantic tags (header, nav, section, article, footer, aside), Text formatting, Tables, Ordered/Unordered Lists, Hyperlinks, Forms & Form inputs, Multimedia (audio, video, canvas).
   - CSS & CSS3: Cascading rules, Inline vs Internal vs External stylesheets, Selectors (Element, Class, ID, Pseudo-classes), Box Model (Content, Padding, Border, Margin), Flexbox, CSS Grid, Positioning (Static, Relative, Absolute, Fixed, Sticky), Media queries & Responsive design.
   - JavaScript Basics: Variables (var, let, const), Data types, Operators, Control flow, Functions (Traditional vs Arrow), Dialog boxes (alert, prompt, confirm), Window & Document objects.
   - DOM & Event Handling: getElementById, querySelector, DOM manipulation (innerHTML, textContent, appendChild, classList), Event listeners (click, change, submit, mouseover, keydown), Form validation with Regex.

───────────────────────────────────────────────────────────────────
SEMESTER 2 CORE SUBJECTS:

1. DATABASE MANAGEMENT SYSTEM (DBMS - Course Code 201):
   - UNIT 1 — Introduction to DBMS:
     Data vs Information, Data Processing, Data Management, Limitations of Traditional File-Oriented Approach vs Database-Oriented Approach, Need for DBMS, Database Characteristics (Self-describing, Insulation, Multi-user, ACID properties).
     Database Architecture: 3-Schema Architecture / Levels of Abstraction (External/View level, Conceptual/Logical level, Internal/Physical level), Schema vs Instance, 3-Tier Client-Server Architecture, Data Independence (Logical & Physical Data Independence), Database Users (DBA, End Users, Application Programmers), Database System Types (Centralized, Distributed, Client-Server), Database Languages (DDL, DML, DCL, TCL), DBMS Interfaces.
   - UNIT 2 — Data Modeling:
     Data Models overview: Hierarchical Model, Network Model, Relational Model (Advantages & Disadvantages).
     Entity-Relationship (ER) Model: Entities, Entity Sets, Attributes (Simple/Composite, Single-valued/Multi-valued, Stored/Derived, Key attributes), Relationships, Degree of Relationship (Unary, Binary, Ternary), Mapping Cardinalities (1:1, 1:N, N:1, M:N), ER Diagram Notations (Chen vs Crow's Foot), Total vs Partial Participation, Strong vs Weak Entity Sets (Identifying relationships, Partial keys/Discriminators), ERD Case Studies (Library, Hospital, College).
   - UNIT 3 — Normalization & Relational Theory:
     Keys Hierarchy: Super Key, Candidate Key, Primary Key, Alternate/Secondary Key, Foreign Key (Referential Integrity), Composite Key.
     Codd's 12 Rules, Conceptual ER-to-Relational Mapping algorithms.
     Functional Dependencies (Trivial, Non-Trivial, Full, Partial, Transitive), Inference Rules (Armstrong's Axioms).
     Decomposition: Lossy vs Lossless Decomposition, Dependency Preservation.
     Normalization: Need, Anomalies (Insertion, Deletion, Update anomalies). Normal Forms: 1NF (Atomic values), 2NF (No partial dependency, full functional dependency on PK), 3NF (No transitive dependency), BCNF (Every determinant is a candidate key). Case studies of decomposing unnormalized tables to 3NF/BCNF.

2. OBJECT-ORIENTED PROGRAMMING WITH JAVA (Course Code 202):
   - OOP Concepts: Classes, Objects, Encapsulation, Abstraction, Inheritance, Polymorphism (Compile-time / Overloading vs Run-time / Overriding).
   - Java Fundamentals: JVM, JRE, JDK, Bytecode, Platform Independence, Garbage Collection, Data types, Variables, Control statements.
   - OOP in Java: Constructors (Default, Parameterized, Copy), 'this' and 'super' keywords, Access specifiers (private, default, protected, public), static keyword, final keyword.
   - Packages & Interfaces: Creating/Importing packages, Interface declaration, Multiple inheritance via interfaces, Abstract classes vs Interfaces.
   - Exception Handling: Exception hierarchy, Checked vs Unchecked exceptions, try-catch-finally, throw, throws, Custom exceptions.
   - Multithreading: Thread life cycle, Thread creation (Thread class vs Runnable interface), Thread synchronization (synchronized keyword, inter-thread communication).

3. OPERATING SYSTEMS (Course Code 203):
   - OS Role, Services, Types (Batch, Time-sharing, Distributed, Real-Time, Multiprogramming).
   - Process Management: Process states (New, Ready, Running, Waiting, Terminated), Process Control Block (PCB), Context Switching, CPU Scheduling Algorithms (FCFS, SJF Preemptive/Non-preemptive, Round Robin, Priority Scheduling, Multilevel Queue).
   - Process Synchronization: Critical Section Problem, Race Condition, Mutual Exclusion, Semaphores (Counting & Binary), Mutex locks.
   - Deadlocks: Characterization (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait), Resource Allocation Graph (RAG), Deadlock Prevention, Deadlock Avoidance (Banker's Algorithm), Deadlock Detection & Recovery.
   - Memory Management: Logical vs Physical address, Contiguous allocation, Fragmentation (Internal vs External), Paging (Page table, TLB), Segmentation, Virtual Memory (Demand Paging, Page Replacement: FIFO, LRU, Optimal).

4. PYTHON PROGRAMMING (Course Code 204):
   - Python Syntax, Dynamic Typing, Operators, Conditional statements, Loops (for, while, range, enumerate).
   - Core Data Structures: Lists (Methods, Slicing, Comprehensions), Tuples (Immutability), Dictionaries (Key-Value, Operations), Sets (Uniqueness, Set math).
   - Functions: Positional/Keyword args, *args, **kwargs, Lambda functions, map/filter/reduce, Recursion.
   - OOP in Python: Classes, __init__ constructor, Self, Inheritance, Polymorphism, Encapsulation.
   - File Handling: read, write, append, context managers (with open). Exception handling (try, except, else, finally).

5. CYBERSECURITY (Course Code 205):
   - Information Security Goals (CIA Triad: Confidentiality, Integrity, Availability).
   - Threats & Attacks: Malware (Viruses, Worms, Trojans, Ransomware, Spyware), Social Engineering (Phishing, Spear Phishing, Vishing), Denial of Service (DoS, DDoS), Man-in-the-Middle (MitM), SQL Injection, Cross-Site Scripting (XSS).
   - Cryptography Basics: Symmetric vs Asymmetric Encryption, DES/AES, RSA, Hashing (MD5, SHA-256), Digital Signatures, SSL/TLS, Public Key Infrastructure (PKI).
   - Network Security: Firewalls, IDS/IPS, VPN, Security policies, Ethical Hacking overview, Cyber laws (IT Act 2000 in India).
`;

// ── Build personalized student system prompt ───────────────────
function buildStudentPrompt(
  student: { name: string; course: string; semester: number | null; email: string },
  activeBundles: string[],
  accessibleNotes: Array<{ title: string; subject: string | null; semester: number | null }>
): string {
  const notesSection = accessibleNotes.length > 0
    ? accessibleNotes.map((n) => `  * ${n.title} (Subject: ${n.subject || "General"}, Sem ${n.semester || 1})`).join("\n")
    : "  * All preview notes and syllabus materials";

  return `You are the official BCA Vault AI Learning Assistant — a world-class, syllabus-aware, student-first personal tutor for BCA students.

AUTHENTICATED STUDENT PROFILE:
- Name: ${student.name}
- Enrolled Degree: ${student.course || "BCA"} (Bachelor of Computer Applications)
- Current Semester: ${student.semester ? `Semester ${student.semester}` : "BCA Student"}
- Active Subscribed Bundles: ${activeBundles.length > 0 ? activeBundles.join(", ") : "Semester Notes Bundle"}
- Study Materials in BCA Vault:
${notesSection}

${SYLLABUS_KNOWLEDGE}

═══════════════════════════════════════════════════════════════════
CORE PEDAGOGICAL LOGIC & INTENT UNDERSTANDING:
═══════════════════════════════════════════════════════════════════

1. INTENT-FIRST ANSWERING:
   - Understand the underlying academic intent rather than requiring exact syllabus keywords.
   - "Why use CSS when HTML exists?" → Explain HTML structure vs CSS presentation separation.
   - "Why does duplicate data cause problems?" → Connect directly to DBMS Data Redundancy and Normalization.
   - "Why not store everything in one table?" → Connect to Insertion, Deletion, and Update anomalies in DBMS.
   - "How does computer remember variables?" → Connect to Memory Hierarchy and RAM addresses in C.
   - Prerequisite concepts → Explain simply and bridge them directly to the student's syllabus.
   - Only reject completely unrelated non-academic queries (e.g. celebrity gossip, cooking recipes).

2. ADAPTIVE TUTORING STRUCTURE (USE WHEN RELEVANT):
   When explaining topics, use this proven, student-friendly structure:
   1. **Direct Answer / Definition**: Clear 1-2 sentence core concept.
   2. **Simple Explanation**: Plain English breakdown for beginners.
   3. **Real-World Analogy**: Concrete, intuitive real-life comparison.
   4. **Example / Code Block**: Clean, commented C / Java / Python / SQL / HTML / JS snippet.
   5. **Visual / ASCII Diagram**: Clear text-based diagram / flowchart when useful.
   6. **Exam Points / 5-Mark & 10-Mark Checklist**: High-yield takeaways frequently asked in university exams.
   7. **One-Line Quick Revision**: Memorable one-liner.

3. ADAPTIVE LENGTH SCALING:
   - For 2-Mark questions / definitions: Crisp definition + formula/syntax + 1 key point.
   - For 5-Mark questions: Structured definition + explanation + example/diagram + key points.
   - For 10-Mark questions: Complete comprehensive breakdown + detailed architecture/diagram + code/schema + advantages/disadvantages + conclusion.

4. CONVERSATIONAL CONTINUITY:
   - Seamlessly remember conversation context.
   - For follow-ups like "why?", "how?", "give another example", "explain simpler", "difference?", "quiz me", continue directly from the prior topic without repeating greetings or capability introductions.

5. STRICT QUALITY GUIDELINES:
   - Use clear, encouraging, friendly beginner-level English.
   - Use clean Markdown: bold key terms, format code blocks with language identifiers, use tables for comparisons, and emphasize exam tips.
   - NEVER invent fake syllabus topics or admin prices.
   - Direct payment/billing queries to support: bcavault07@gmail.com or WhatsApp +91 93263 42123.`;
}

// ── Educational Fallback Engine ────────────────────────────────
function generateEducationalFallback(
  message: string,
  studentName?: string,
  semester?: number | null
): string {
  const q = message.toLowerCase();
  const greeting = studentName ? `Hello **${studentName}**!` : "Hello!";

  if (q.includes("pointer") || q.includes("address")) {
    return `${greeting} Here is a beginner-friendly explanation of **Pointers in C** (Semester 1):

### 1. What is a Pointer?
A **pointer** is a special variable in C that stores the **memory address** of another variable.

### 2. Syntax & Operators
- \`&\` (Address-of): Returns the memory address of a variable.
- \`*\` (Dereference): Accesses the value at the memory address.

\`\`\`c
#include <stdio.h>

int main() {
    int num = 25;
    int *ptr = &num;

    printf("Value of num: %d\\n", num);       // 25
    printf("Address of num: %p\\n", &num);    // Memory address
    printf("Value using ptr: %d\\n", *ptr);   // 25 (Dereferencing)

    return 0;
}
\`\`\`

### 3. Key Exam Points:
1. **Memory Allocation**: Used for dynamic memory allocation (\`malloc\`, \`calloc\`, \`free\`).
2. **Call by Reference**: Enables functions to modify original arguments.
3. **Arrays and Strings**: Array names act as constant pointers.

*Would you like a quiz on Pointers, or examples of Call by Reference?*`;
  }

  if (q.includes("recursion") || q.includes("recursive")) {
    return `${greeting} Here is a clear explanation of **Recursion**:

### 1. Definition
**Recursion** is when a function calls itself to solve smaller sub-problems of the same type.

### 2. Key Components:
1. **Base Case**: Stops the recursion (prevents Stack Overflow).
2. **Recursive Case**: Function calls itself with modified arguments.

\`\`\`c
int factorial(int n) {
    if (n <= 1) return 1;        // Base case
    return n * factorial(n - 1); // Recursive case
}
\`\`\`

### 3. Exam Tip:
Always draw the **activation stack diagram** showing function frames!`;
  }

  if (q.includes("oop") || q.includes("object oriented") || q.includes("polymorphism") || q.includes("inheritance")) {
    return `${greeting} The **4 Pillars of OOP** (Semester 2):

1. **Encapsulation**: Wrapping data + methods in a class with access control.
2. **Abstraction**: Hiding complexity, showing only essentials.
3. **Inheritance**: Child class inherits from parent (\`extends\` in Java).
4. **Polymorphism**: Same method, different behavior:
   - *Compile-time*: Method Overloading
   - *Runtime*: Method Overriding

*Want Java code examples or MCQs on OOP?*`;
  }

  if (q.includes("quiz") || q.includes("mcq") || q.includes("test")) {
    return `${greeting} Let's do a quiz! Here is Question 1:

**Q1: In C, which operator returns the memory address of a variable?**
- **A)** \`*\`
- **B)** \`&\`
- **C)** \`->\`
- **D)** \`%\`

*Reply with A, B, C, or D!*`;
  }

  if (q.includes("study plan") || q.includes("prepare") || q.includes("plan")) {
    return `${greeting} Here is a **7-Day BCA Revision Plan**:

- **Day 1–2**: C Programming — Functions, Pointers, Arrays
- **Day 3**: Foundations of Computing — Memory, Networks, Generations
- **Day 4**: Web Technologies — HTML5, CSS, JavaScript DOM
- **Day 5**: Communication Skills — Barriers, 7 Cs, Business writing
- **Day 6**: Solve 3 previous year papers from BCA Vault PYQ section
- **Day 7**: Quick revision of definitions and key syntax

*Which topic would you like to start with?*`;
  }

  return `${greeting} I'm your **BCA Vault AI Learning Assistant**!

I can help you with:
- 💡 **Concept Explanations**: C, Java, DBMS, OS, Web Tech
- 📝 **Revision Summaries**: Key definitions and comparisons
- 🎯 **Interactive Quizzes**: MCQs with explanations
- 📋 **Exam Prep**: 5-mark / 10-mark model answers
- 📅 **Study Plans**: Structured revision timetables

What would you like to learn?`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  // Handle CORS preflight BEFORE auth
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
    // ── STRICT AUTHENTICATION ──────────────────────────────────
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required. Please log in to your student portal to use the AI Learning Assistant.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired session. Please log in again.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // ── Rate limit per user ────────────────────────────────────
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You've reached the AI assistant limit. Please wait a few minutes and try again.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch student profile or admin role (server-side) ──────
    const { data: adminProfile } = await admin
      .from("admin_profiles")
      .select("role, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const isAdmin = !!adminProfile && ["admin", "superadmin"].includes(adminProfile.role);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, course, semester, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.status === "suspended") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your student account has been suspended. Please contact support at bcavault07@gmail.com.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentProfile = {
      name: profile?.full_name || authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || (isAdmin ? "Admin" : "Student"),
      course: profile?.course || "BCA",
      semester: profile?.semester || 1,
      email: profile?.email || authData.user.email || "",
    };

    // ── Fetch authorized bundles & notes (server-side) ─────────
    let activeBundles: string[] = [];
    let accessibleNotes: Array<{ title: string; subject: string | null; semester: number | null }> = [];

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
          .limit(20);

        if (notesData) {
          accessibleNotes = notesData;
        }
      }
    }

    // ── Parse request body ─────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
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
        JSON.stringify({ success: false, error: "Message exceeds 1500 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Log student AI question ────────────────────────────────
    try {
      await admin.from("activity_logs").insert({
        actor_id: userId,
        action: "ai_learning_question",
        target_type: "student_ai",
        metadata: {
          preview: userMessage.slice(0, 100),
          semester: studentProfile.semester,
          course: studentProfile.course,
        },
      });
    } catch (logErr) {
      console.warn("AI activity log warning:", logErr);
    }

    // ── Build student-specific system prompt ───────────────────
    const systemPrompt = buildStudentPrompt(studentProfile, activeBundles, accessibleNotes);

    // ── Call Gemini API ────────────────────────────────────────
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!geminiKey) {
      // Fallback to rule-based educational engine
      const reply = generateEducationalFallback(
        userMessage,
        studentProfile.name,
        studentProfile.semester
      );
      return new Response(
        JSON.stringify({ success: true, reply, source: "student_learning_rules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversation history with size bounds and validated roles
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const item of history.slice(-8)) {
      if (
        item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "model") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
      ) {
        contents.push({
          role: item.role,
          parts: [{ text: item.content.slice(0, 1500) }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage.slice(0, 1500) }],
    });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 2048,
          topP: 0.95,
        },
      }),
    });

    if (!geminiRes.ok) {
      console.warn("Student learning Gemini API error:", await geminiRes.text());
      const fallbackReply = generateEducationalFallback(
        userMessage,
        studentProfile.name,
        studentProfile.semester
      );
      return new Response(
        JSON.stringify({ success: true, reply: fallbackReply, source: "student_learning_fallback" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = (await geminiRes.json()) as any;
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      generateEducationalFallback(userMessage, studentProfile.name, studentProfile.semester);

    return new Response(
      JSON.stringify({ success: true, reply: replyText, source: "student_learning_gemini" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("student-learning-chat error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Something went wrong. Please try again or contact support at bcavault07@gmail.com.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
