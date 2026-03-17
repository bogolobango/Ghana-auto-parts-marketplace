import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{
      background: "linear-gradient(145deg, oklch(0.22 0.02 250) 0%, oklch(0.18 0.015 240) 50%, oklch(0.20 0.025 220) 100%)"
    }}>
      {/* Subtle atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 30% 20%, oklch(0.40 0.06 55 / 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, oklch(0.35 0.04 200 / 0.06) 0%, transparent 45%)"
      }} />
      <div className="container relative py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center">
              <img src="/voom-logo.png" alt="VOOM" className="h-10 w-auto brightness-0 invert" />
            </div>
            <p className="text-sm text-white/45 leading-relaxed tracking-wide">
              Ghana's premier digital marketplace for automotive spare parts. Connecting vendors and buyers across the nation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium text-white/80 mb-5 text-sm tracking-wider uppercase">Quick Links</h4>
            <div className="space-y-3">
              <FooterLink href="/products">Browse Parts</FooterLink>
              <FooterLink href="/vendors">Find Vendors</FooterLink>
              <FooterLink href="/categories">Categories</FooterLink>
            </div>
          </div>

          {/* For Vendors */}
          <div>
            <h4 className="font-medium text-white/80 mb-5 text-sm tracking-wider uppercase">For Vendors</h4>
            <div className="space-y-3">
              <FooterLink href="/vendor/register">Register as Vendor</FooterLink>
              <FooterLink href="/vendor/dashboard">Vendor Dashboard</FooterLink>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium text-white/80 mb-5 text-sm tracking-wider uppercase">Contact</h4>
            <div className="space-y-3.5 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 text-primary/70" />
                <span className="text-white/50 tracking-wide">Abossey Okai, Accra, Ghana</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary/70" />
                <span className="text-white/50 tracking-wide">+233 XX XXX XXXX</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary/70" />
                <span className="text-white/50 tracking-wide">hello@voom.gh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 mt-12 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30 tracking-wider">
            &copy; {new Date().getFullYear()} VOOM Ghana. All rights reserved.
          </p>
          <p className="text-xs text-white/30 tracking-wider">
            Built for Ghana's automotive market
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-sm text-white/45 hover:text-white/70 transition-colors duration-300 no-underline tracking-wide">
      {children}
    </Link>
  );
}
