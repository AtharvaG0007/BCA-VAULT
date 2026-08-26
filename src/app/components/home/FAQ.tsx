import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "What is BCA Vault Complete Theory Bundle?",
    a: "It's a one-time purchase that gives you access to complete theory notes, PYQs, PYQ analysis, and most repeated questions across all eligible BCA theory subjects and semesters.",
  },
  {
    q: "Which subjects are included?",
    a: "Eligible theory subjects from Semester 1 and Semester 2 under BCA Syllabus 2026–27. Mathematics, labs, practicals and project work are excluded; Semesters 3–8 are Coming Soon.",
  },
  {
    q: "How does payment work?",
    a: "You pay via UPI (any app — GPay, PhonePe, Paytm, etc.) to our UPI ID. Then submit payment evidence in BCA Vault with your name, registered email, transaction ID, and payment screenshot. Our admin verifies and grants access.",
  },
  {
    q: "How long does access take after payment?",
    a: "Usually within a few hours. Maximum 24 hours. Once authorized, the bundle appears in your My Library section on your dashboard.",
  },
  {
    q: "Will the content be updated?",
    a: "Yes. We regularly add new notes and update existing content. Your one-time purchase includes all future updates to the bundle.",
  },
  {
    q: "Are the notes and PYQs accurate?",
    a: "Yes. All materials are prepared by BCA university toppers and verified for accuracy. PYQ papers are sourced from actual university exam records.",
  },
  {
    q: "What if I have a problem after purchase?",
    a: "Contact us at gogawaleatharva26@gmail.com or call 9326342123. We'll resolve any access issues promptly.",
  },
  {
    q: "Is there a refund policy?",
    a: "Due to the digital nature of our content, we don't offer refunds after access has been granted. If you received incorrect content, contact us within 48 hours and we'll make it right.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-[#4F46E5] uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Frequently asked questions
          </h2>
          <p className="text-gray-500">Everything you need to know before you get started.</p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-100/60 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <span className="shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  {openIndex === i
                    ? <Minus className="w-3.5 h-3.5 text-[#1E40AF]" />
                    : <Plus className="w-3.5 h-3.5 text-gray-500" />}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
