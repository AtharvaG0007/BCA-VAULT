import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "What is included in the BCA Vault bundle?",
    a: "The bundle includes eligible Semester 1 study notes, unit-wise/topic-wise material, and Semester 1 most repeated topics organized for theory exam preparation.",
  },
  {
    q: "Are Mathematics, labs and projects included?",
    a: "No. Mathematics, lab/practical subjects and projects are currently excluded unless specifically stated for a particular bundle.",
  },
  {
    q: "How do I get access?",
    a: "Create/login to your account, complete payment, submit your payment evidence and wait for manual verification. Once approved, your content will appear in My Library.",
  },
  {
    q: "Can I download the notes?",
    a: "Access is provided through the BCA Vault learning experience. Content availability and download permissions depend on the specific material and platform policy.",
  },
  {
    q: "Who is BCA Vault?",
    a: "BCA Vault is an independent student-focused platform providing organised BCA study resources.",
  },
  {
    q: "Is BCA Vault officially affiliated with the university?",
    a: "No. BCA Vault is an independent student startup project and is not sponsored, owned, operated, endorsed or affiliated with Bharati Vidyapeeth University, its faculty, departments or administration.",
  },
  {
    q: "What if I have a problem after purchase?",
    a: "Contact us at bcavault07@gmail.com or WhatsApp +91 93263 42123. We'll resolve any access issues promptly.",
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
