import { Sparkles, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function SocialProof() {
  return (
    <section className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 border-y border-indigo-100/60 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-2xl bg-[#1E40AF] text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0 mx-auto sm:mx-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1E40AF] text-[11px] font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" /> First-Batch Adopter
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
                Be Part of the First BCA Vault Batch
              </h2>
              <p className="text-sm text-gray-600 max-w-2xl mt-1 leading-relaxed">
                BCA Vault is starting with its first student batch. Your feedback helps us improve the notes, PYQ analysis and learning experience for future BCA students.
              </p>
              <p className="text-xs font-semibold text-indigo-700 mt-1.5">
                ✦ First-batch students get access to the introductory student offer.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              to="/purchase"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-bold shadow-sm transition"
            >
              Get First-Batch Access
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
