import { Link } from "react-router";
import { BookOpen, Linkedin, Instagram, Github, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "Notes", href: "/notes" },
    { label: "PYQ Papers", href: "/pyq" },
    { label: "PYQ Analysis", href: "/pyq/analysis" },
    { label: "Question Packs", href: "/exam-kits" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Blog", href: "#" },
  ],
  Students: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Library", href: "/dashboard" },
  ],
  Legal: [
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Refund Policy", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#111827] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1E40AF] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                BCA <span className="text-[#4F46E5]">Vault</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              India's premium EdTech marketplace for BCA students. Semester notes, PYQ papers, analysis reports, and exam bundles — crafted by university toppers.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#4F46E5]" />
                <a href="mailto:bcavault07@gmail.com" className="hover:text-white transition">bcavault07@gmail.com</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#4F46E5]" />
                <a href="https://wa.me/919326342123" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">+91 93263 42123</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#4F46E5]" />
                <span>Navi Mumbai, Maharashtra, India</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: Linkedin, href: "https://www.linkedin.com/in/atharva-gogawale-259173354/", label: "LinkedIn" },
                { icon: Instagram, href: "https://www.instagram.com/_athgo07/", label: "Instagram" },
                { icon: Github, href: "https://github.com/AtharvaG0007", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#1E40AF] hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 hover:text-[#4F46E5] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* SiteCrafters Credit */}
        <div className="border-t border-white/10 mt-12 pt-5 pb-1">
          <a
            href="https://sitecrafters-five.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit SiteCrafters website"
            className="mx-auto w-fit flex items-center justify-center gap-2.5 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span>Designed by</span>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dhZVabMRvDh6Pi5SloFCu1tGOOfzc5.png"
              alt="SiteCrafters logo"
              className="w-6 h-6 object-contain"
            />
            <span className="font-semibold text-gray-300">SiteCrafters</span>
          </a>
        </div>

        {/* Independent Platform Notice */}
        <div className="border-t border-white/10 mt-5 pt-6 mb-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4">
            <p className="text-xs text-gray-500 leading-relaxed text-center">
              <span className="font-semibold text-gray-400">⚠️ Independent Platform Disclaimer:</span>{" "}
              BCA Vault is an independent student startup project. It is <strong className="text-gray-400">NOT</strong> sponsored, owned, operated, endorsed, or affiliated with Bharati Vidyapeeth University, any of its faculty members, professors, teachers, departments, or administration. All content is community-created.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026 BCA Vault. All rights reserved. Made with ❤️ in India.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded-sm bg-gradient-to-r from-orange-500 via-white to-green-500 border border-white/20" />
              <span className="text-xs text-gray-500">India</span>
            </div>
            <span className="text-xs text-gray-500">Secure Direct UPI Payments</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
