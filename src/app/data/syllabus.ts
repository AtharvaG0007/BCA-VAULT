export type Unit = { title: string; topics: string[] };

export type Subject = {
  courseCode: string;
  officialTitle: string;
  displayTitle?: string;
  semester: 1 | 2;
  courseType: "Core Course" | "AEC" | "VAC";
  theoryOnly: true;
  available: true;
  comingSoon: false;
  units: Unit[];
};

export type Semester = {
  number: number;
  available: boolean;
  subjects: Subject[];
  excludedSubjects: { officialTitle: string; label: string }[];
};

// Source: Bharati Vidyapeeth FMS BCA syllabus applicable from 2026–27.
// Semester II unit-level detail is not included in the supplied official PDF, so it is deliberately empty.
export const syllabus2026_27: { version: "2026–27"; semesters: Record<1 | 2, Semester> } = {
  version: "2026–27",
  semesters: {
    1: {
      number: 1,
      available: true,
      subjects: [
        {
          courseCode: "101", officialTitle: "Algorithms and Program Design using C", semester: 1, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false,
          units: [
            { title: "Introduction to Algorithm", topics: ["Concept of Problem", "Problem Solving Steps", "Procedure and Algorithm", "Flow-Charts", "Writing and Tracing Simple Algorithms"] },
            { title: "Introduction to C Language", topics: ["History and Features of C", "Structure and Compilation of a C Program", "Character Set and C Tokens", "Data Types, Identifiers, Variables and Constants", "Header Files, Preprocessor Directives and Input/Output", "Operators, Precedence, Associativity and Expressions"] },
            { title: "Statements in C", topics: ["Types of Statements", "Decision Making: if, if-else, nested if-else and switch", "Looping: while, for and do-while", "break, continue, goto and exit"] },
            { title: "User Defined Functions and Pointers in C", topics: ["Storage Classes and Variables", "Structured Programming", "Function Declaration, Definition and main()", "Passing Parameters and Call by Value", "Recursion", "Pointers, Pointer Arithmetic and Call by Reference"] },
            { title: "Arrays, Strings, Structures and unions in C", topics: ["One and Two Dimensional Arrays", "Strings and string.h", "User Defined Datatypes and sizeof()", "Structures", "Unions"] },
          ],
        },
        {
          courseCode: "103", officialTitle: "Foundations of Computing", semester: 1, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false,
          units: [
            { title: "Computer Fundamentals", topics: ["Computer Definition and Characteristics", "Block Diagram", "Hardware and Software", "Evolution and Generations of Computers", "Types of Computers"] },
            { title: "Input and Output Devices", topics: ["Keyboard, Mouse and Scanner", "MICR and OMR", "VDU and Printers", "Plotters"] },
            { title: "Memory and Software", topics: ["Memory Organization and Hierarchy", "Auxiliary, Cache and Virtual Memory", "RAM, ROM, PROM and EPROM", "Secondary Storage", "Software Components"] },
            { title: "Software, Languages and Networks", topics: ["System and Application Software", "Programming Languages", "Concept and Types of Networks", "Communication System", "Data Transmission Media"] },
            { title: "MS Office", topics: ["Components and Features", "MS Word", "MS Excel", "PowerPoint", "MS Access"] },
          ],
        },
        {
          courseCode: "104", officialTitle: "Communication Skills", semester: 1, courseType: "AEC", theoryOnly: true, available: true, comingSoon: false,
          units: [
            { title: "Communication", topics: ["Concept and Process of Communication", "Types of Communication", "Barriers to Communication"] },
            { title: "Verbal Communication", topics: ["Language", "Oral Communication", "Written Communication"] },
            { title: "Non-verbal Communication", topics: ["Language", "Gestures", "Postures", "Body Language"] },
            { title: "Language Skills", topics: ["Listening Skills", "Reading Skills", "Speaking Skills", "Writing Skills"] },
          ],
        },
        {
          courseCode: "105", officialTitle: "Client-Side Web Technologies (HTML, JavaScript and CSS)", displayTitle: "Client-Side Web Technologies", semester: 1, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false,
          units: [
            { title: "Overview of HTML", topics: ["HTML Tags and Structure", "Text Formatting", "Images", "Block and Inline Elements", "Lists", "Tables", "Frames", "Hyperlinks"] },
            { title: "HTML5", topics: ["Introduction and Features", "HTML5 Elements", "HTML Media and Graphics"] },
            { title: "Cascading Style Sheets", topics: ["Types of Style Sheets", "Text, Color and Background Properties", "Border and Box Properties", "Positioning", "CSS Selectors", "Class and span Tag"] },
            { title: "Introduction to JavaScript (Client-Side Scripting)", topics: ["Scripting Overview", "JavaScript Basics", "Programming Constructs", "Dialog Boxes and Window Objects", "JavaScript Functions"] },
            { title: "Forms and JavaScript Events", topics: ["Static and Dynamic Web Pages", "Form Elements", "Built-in Objects", "Regular Expressions and Form Validation", "Events and DOM"] },
          ],
        },
      ],
      excludedSubjects: [
        { officialTitle: "Mathematical Foundation", label: "Mathematics — Not Included" },
        { officialTitle: "Open Course (MS-Office / Constitution of India / IKS - Yoga & Wellness)", label: "Open Course — Not Included in Current BCA Vault Bundle" },
        { officialTitle: "Labs / Practicals", label: "Not Included" },
        { officialTitle: "Projects", label: "Not Included" },
      ],
    },
    2: {
      number: 2,
      available: true,
      subjects: [
        { courseCode: "201", officialTitle: "Database Management Systems", semester: 2, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false, units: [] },
        { courseCode: "202", officialTitle: "Object oriented programming with Java", displayTitle: "Object Oriented Programming with Java", semester: 2, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false, units: [] },
        { courseCode: "203", officialTitle: "Operating system", displayTitle: "Operating System", semester: 2, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false, units: [] },
        { courseCode: "204", officialTitle: "Python Programming", semester: 2, courseType: "Core Course", theoryOnly: true, available: true, comingSoon: false, units: [] },
        { courseCode: "205", officialTitle: "Cyber Security", semester: 2, courseType: "VAC", theoryOnly: true, available: true, comingSoon: false, units: [] },
        { courseCode: "206", officialTitle: "Environmental Studies", semester: 2, courseType: "VAC", theoryOnly: true, available: true, comingSoon: false, units: [] },
      ],
      excludedSubjects: [
        { officialTitle: "Labs / Practicals", label: "Theory Content Only" },
        { officialTitle: "Projects", label: "Not Included" },
      ],
    },
  },
};

export const availableSubjects = Object.values(syllabus2026_27.semesters).flatMap((semester) => semester.subjects);
