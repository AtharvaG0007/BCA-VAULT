import { BookOpen } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "June 5, 2026";
const VERSION = "1.0.0";

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "independent", title: "2. Independent Platform Notice" },
  { id: "description", title: "3. Description of Service" },
  { id: "responsibilities", title: "4. User Responsibilities" },
  { id: "community", title: "5. Community Guidelines" },
  { id: "content", title: "6. Educational Content Disclaimer" },
  { id: "payment", title: "7. Payment & Credits" },
  { id: "suspension", title: "8. Account Suspension Policy" },
  { id: "ip", title: "9. Intellectual Property" },
  { id: "copyright", title: "10. Copyright Policy" },
  { id: "liability", title: "11. Limitation of Liability" },
  { id: "indemnification", title: "12. Indemnification" },
  { id: "governing", title: "13. Governing Law" },
  { id: "changes", title: "14. Changes to Terms" },
  { id: "contact", title: "15. Contact Information" },
];

export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0A0F1E] text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
            <BookOpen className="w-4 h-4" />
            BCA Vault
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Terms & Conditions
          </h1>
          <p className="text-slate-400 text-sm">
            Last updated: {LAST_UPDATED} · Version {VERSION}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-gray-500 hover:text-[#1E40AF] py-1 transition-colors truncate"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
              <div className="mt-8 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-semibold text-[#1E40AF] mb-1">Privacy Policy</p>
                <Link to="/privacy-policy" className="text-xs text-gray-600 hover:text-[#1E40AF] transition-colors">
                  Read our Privacy Policy →
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="prose prose-gray max-w-none space-y-10">
            {/* Important Notice Banner */}
            <div className="not-prose bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-sm font-bold text-red-700 mb-2">⚠️ Important Notice — Read Before Proceeding</p>
              <p className="text-sm text-red-600 leading-relaxed">
                BCA Vault is an <strong>independent student startup</strong>. It is NOT affiliated with, sponsored by, or endorsed by Bharati Vidyapeeth University or any of its faculty, departments, or administration.
              </p>
            </div>

            <section id="acceptance">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">By accessing or using BCA Vault ("the Platform," "we," "us," or "our"), you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, please do not access or use the Platform. These Terms apply to all visitors, users, and others who access or use the Platform.</p>
            </section>

            <section id="independent">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>2. Independent Platform Notice</h2>
              <p className="text-gray-600 leading-relaxed mb-4">BCA Vault is an independent student startup project. It is expressly NOT:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Sponsored by Bharati Vidyapeeth University</li>
                <li>Owned or operated by Bharati Vidyapeeth University</li>
                <li>Endorsed or recommended by Bharati Vidyapeeth University</li>
                <li>Affiliated with any college faculty member, professor, or teacher</li>
                <li>Affiliated with any university department or administration</li>
                <li>An official university platform of any kind</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">The Platform is independently developed and operated by BCA students as a startup initiative. Any resemblance of our content to official university material is coincidental and community-sourced.</p>
            </section>

            <section id="description">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">BCA Vault provides a marketplace for student-created and community-curated educational resources including lecture notes, previous year question (PYQ) papers, and study bundles for BCA (Bachelor of Computer Applications) students. The Platform also offers features including user accounts, a credits system, community discussions, and study analytics tools.</p>
            </section>

            <section id="responsibilities">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>4. User Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed mb-3">By using the Platform, you agree to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Be at least 18 years of age or have verifiable parental consent</li>
                <li>Provide accurate and truthful information during registration</li>
                <li>Maintain the security and confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorized account access</li>
                <li>Not share your account with others</li>
                <li>Use the Platform only for lawful, educational purposes</li>
                <li>Not attempt to reverse-engineer, copy, or redistribute Platform software</li>
              </ul>
            </section>

            <section id="community">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>5. Community Guidelines</h2>
              <p className="text-gray-600 leading-relaxed mb-3">All users are expected to uphold a respectful and supportive community. The following are strictly prohibited:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Harassment, bullying, or abusive behavior toward other users</li>
                <li>Sharing discriminatory, hateful, or offensive content</li>
                <li>Uploading copyrighted material without authorization</li>
                <li>Deliberately spreading academic misinformation</li>
                <li>Spamming or unsolicited commercial messaging</li>
                <li>Impersonating university officials, faculty, or other users</li>
                <li>Any activity that disrupts the Platform's normal operation</li>
              </ul>
            </section>

            <section id="content">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>6. Educational Content Disclaimer</h2>
              <p className="text-gray-600 leading-relaxed mb-3">All educational content on BCA Vault is created, uploaded, and shared by students and community members. The Platform does not guarantee:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>The accuracy, completeness, or correctness of any study material</li>
                <li>Alignment with the current official university syllabus</li>
                <li>That content reflects official examination patterns</li>
                <li>That using our resources will improve academic performance</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">Always cross-reference study materials with official university resources, textbooks, and faculty guidance.</p>
            </section>

            <section id="payment">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>7. Payment & Credits</h2>
              <p className="text-gray-600 leading-relaxed mb-3">The Platform operates a virtual credits system for purchasing resources. The following terms apply:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Credits purchased are non-refundable except in cases of verified technical failure</li>
                <li>Platform credits have no cash value and cannot be redeemed for money</li>
                <li>Pricing for resources and credit packages is subject to change with prior notice</li>
                <li>All payments are processed securely through third-party payment gateways</li>
                <li>We are not responsible for payment failures caused by your bank or payment provider</li>
              </ul>
            </section>

            <section id="suspension">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>8. Account Suspension Policy</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We reserve the right to suspend or permanently terminate accounts for the following:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Violation of Community Guidelines</li>
                <li>Fraudulent activity or payment disputes in bad faith</li>
                <li>Uploading inappropriate, illegal, or copyrighted content</li>
                <li>Attempting to circumvent Platform security or access controls</li>
                <li>Creating multiple accounts to bypass suspensions</li>
                <li>Any conduct that we determine, in our sole discretion, to be harmful to the Platform or its users</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-3">Suspended accounts forfeit any remaining credits. Appeals may be submitted to contact@bcavault.in.</p>
            </section>

            <section id="ip">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>9. Intellectual Property</h2>
              <p className="text-gray-600 leading-relaxed">Student-uploaded content remains the intellectual property of its creators. By uploading content to the Platform, creators grant BCA Vault a non-exclusive, royalty-free license to host, display, and distribute the content within the Platform. The Platform's design, interface, branding, and source code are proprietary to BCA Vault and may not be copied or reproduced without permission.</p>
            </section>

            <section id="copyright">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>10. Copyright Policy</h2>
              <p className="text-gray-600 leading-relaxed">We respect intellectual property rights. If you believe content on the Platform infringes your copyright, please submit a DMCA takedown notice to <a href="mailto:legal@bcavault.in" className="text-[#1E40AF] underline">legal@bcavault.in</a> with the following: (1) identification of the copyrighted work, (2) identification of the infringing material, (3) your contact information, and (4) a statement of good faith belief. We will respond within 7 business days.</p>
            </section>

            <section id="liability">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>11. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">To the fullest extent permitted by law, BCA Vault shall not be liable for: inaccurate or misleading study materials; academic performance outcomes; third-party service failures (including Firebase, payment gateways, or WhatsApp); loss or corruption of user data; or any indirect, incidental, special, or consequential damages arising from your use of the Platform. The Platform is provided "as is" without warranties of any kind.</p>
            </section>

            <section id="indemnification">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>12. Indemnification</h2>
              <p className="text-gray-600 leading-relaxed">You agree to indemnify, defend, and hold harmless BCA Vault and its founders, team members, and agents from any claims, damages, liabilities, and expenses (including legal fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.</p>
            </section>

            <section id="governing">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>13. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Pune, Maharashtra, India.</p>
            </section>

            <section id="changes">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>14. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or an in-platform notification. Your continued use of the Platform after any changes constitutes your acceptance of the new Terms. We will update the version number and date when changes are made.</p>
            </section>

            <section id="contact">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>15. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-3">For any questions, concerns, or requests related to these Terms, please contact us:</p>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-sm text-gray-600 space-y-1">
                <p><strong>General:</strong> <a href="mailto:contact@bcavault.in" className="text-[#1E40AF]">contact@bcavault.in</a></p>
                <p><strong>Legal / DMCA:</strong> <a href="mailto:legal@bcavault.in" className="text-[#1E40AF]">legal@bcavault.in</a></p>
                <p><strong>Privacy:</strong> <a href="mailto:privacy@bcavault.in" className="text-[#1E40AF]">privacy@bcavault.in</a></p>
                <p className="pt-2 text-gray-400 text-xs">BCA Vault is an independent student startup. Not affiliated with Bharati Vidyapeeth University.</p>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
