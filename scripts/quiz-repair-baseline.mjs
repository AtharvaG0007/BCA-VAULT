import fs from 'node:fs';
const hero='src/app/components/home/Hero.tsx';
let text=fs.readFileSync(hero,'utf8');
text=text.replace('          </motion.div>\n\n          {/* Right: Floating Cards */}','          </div>\n\n          {/* Right: Floating Cards */}').replace('          </motion.div>\r\n\r\n          {/* Right: Floating Cards */}','          </div>\r\n\r\n          {/* Right: Floating Cards */}');
fs.writeFileSync(hero,text);
for(const file of ['payment-evidence','public-support-chat','gemini-chat']) {
 const path=`supabase/functions/${file}/index.ts`;
 let s=fs.readFileSync(path,'utf8');
 s=s.replace(/^<<<<<<< HEAD\r?\n([\s\S]*?)^=======\r?\n([\s\S]*?)^>>>>>>>[^\r\n]*\r?\n/gm,(_,ours,theirs)=>file==='payment-evidence'?theirs:ours);
 if(file==='payment-evidence') {
  s=s.replace(/      \/\/ Consume winner redemption atomically BEFORE[\s\S]*?      const \{ error: insertError \}/,'      // The database trigger validates eligibility and the unique index consumes the reward atomically.\n      const { error: insertError }');
  s=s.replace(/        \/\/ Rollback consumed redemption[\s\S]*?        if \(insertError\?\.code === "23505"\)/,'        if (insertError?.code === "23505")');
  const begin=s.indexOf('        const { data: redemption, error: redemptionError }');
  const end=s.indexOf('        couponRedemptionId = redemption.id;',begin);
  if(begin<0||end<0) throw Error('Missing payment match');
  s=s.slice(0,begin)+`        if (semester !== 1) return respond({ success: false, error: "The quiz offer applies to Semester 1." }, 403, corsHeaders);
        const { data: redemption, error: redemptionError } = await admin
          .from("quiz_winners")
          .select("redemption_id, quiz_competitions!inner(status)")
          .eq("redemption_id", winnerRedemptionId)
          .eq("user_id", effectiveUserId)
          .eq("quiz_competitions.status", "RESULTS_PUBLISHED")
          .maybeSingle();
        if (redemptionError || !redemption) {
          return respond({ success: false, error: "This account does not have a published quiz winner offer." }, 403, corsHeaders);
        }
        couponRedemptionId = redemption.redemption_id;`+s.slice(end+'        couponRedemptionId = redemption.id;'.length);
 }
 if(file==='public-support-chat') s=s.replace(/eligible for special .* pricing unlocked via private winner code on the purchase page\./,'eligible for account-bound special pricing after official result publication.').replace(/quiz winner codes are issued privately to verified winners/g,'quiz rewards are verified against the signed-in winning account');
 fs.writeFileSync(path,s);
}
