import fs from 'node:fs';
import { SEMESTER_1_QUESTION_BANK, generateSemester1Blueprint } from '../src/lib/quiz/semester1QuestionBank.ts';

const blueprint = generateSemester1Blueprint();
const questions = SEMESTER_1_QUESTION_BANK;

const migrationPath = 'supabase/migrations/20261008150239_secure_quiz_competitions.sql';
let content = fs.readFileSync(migrationPath, 'utf8');

// Update difficulty check constraint
content = content.replace(
  "difficulty text not null check(difficulty in ('easy','medium','hard'))",
  "difficulty text not null check(difficulty in ('very_easy','easy','medium','hard'))"
);

// Replace the seed at the bottom
const seedMarker = '-- Prepared draft: administrators must review the pool and schedule before opening.';
const splitIndex = content.indexOf(seedMarker);
if (splitIndex === -1) {
  throw new Error('Seed marker not found');
}

const baseSql = content.slice(0, splitIndex);

const newSeed = `${seedMarker}
DO $seed$ declare cid uuid; begin
insert into public.quiz_competitions(title,description,question_count,seconds_per_question,blueprint) values(
  'Semester 1 Knowledge Challenge',
  'A beginner-friendly revision test covering basic C programming, algorithms, computer fundamentals, and web technologies.',
  20,
  20,
  '${JSON.stringify(blueprint).replaceAll("'", "''")}'
) returning id into cid;
insert into public.quiz_questions(competition_id,subject,difficulty,question_text,options,correct_index,marks)
select cid,subject,difficulty,question_text,options,correct_index,marks
from jsonb_to_recordset('${JSON.stringify(questions).replaceAll("'", "''")}')
as q(subject text,difficulty text,question_text text,options jsonb,correct_index int,marks int);
end $seed$;
`;

fs.writeFileSync(migrationPath, baseSql + newSeed);
console.log('Successfully updated 20261008150239_secure_quiz_competitions.sql with 72 beginner questions and 20-question blueprint.');
