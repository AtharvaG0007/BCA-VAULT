import fs from 'node:fs';
const migration='supabase/migrations/20261008150239_secure_quiz_competitions.sql';
const groups=[
 ['C / Algorithms','easy',[
 ['Which C type stores a single character?',['char','float','double','void'],0],
 ['Which symbol ends a C statement?',[';','@',':','#'],0],
 ['Which operator tests equality in C?',['==','=','!=','++'],0],
 ['Which header declares printf?',['stdio.h','math.h','string.h','ctype.h'],0]]],
 ['C / Algorithms','medium',[
 ['What is the worst-case time complexity of binary search on a sorted array?',['O(log n)','O(n)','O(n²)','O(1)'],0],
 ['For int x = 5; what is x / 2 in C?',['2','2.5','3','0'],0],
 ['Which data structure follows LIFO?',['Stack','Queue','Linked list by definition','Hash table'],0],
 ['What is the value of 3 + 4 * 2 in C?',['11','14','10','24'],0]]],
 ['Foundation of Computing','easy',[
 ['Which memory is volatile?',['RAM','ROM','SSD','DVD'],0],
 ['Which unit performs arithmetic in a CPU?',['ALU','Router','Monitor','Cache controller'],0],
 ['How many bits make one byte?',['8','4','16','32'],0],
 ['Which device is primarily an input device?',['Keyboard','Monitor','Speaker','Projector'],0]]],
 ['Foundation of Computing','medium',[
 ['What is binary 1010 in decimal?',['10','8','12','14'],0],
 ['What is decimal 15 in hexadecimal?',['F','E','10','A'],0],
 ['Which logic gate outputs 1 only when both inputs are 1?',['AND','OR','XOR','NOT'],0],
 ['Which software manages hardware resources and processes?',['Operating system','Spreadsheet','Web page','Presentation file'],0]]],
 ['Communication Skills','easy',[
 ['In communication, who interprets the message?',['Receiver','Sender only','Channel','Noise'],0],
 ['Which is an example of nonverbal communication?',['Eye contact','A spoken sentence','An email paragraph','A written report'],0],
 ['What is feedback in communication?',['The receiver’s response','The transmission medium','An unrelated distraction','A sender’s address'],0],
 ['Which practice supports active listening?',['Paraphrasing to confirm understanding','Interrupting repeatedly','Preparing a reply without listening','Ignoring nonverbal cues'],0]]],
 ['Client-Side Web Technologies','easy',[
 ['Which HTML element creates a hyperlink?',['a','p','div','br'],0],
 ['Which CSS property sets text color?',['color','background-image','font-style','display'],0],
 ['Which language adds interactive behavior to a web page?',['JavaScript','HTML alone','CSS alone','SQL'],0],
 ['Which HTML element represents the largest-level heading?',['h1','h6','head','header-text'],0]]],
 ['Client-Side Web Technologies','medium',[
 ['Which CSS selector targets an element with id main?',['#main','.main','main*','@main'],0],
 ['What does document.querySelector return when there is no match?',['null','An empty array','false','A new element'],0],
 ['Which JavaScript comparison checks both type and value without coercion?',['===','==','=','=>'],0],
 ['In the CSS box model, what lies between content and border?',['Padding','Margin','Outline','Viewport'],0]]]
];
const blueprint=groups.map(([subject,difficulty])=>({subject,difficulty,marks:1}));
const rows=groups.flatMap(([subject,difficulty,questions])=>questions.map(([question_text,options,correct_index])=>({subject,difficulty,question_text,options,correct_index,marks:1})));
const sql=`\n-- Prepared draft: administrators must review the pool and schedule before opening.\nDO $seed$ declare cid uuid; begin\ninsert into public.quiz_competitions(title,description,blueprint) values('Semester 1 Knowledge Challenge','Seven questions across C, computing, communication and the web. One focused attempt.', '${JSON.stringify(blueprint).replaceAll("'","''")}') returning id into cid;\ninsert into public.quiz_questions(competition_id,subject,difficulty,question_text,options,correct_index,marks) select cid,subject,difficulty,question_text,options,correct_index,marks from jsonb_to_recordset('${JSON.stringify(rows).replaceAll("'","''")}') as q(subject text,difficulty text,question_text text,options jsonb,correct_index int,marks int);\nend $seed$;\n`;
fs.appendFileSync(migration,sql);
