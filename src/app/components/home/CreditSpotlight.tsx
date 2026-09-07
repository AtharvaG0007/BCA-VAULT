import { motion } from "motion/react";
import { Share2, Users, Gift, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "../ui/button";

const referralPillars = [
  {
    icon: Users,
    title: "1. Tell Your Classmates",
    desc: "Share BCA Vault with friends who want organised Semester 1 notes and exam preparation.",
  },
  {
    icon: Share2,
    title: "2. Share Your Experience",
    desc: "Help them discover unit-wise materials and exam-focused preparation.",
  },
  {
    icon: Gift,
    title: "3. Earn Student Rewards",
    desc: "Receive referral rewards according to current student referral terms.",
  },
];

export function CreditSpotlight() {
  const handleShareClick = () => {
    const text = encodeURIComponent(
      "Hey! Check out BCA Vault for our BCA Semester 1 exam preparation. It has unit-wise notes and most repeated topics in one place: https://bca-vault.portalbcavault.workers.dev"
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="py-20 bg-[#0B132B] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1E40AF]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1E40AF]/20 border border-[#1E40AF]/30 rounded-full mb-6">
            <Gift className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Student Referral Program</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Help Your Classmates. Earn Student Rewards.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Know a classmate who is preparing for BCA exams? Share BCA Vault with them.
          </p>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Students who successfully refer classmates can receive a referral reward according to the current referral terms.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {referralPillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF] flex items-center justify-center mx-auto mb-4 shadow-md shadow-blue-900/40">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {p.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            className="bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold px-10 h-13 rounded-2xl gap-2 shadow-lg shadow-emerald-950/40"
            onClick={handleShareClick}
          >
            <MessageCircle className="w-5 h-5 text-slate-950" />
            Share BCA Vault on WhatsApp
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </Button>
          <p className="text-slate-400 text-xs mt-3 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Referrals subject to standard student verification terms
          </p>
        </div>
      </div>
    </section>
  );
}
