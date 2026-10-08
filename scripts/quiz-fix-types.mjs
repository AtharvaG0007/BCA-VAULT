import fs from 'node:fs';
for(const path of ['src/app/components/quiz/QuizPage.tsx','src/app/components/quiz/AdminQuizManagement.tsx']) {
 let s=fs.readFileSync(path,'utf8').replaceAll(".replaceAll('_',' ')",".replace(/_/g,' ')");
 if(path.endsWith('QuizPage.tsx'))s=s.replace('const countdown=useRef','const lastRequestAt=useRef(0); const countdown=useRef').replace('if (!competitionId || requestInFlight.current) return;',"if (!competitionId || requestInFlight.current || (action==='current' && performance.now()-lastRequestAt.current<1000)) return;\n  lastRequestAt.current=performance.now();");
 fs.writeFileSync(path,s);
}
const edge='supabase/functions/payment-evidence/index.ts';let s=fs.readFileSync(edge,'utf8');s=s.replace(/  const isAllowed =\r?\n    ALLOWED_ORIGINS.includes\(origin\) \|\|\r?\n    [^\r\n]+;/,'  const isAllowed = isAllowedOrigin(origin);');fs.writeFileSync(edge,s);
