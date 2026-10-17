import { motion } from "motion/react";
import { Trophy, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

export function Newsletter() {
  const handleQuizClick = () => {
    // Open the official BCA Vault WhatsApp for Quiz access and competition instructions
    window.open(
      "https://wa.me/919326342123?text=Hi%20BCA%20Vault%2C%20I%20want%20to%20take%20the%20BCA%20knowledge%20quiz%20for%20the%20first%20batch%20reward!",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#1E40AF] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/20 mb-6">
            <Trophy className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">Student Knowledge Challenge</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Think You Can Top the Batch?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Take the BCA Vault quiz, test your BCA knowledge and compete with your classmates.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8 text-left">
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                <Sparkles className="w-4 h-4" />
                Top 3 Performers
              </div>
              <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                ₹199
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Top 3 quiz performers unlock special access at ₹199 with verified winner access.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                First-Batch Students
              </div>
              <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                ₹199
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Every student can get the complete Semester 1 bundle for ₹199.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleQuizClick}
              size="lg"
              className="h-13 px-8 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-amber-900/30 gap-2"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              Take the Quiz
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Button>
          </div>

          <p className="text-slate-400 text-xs mt-6">
            Transparent scoring · Open to all BCA students
          </p>
        </motion.div>
      </div>
    </section>
  );
}
