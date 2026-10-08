/**
 * BCA VAULT — SEMESTER 1 BEGINNER-FRIENDLY QUESTION BANK
 * 
 * Target: BCA Semester 1 Beginner Student
 * Purpose: Revision, core concept clarity, confidence building.
 * Subjects:
 *   1. Algorithms and Program Design using C
 *   2. Foundation of Computing
 *   3. Client-Side Web Technologies
 * 
 * Difficulty:
 *   - 15 Very Easy : 5 Easy ratio per 20-question quiz
 *   - Clear, short questions with 4 familiar options and 1 unambiguous answer.
 */

export interface QuestionDefinition {
  subject: string;
  difficulty: 'very_easy' | 'easy';
  question_text: string;
  options: string[];
  correct_index: number;
  marks: number;
}

export const SEMESTER_1_SUBJECTS = [
  'Algorithms and Program Design using C',
  'Foundation of Computing',
  'Client-Side Web Technologies'
] as const;

export const SEMESTER_1_QUESTION_BANK: QuestionDefinition[] = [
  // =========================================================================
  // 1. ALGORITHMS AND PROGRAM DESIGN USING C (28 Questions: 18 Very Easy + 10 Easy)
  // =========================================================================

  // --- Very Easy (18) ---
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Who developed the C programming language?',
    options: ['Dennis Ritchie', 'James Gosling', 'Guido van Rossum', 'Bjarne Stroustrup'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What is a variable in C programming?',
    options: ['A named memory location that stores data', 'A physical computer cable', 'A type of monitor screen', 'A hardware printer part'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which data type in C is used to store whole numbers (integers)?',
    options: ['int', 'float', 'char', 'double'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which data type in C is used to store decimal numbers like 3.14?',
    options: ['float', 'int', 'char', 'void'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: "Which data type in C is used to store a single character like 'A'?",
    options: ['char', 'int', 'float', 'void'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which standard library function is used to display output on the screen in C?',
    options: ['printf()', 'scanf()', 'input()', 'print_screen()'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which standard library function is used to take input from the user in C?',
    options: ['scanf()', 'printf()', 'output()', 'read_text()'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What will this statement print on the screen?\nprintf("Hello");',
    options: ['Hello', 'Hi', 'Error', 'Nothing'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which character ends every executable statement in C?',
    options: ['; (Semicolon)', ': (Colon)', '. (Dot)', '# (Hash)'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which header file is required to use printf() and scanf() in C?',
    options: ['stdio.h', 'math.h', 'string.h', 'conio.h'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which relational operator tests if two values are equal in C?',
    options: ['==', '=', '!=', '<='],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which statement is used to execute code only when a condition is true?',
    options: ['if', 'for', 'return', 'include'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Which loop in C is commonly used when the number of iterations is known in advance?',
    options: ['for loop', 'stop loop', 'jump loop', 'wait loop'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'Every standard C program begins its execution from which function?',
    options: ['main()', 'start()', 'begin()', 'run()'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What is an algorithm?',
    options: ['A step-by-step procedure to solve a problem', 'A physical computer monitor', 'A programming language', 'A storage disk'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What is the result produced by an algorithm called?',
    options: ['Output', 'Keyboard error', 'Electrical power', 'Printed paper'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What is the process of arranging data in ascending or descending order called?',
    options: ['Sorting', 'Searching', 'Deleting', 'Typing'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'very_easy',
    question_text: 'What does this pseudocode do?\n\nSTART\nINPUT A\nINPUT B\nSUM = A + B\nPRINT SUM\nEND',
    options: ['Adds two numbers', 'Subtracts two numbers', 'Multiplies two numbers', 'Divides two numbers'],
    correct_index: 0,
    marks: 1
  },

  // --- Easy (10) ---
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which arithmetic operator in C calculates the remainder of a division?',
    options: ['% (Modulus)', '/ (Division)', '* (Multiplication)', '+ (Addition)'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'In C, array indices start from which number by default?',
    options: ['0', '1', '-1', '2'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which symbol begins a single-line comment in modern C?',
    options: ['//', '/*', '#', '<!--'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which format specifier is used in printf() to display an integer value in C?',
    options: ['%d', '%f', '%c', '%s'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which format specifier is used in printf() to display a floating-point number in C?',
    options: ['%f', '%d', '%c', '%s'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which loop in C tests its condition before executing any statements in its body?',
    options: ['while loop', 'do-while loop', 'repeat loop', 'until loop'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'What is an array in C?',
    options: ['A collection of elements of the same data type', 'A text document file', 'A physical mouse button', 'A network cable'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'In pseudocode, which keyword is commonly used to take input from the user?',
    options: ['INPUT', 'PRINT', 'DISPLAY', 'WRITE'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'What is the process of finding the position of a specific element in a list called?',
    options: ['Searching', 'Sorting', 'Formatting', 'Compiling'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Algorithms and Program Design using C',
    difficulty: 'easy',
    question_text: 'Which keyword is used to return a result from a C function to its caller?',
    options: ['return', 'send', 'output', 'give'],
    correct_index: 0,
    marks: 1
  },

  // =========================================================================
  // 2. FOUNDATION OF COMPUTING (28 Questions: 18 Very Easy + 10 Easy)
  // =========================================================================

  // --- Very Easy (18) ---
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What is a computer?',
    options: ['An electronic device that accepts data, processes it, and produces output', 'A manual mechanical calculator', 'A television with a speaker', 'A printer that only prints paper'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which component is commonly called the "Brain of the Computer"?',
    options: ['CPU (Central Processing Unit)', 'Keyboard', 'Monitor', 'Mouse'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What does CPU stand for?',
    options: ['Central Processing Unit', 'Central Power Utility', 'Computer Program Unit', 'Control Processing User'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which part of the CPU performs mathematical and logical operations?',
    options: ['ALU (Arithmetic Logic Unit)', 'Monitor', 'Hard Disk', 'Power Supply'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which type of computer memory is temporary and loses data when power is switched off?',
    options: ['RAM (Random Access Memory)', 'ROM (Read Only Memory)', 'Hard Disk', 'CD-ROM'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which memory permanently stores startup instructions (BIOS) and is non-volatile?',
    options: ['ROM (Read Only Memory)', 'RAM', 'Cache Memory', 'Virtual Memory'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'How many bits make up one byte?',
    options: ['8', '4', '16', '32'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which device is used to enter text, numbers, and commands into a computer?',
    options: ['Keyboard', 'Monitor', 'Printer', 'Speaker'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which device is an output device used to display visual graphics and text?',
    options: ['Monitor', 'Keyboard', 'Mouse', 'Microphone'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which device produces a printed physical copy of a digital document on paper?',
    options: ['Printer', 'Scanner', 'Keyboard', 'Webcam'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which device is a hand-held pointing input device used to click on screen items?',
    options: ['Mouse', 'Speaker', 'Printer', 'Hard Disk'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What type of software is an Operating System (such as Windows or Linux)?',
    options: ['System Software', 'Application Software', 'Hardware Device', 'Game Software'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What is the primary role of an Operating System?',
    options: ['To manage computer hardware and run applications', 'To physically cool the CPU', 'To manufacture memory chips', 'To generate electric power'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What are software applications created for end users (like MS Word or Chrome) called?',
    options: ['Application Software', 'System Firmware', 'Hardware Components', 'BIOS Software'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What do we call the physical, touchable electronic components of a computer?',
    options: ['Hardware', 'Software', 'Freeware', 'Shareware'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What is the worldwide network connecting millions of computers globally called?',
    options: ['Internet', 'USB Cable', 'Motherboard', 'Floppy Disk'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'What does LAN stand for in computer networking?',
    options: ['Local Area Network', 'Large Area Network', 'Link Access Node', 'Line Area Network'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'very_easy',
    question_text: 'Which Microsoft Office software is used to create and edit text documents and letters?',
    options: ['MS Word', 'MS Excel', 'MS PowerPoint', 'MS Access'],
    correct_index: 0,
    marks: 1
  },

  // --- Easy (10) ---
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which component of the CPU directs and coordinates the flow of all computer operations?',
    options: ['Control Unit (CU)', 'RAM', 'Monitor Screen', 'Keyboard'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'What does WAN stand for in computer networking?',
    options: ['Wide Area Network', 'Wireless Area Node', 'Web Access Network', 'World Audio Net'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which Microsoft Office software is used for spreadsheets, calculations, and tables?',
    options: ['MS Excel', 'MS Word', 'MS PowerPoint', 'MS Paint'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which Microsoft Office software is used to create slide presentations for talks?',
    options: ['MS PowerPoint', 'MS Word', 'MS Excel', 'Notepad'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'What is a Hard Disk Drive (HDD) or SSD primarily used for in a computer?',
    options: ['Permanent storage of files and programs', 'Temporary audio recording', 'Power generation', 'Displaying monitor pixels'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which keyboard shortcut is commonly used to copy selected content in Windows?',
    options: ['Ctrl + C', 'Ctrl + V', 'Ctrl + Z', 'Ctrl + P'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which keyboard shortcut is commonly used to paste copied content in Windows?',
    options: ['Ctrl + V', 'Ctrl + C', 'Ctrl + X', 'Ctrl + S'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which device is an input device used to convert physical paper documents into digital images?',
    options: ['Scanner', 'Printer', 'Monitor', 'Speaker'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'The binary number system used by digital computers consists of which two digits?',
    options: ['0 and 1', '1 and 2', '0 and 9', '1 and 10'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Foundation of Computing',
    difficulty: 'easy',
    question_text: 'Which keyboard shortcut is used to quickly save the current file in Windows applications?',
    options: ['Ctrl + S', 'Ctrl + O', 'Ctrl + N', 'Ctrl + W'],
    correct_index: 0,
    marks: 1
  },

  // =========================================================================
  // 3. CLIENT-SIDE WEB TECHNOLOGIES (28 Questions: 18 Very Easy + 10 Easy)
  // =========================================================================

  // --- Very Easy (18) ---
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'What does HTML stand for?',
    options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Maker', 'Home Tool Markup Language'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'What is HTML primarily used for on the web?',
    options: ['Structuring the content of a web page', 'Running computer hardware', 'Managing relational databases', 'Compiling C code'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used for the largest, main heading on a page?',
    options: ['<h1>', '<h6>', '<p>', '<head>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used to create a paragraph of text?',
    options: ['<p>', '<para>', '<text>', '<b>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used to insert a single line break?',
    options: ['<br>', '<break>', '<lb>', '<hr>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used to create a clickable hyperlink?',
    options: ['<a>', '<link>', '<href>', '<url>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which attribute of the <a> tag specifies the web address destination?',
    options: ['href', 'src', 'link', 'to'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used to display an image on a web page?',
    options: ['<img>', '<image>', '<pic>', '<photo>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which attribute of the <img> tag specifies the image file path or URL?',
    options: ['src', 'href', 'file', 'path'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag contains all the visible content displayed to the user?',
    options: ['<body>', '<head>', '<title>', '<meta>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which HTML tag is used to create an unordered (bulleted) list?',
    options: ['<ul>', '<ol>', '<li>', '<bullet>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'What does CSS stand for?',
    options: ['Cascading Style Sheets', 'Computer Style Sheets', 'Creative Style System', 'Color Style Software'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'What is CSS mainly used for in web development?',
    options: ['Styling and designing web page layouts', 'Managing database records', 'Writing operating system drivers', 'Processing computer memory'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which CSS property is used to change the color of text?',
    options: ['color', 'text-color', 'font-color', 'background-color'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which CSS property is used to change the background color of an element?',
    options: ['background-color', 'color', 'bg-color', 'canvas-color'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which CSS property changes the size of the text font?',
    options: ['font-size', 'text-size', 'font-weight', 'text-style'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which CSS property is used to align text (e.g. center, left, right)?',
    options: ['text-align', 'align-content', 'float', 'font-style'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'very_easy',
    question_text: 'Which language is used to add interactive behavior and logic to web pages?',
    options: ['JavaScript', 'HTML alone', 'CSS alone', 'SQL'],
    correct_index: 0,
    marks: 1
  },

  // --- Easy (10) ---
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which HTML tag is used to create an ordered (numbered) list?',
    options: ['<ol>', '<ul>', '<li>', '<list>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which HTML tag defines an individual list item inside <ul> or <ol>?',
    options: ['<li>', '<item>', '<list>', '<point>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which HTML tag is used to create a row in an HTML table?',
    options: ['<tr>', '<td>', '<th>', '<row>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which HTML tag defines a standard data cell inside a table row?',
    options: ['<td>', '<tr>', '<th>', '<cell>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'In the CSS box model, what creates space inside an element between content and border?',
    options: ['padding', 'margin', 'outline', 'border'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: "In the CSS box model, what creates space outside an element's border?",
    options: ['margin', 'padding', 'content', 'background'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which HTML tag inside <head> is used to link an external CSS stylesheet file?',
    options: ['<link>', '<style>', '<css>', '<script>'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which JavaScript function displays a popup message dialog in the browser?',
    options: ['alert()', 'popup()', 'msgBox()', 'print()'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which method writes a message into the browser developer console in JavaScript?',
    options: ['console.log()', 'print()', 'system.out()', 'echo()'],
    correct_index: 0,
    marks: 1
  },
  {
    subject: 'Client-Side Web Technologies',
    difficulty: 'easy',
    question_text: 'Which keyword is commonly used to declare a variable in modern JavaScript?',
    options: ['let', 'int', 'create', 'dim'],
    correct_index: 0,
    marks: 1
  }
];

/**
 * Generates a balanced 20-question blueprint:
 * 15 Very Easy (5 C/Algo, 5 Computing, 5 Web Tech)
 * 5 Easy (2 C/Algo, 2 Computing, 1 Web Tech)
 */
export function generateSemester1Blueprint() {
  const slots: { subject: string; difficulty: 'very_easy' | 'easy'; marks: number }[] = [];

  // 15 Very Easy: 5 from each subject
  for (const subject of SEMESTER_1_SUBJECTS) {
    for (let i = 0; i < 5; i++) {
      slots.push({ subject, difficulty: 'very_easy', marks: 1 });
    }
  }

  // 5 Easy: 2 C/Algo, 2 Computing, 1 Web Tech
  slots.push({ subject: 'Algorithms and Program Design using C', difficulty: 'easy', marks: 1 });
  slots.push({ subject: 'Algorithms and Program Design using C', difficulty: 'easy', marks: 1 });
  slots.push({ subject: 'Foundation of Computing', difficulty: 'easy', marks: 1 });
  slots.push({ subject: 'Foundation of Computing', difficulty: 'easy', marks: 1 });
  slots.push({ subject: 'Client-Side Web Technologies', difficulty: 'easy', marks: 1 });

  return slots;
}
