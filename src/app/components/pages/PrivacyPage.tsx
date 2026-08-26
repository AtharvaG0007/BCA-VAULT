import { BookOpen } from "lucide-react";
import { Link } from "react-router";

const LAST_UPDATED = "June 5, 2026";
const VERSION = "1.0.0";

const sections = [
  { id: "collect", title: "1. Information We Collect" },
  { id: "auth", title: "2. Authentication Data" },
  { id: "supabase", title: "3. Supabase Usage" },
  { id: "use", title: "4. How We Use Your Information" },
  { id: "sharing", title: "5. Data Sharing" },
  { id: "analytics", title: "6. Analytics" },
  { id: "cookies", title: "7. Cookies & Local Storage" },
  { id: "security", title: "8. Data Security" },
  { id: "retention", title: "9. Data Retention" },
  { id: "rights", title: "10. Your Rights" },
  { id: "children", title: "11. Children's Privacy" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact Information" },
];

export function PrivacyPage() {
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
            Privacy Policy
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
                <p className="text-xs font-semibold text-[#1E40AF] mb-1">Terms & Conditions</p>
                <Link to="/terms-and-conditions" className="text-xs text-gray-600 hover:text-[#1E40AF] transition-colors">
                  Read our Terms →
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <article className="space-y-10">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-sm text-blue-800 leading-relaxed">
                BCA Vault is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. We use Supabase for authentication and data storage — all data is stored securely in compliance with applicable privacy laws.
              </p>
            </div>

            <section id="collect">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>1. Information We Collect</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We collect the following categories of information:</p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-1">Account Information</p>
                  <p>Name, email address, profile picture (if using Google login), and chosen username.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-1">Usage Data</p>
                  <p>Pages visited, content viewed, downloads completed, search queries, and feature usage patterns.</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-1">Transaction Data</p>
                  <p>Credits purchased, resources bought, download history, and payment references (not payment card data).</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="font-semibold text-gray-800 mb-1">Legal Acceptance Records</p>
                  <p>Timestamp and version number of your Terms & Conditions and Privacy Policy acceptance.</p>
                </div>
              </div>
            </section>

            <section id="auth">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>2. Authentication Data</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We use Supabase Authentication for secure user login. When you create an account or sign in, the following authentication data is processed:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Email address and hashed password (for email/password login)</li>
                <li>Google account name, email, and profile picture (for Google login)</li>
                <li>Unique user identifier (Supabase UID)</li>
                <li>Authentication timestamps (account creation, last login)</li>
                <li>Login method used (email or Google)</li>
              </ul>
              <p className="text-gray-600 text-sm mt-3">Passwords are never stored in plain text. Supabase handles all password hashing and security.</p>
            </section>

            <section id="supabase">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>3. Supabase Usage</h2>
              <p className="text-gray-600 leading-relaxed mb-3">BCA Vault uses Supabase (by Google) for the following services:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li><strong>Supabase Authentication</strong> — User account management and login</li>
                <li><strong>Supabase Database</strong> — Storing user profiles, purchase history, credits, activity logs, and legal acceptance records</li>
                <li><strong>Supabase Storage</strong> — Hosting study resources and uploaded content</li>
              </ul>
              <p className="text-gray-600 text-sm mt-3">Supabase is operated by Google LLC and processes data in accordance with <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1E40AF] underline">Google's Privacy Policy</a>. Data is stored on Google's secure servers.</p>
            </section>

            <section id="use">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>4. How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We use collected information to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Create and manage your user account</li>
                <li>Process credits purchases and resource downloads</li>
                <li>Provide role-based access (member, admin, superadmin)</li>
                <li>Send important account notifications and security alerts</li>
                <li>Improve Platform features and user experience</li>
                <li>Detect and prevent fraudulent activity</li>
                <li>Comply with legal obligations</li>
                <li>Maintain legal acceptance audit records</li>
              </ul>
            </section>

            <section id="sharing">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>5. Data Sharing</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We do <strong>NOT</strong> sell your personal data. We share data only in the following limited circumstances:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li><strong>Supabase</strong> — For authentication and database services</li>
                <li><strong>Payment Processors</strong> — For processing credit purchases (we never see your payment card details)</li>
                <li><strong>Law Enforcement</strong> — When required by applicable law, court order, or government request</li>
              </ul>
              <p className="text-gray-600 text-sm mt-3">We will never share your personal information with Bharati Vidyapeeth University, faculty members, or any academic institution.</p>
            </section>

            <section id="analytics">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>6. Analytics</h2>
              <p className="text-gray-600 leading-relaxed">We use anonymized and aggregated analytics data to understand how students use the Platform, identify popular resources, and improve our services. Analytics data does not include personally identifiable information and cannot be used to identify individual users. We do not use third-party advertising analytics.</p>
            </section>

            <section id="cookies">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>7. Cookies & Local Storage</h2>
              <p className="text-gray-600 leading-relaxed mb-3">BCA Vault uses browser local storage (not traditional cookies) to store:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>Legal acceptance status and version (required for platform access)</li>
                <li>User preferences and display settings</li>
                <li>Authentication session tokens (managed by Supabase)</li>
              </ul>
              <p className="text-gray-600 text-sm mt-3">You can clear local storage data through your browser settings. This will require you to accept the Terms & Conditions again on your next visit.</p>
            </section>

            <section id="security">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>8. Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-3">We implement appropriate technical and organizational measures to protect your data:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li>All data transmission is encrypted via HTTPS/TLS</li>
                <li>Supabase security rules enforce role-based access control</li>
                <li>Passwords are handled by Supabase Authentication (never stored in plain text)</li>
                <li>Admin access requires multi-factor authentication</li>
                <li>Regular security audits of database access patterns</li>
              </ul>
            </section>

            <section id="retention">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>9. Data Retention</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-1">Account Data</p>
                    <p>Retained for 2 years after last login. Deleted upon account deletion request.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-1">Transaction Data</p>
                    <p>Retained for 7 years for legal and financial compliance requirements.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-1">Legal Acceptance</p>
                    <p>Retained indefinitely for legal audit trail purposes.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-800 mb-1">Activity Logs</p>
                    <p>Retained for 90 days for security monitoring, then aggregated.</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="rights">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>10. Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-3">You have the following rights regarding your personal data:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated personal data</li>
                <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to specific types of data processing</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw your acceptance of our Terms at any time (this will terminate your access)</li>
              </ul>
              <p className="text-gray-600 text-sm mt-3">To exercise these rights, email <a href="mailto:privacy@bcavault.in" className="text-[#1E40AF] underline">privacy@bcavault.in</a>. We will respond within 30 days.</p>
            </section>

            <section id="children">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>11. Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed">BCA Vault is designed for college-level students who are at least 18 years of age. We do not knowingly collect or process personal data from individuals under 18. If you believe we have inadvertently collected data from a minor, please contact us immediately at <a href="mailto:privacy@bcavault.in" className="text-[#1E40AF] underline">privacy@bcavault.in</a> and we will delete it promptly.</p>
            </section>

            <section id="changes">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>12. Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will notify you of significant changes via email or an in-platform notification, and update the version number and effective date. If changes materially affect how we use your data, we will request your renewed consent through the Platform's legal acceptance flow.</p>
            </section>

            <section id="contact">
              <h2 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-display)" }}>13. Contact Information</h2>
              <p className="text-gray-600 leading-relaxed mb-3">For privacy-related questions, requests, or concerns:</p>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-sm text-gray-600 space-y-1">
                <p><strong>Privacy Officer:</strong> <a href="mailto:privacy@bcavault.in" className="text-[#1E40AF]">privacy@bcavault.in</a></p>
                <p><strong>General:</strong> <a href="mailto:contact@bcavault.in" className="text-[#1E40AF]">contact@bcavault.in</a></p>
                <p className="pt-2 text-gray-400 text-xs">
                  BCA Vault is an independent student startup. Not affiliated with Bharati Vidyapeeth University.
                </p>
              </div>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
