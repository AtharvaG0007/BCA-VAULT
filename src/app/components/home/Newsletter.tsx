import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Sparkles, CheckCircle, Coins } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-[#1E40AF] to-[#4F46E5] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-900/30 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 mb-6">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-semibold text-amber-200">Subscribe & earn 15 free credits</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Stay ahead of every exam
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Get exam alerts, new notes notifications, and exclusive subscriber discounts. Plus earn 15 Vault Credits just for joining!
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-xl font-semibold text-white">You're in! +15 credits added to your wallet.</p>
              <p className="text-blue-200 text-sm">Check your inbox for a confirmation email.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-white text-gray-900 border-0 shadow-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl shadow-lg whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                Subscribe Free
              </Button>
            </form>
          )}

          <p className="text-blue-300/70 text-xs mt-4">
            No spam. Unsubscribe anytime. We respect your privacy.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
