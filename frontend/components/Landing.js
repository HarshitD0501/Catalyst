"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

import { useEffect, useState } from "react";
import { useScrollReveal } from "@/lib/gsap";
import { getPublicPrices } from "@/lib/api";
import {
  ShieldCheck,
  CheckCircle2,
  Tag,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  PhoneCall,
  Mail,
  Lock,
  Check,
  Radio,
  Pause,
  Play,
  ArrowRight,
  MessageCircleHeart,
  Pill,
  CalendarClock,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Bell,
  Clock,
  KeyRound,
  Send,
  HeartHandshake,
  RefreshCw,
} from "lucide-react";

// ---- Verified FAQs (WAI-ARIA Accordion) ----
const FAQS = [
  {
    q: "What is CareSetu and who is it designed for?",
    a: "CareSetu (meaning 'Care Bridge') is an intelligent elderly care, medication scheduling, and family coordination platform. It is designed for seniors managing multi-condition prescriptions and family caregivers who need real-time adherence tracking, shared profiles, and proactive multi-channel reminders.",
  },
  {
    q: "How does the safety interaction check work?",
    a: "CareSetu cross-checks active medicine salts across your uploaded prescriptions against clinical interaction rules. It is a decision-support guide, not an exhaustive diagnostic system. A missing alert does not guarantee safety, and any warnings should be reviewed with your doctor.",
  },
  {
    q: "Does CareSetu prescribe medicines or advise substitutions?",
    a: "No. CareSetu is strictly non-clinical. We never diagnose conditions, prescribe medications, or recommend brand switches without doctor oversight. All information is provided for adherence, safety transparency, and discussion with your doctor or pharmacist.",
  },
  {
    q: "How do caregivers access a patient's records?",
    a: "Caregivers can only access an elderly individual's health records through secure, passcode-based Care Circles with patient consent. Access is authenticated server-side on every request, ensuring granular permission control (Care Manager vs Viewer).",
  },
  {
    q: "What are Jan Aushadhi generic medicines?",
    a: "Under the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP), the Government of India provides certified quality generic medicines at 50% to 80% lower cost than branded alternatives. They contain the identical therapeutic active salts.",
  },
  {
    q: "Where is my prescription data stored?",
    a: "Unconfirmed prescriptions remain temporary until you explicitly confirm and save them. Device-local comparison reports stay in your browser's private IndexedDB storage, and confirmed health records in authenticated accounts are stored securely with role-based access control.",
  },
];

export default function Landing({
  patient,
  onSelectDemo,
  onOpenDashboard,
  onLoginSuccess,
  onOpenAuth,
}) {
  const router = useRouter();
  const scope = useScrollReveal([]);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleAuthAction = () => {
    if (patient) {
      if (onOpenDashboard) onOpenDashboard();
      else router.push("/app");
    } else if (onOpenAuth) {
      onOpenAuth();
    } else {
      router.push("/app");
    }
  };

  return (
    <div
      className="landing-v2 min-h-screen bg-ui-canvas text-ui-text font-sans antialiased selection:bg-ui-surface-subtle selection:text-ui-text"
      ref={scope}
    >
      {/* ==============================================================
          PERSISTENT CHROME: NAVBAR
          ============================================================== */}
      <Navbar isLanding={true} onOpenAuth={onOpenAuth} />

      {/* ==============================================================
          MAIN CONTENT LANDMARK
          ============================================================== */}
      <main id="main-content" tabIndex="-1" className="focus:outline-none">
        {/* ==============================================================
            SECTION 1: HERO (#home)
            ============================================================== */}
        <header id="home" className="relative py-6 sm:py-8 lg:py-10 overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left: Verified Value Proposition (5/12 on lg) */}
          <div className="lg:col-span-5 flex flex-col justify-start items-start space-y-4 pt-1">
            {/* Context Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ui-surface border border-ui-border-decorative text-ui-text text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-ui-blue" aria-hidden="true" />
              <span>Elderly Care & Family Coordination Bridge</span>
            </div>

            {/* Concise, Balanced H1 */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-semibold text-ui-text leading-[1.15] tracking-tight">
              Smart elderly care, connected families, zero missed doses.
            </h1>

            {/* Support Copy with Medical Disclaimer */}
            <p className="text-sm sm:text-base text-ui-text-secondary font-sans leading-relaxed">
              CareSetu bridges the gap between aging parents, loving families, and essential healthcare. Automated medication schedules, passcode-protected Care Circles, bilingual voice check-ins, and proactive email & doctor appointment reminders.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1 w-full sm:w-auto">
              <a
                href="#product"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[42px] px-5 py-2 bg-ui-blue hover:bg-ui-blue-hover text-white rounded-lg text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue focus-visible:ring-offset-2"
              >
                <span>Explore the product</span>
                <ChevronRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={handleAuthAction}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[42px] px-5 py-2 bg-ui-surface hover:bg-ui-surface-subtle text-ui-text border border-ui-border-decorative hover:border-ui-control-border rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue focus-visible:ring-offset-2"
              >
                {patient ? "Open Workspace" : "Sign in"}
              </button>
            </div>

            {/* Credibility micro-points */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 text-xs font-medium text-ui-text-secondary border-t border-ui-border-decorative/60 w-full">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-ui-success" aria-hidden="true" /> Non-clinical assistance
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-ui-success" aria-hidden="true" /> Verified Jan Aushadhi catalogue
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-ui-success" aria-hidden="true" /> Patient-consented access
              </span>
            </div>
          </div>

          {/* Right: CareSetu Telemetry & Companion Card (7/12 on lg) */}
          <div className="lg:col-span-7 relative flex flex-col items-center justify-center lg:items-end w-full">
            <CareSetuCompanionCard onLaunchDemo={onOpenAuth || (() => onSelectDemo("ramesh"))} />
            <p className="mt-1.5 text-[11px] font-medium text-ui-text-secondary text-center lg:text-right" aria-label="Illustration notice">
              * Live interactive preview of CareSetu senior voice check-in, medication adherence, and Care Circle synchronization.
            </p>
          </div>
        </div>
      </header>

      {/* ==============================================================
          SECTION 2: TRUST & CREDIBILITY (#trust)
          ============================================================== */}
      <section id="trust" className="py-16 sm:py-20 border-t border-ui-border-decorative scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-ui-blue uppercase tracking-widest block mb-2">
              Safety & Data Boundaries
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ui-text tracking-tight">
              Built for patient consent, safety, and transparency
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ui-text-secondary leading-relaxed">
              Every workflow operates strictly within transparent data governance and non-clinical guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card">
              <div className="w-10 h-10 rounded-lg bg-ui-surface-subtle flex items-center justify-center text-ui-blue mb-4">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ui-text mb-2">Human Confirmation</h3>
              <p className="text-xs text-ui-text-secondary leading-relaxed">
                Extracted medicines, dosages, and schedules always require your explicit review and confirmation before being saved to your active record.
              </p>
            </div>

            <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card">
              <div className="w-10 h-10 rounded-lg bg-ui-surface-subtle flex items-center justify-center text-ui-blue mb-4">
                <Tag size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ui-text mb-2">Source-Labelled Prices</h3>
              <p className="text-xs text-ui-text-secondary leading-relaxed">
                Generic price alternatives are mapped directly to official Jan Aushadhi (PMBJP) catalogues and NPPA price control ceilings with clear provenance.
              </p>
            </div>

            <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card">
              <div className="w-10 h-10 rounded-lg bg-ui-surface-subtle flex items-center justify-center text-ui-blue mb-4">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ui-text mb-2">Caregiver Authorization</h3>
              <p className="text-xs text-ui-text-secondary leading-relaxed">
                Family caregivers can only view records for elders who have granted explicit linked consent. Access is verified server-side on every request.
              </p>
            </div>

            <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card">
              <div className="w-10 h-10 rounded-lg bg-ui-surface-subtle flex items-center justify-center text-ui-blue mb-4">
                <AlertTriangle size={20} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-ui-text mb-2">Interaction Moat</h3>
              <p className="text-xs text-ui-text-secondary leading-relaxed">
                Multi-doctor prescriptions are checked against cited clinical rules. Coverage is decision-support only; consult your doctor for any alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 3: ABOUT / HOW IT WORKS (#how-it-works)
          ============================================================== */}
      <section
        id="how-it-works"
        className="py-16 sm:py-20 border-t border-ui-border-decorative bg-ui-surface-subtle/40 scroll-mt-20"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Left Narrative Column (4/12) */}
            <div className="lg:col-span-4 space-y-4">
              <span className="text-xs font-semibold text-ui-blue uppercase tracking-widest block">
                Workflow
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ui-text leading-tight tracking-tight">
                From paper slips to a coordinated family schedule.
              </h2>
              <p className="text-sm text-ui-text-secondary leading-relaxed">
                Chronic care often involves multiple specialists with separate paper prescriptions. CareSetu organizes them into one unified family schedule without altering your doctor's clinical decisions.
              </p>
              <div className="pt-2">
                <a
                  href="#product"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-blue hover:text-ui-blue-hover transition-colors"
                >
                  <span>See generic price comparison</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Right Three-Step Rail (8/12) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card flex flex-col sm:flex-row items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ui-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                  01
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ui-text mb-1">
                    Digitize and parse prescription details
                  </h3>
                  <p className="text-xs sm:text-sm text-ui-text-secondary leading-relaxed">
                    Upload a photo of your printed or handwritten prescription. OCR extracts brand names, active salts, strengths, and dose frequencies for your inspection.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card flex flex-col sm:flex-row items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ui-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                  02
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ui-text mb-1">
                    Review safety warnings and generic alternatives
                  </h3>
                  <p className="text-xs sm:text-sm text-ui-text-secondary leading-relaxed">
                    Cross-check active medications for potential multi-doctor contraindications and compare branded retail prices directly against verified Jan Aushadhi generic equivalents.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-ui-surface border border-ui-border-decorative rounded-xl shadow-ui-card flex flex-col sm:flex-row items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ui-blue text-white flex items-center justify-center text-xs font-bold shrink-0">
                  03
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ui-text mb-1">
                    Confirm active schedule and synchronize with family
                  </h3>
                  <p className="text-xs sm:text-sm text-ui-text-secondary leading-relaxed">
                    Save confirmed records to receive scheduled adherence check-ins via WhatsApp or voice calls when configured, keeping distant caregivers informed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 4: PRODUCT EXPERIENCE (#product)
          ============================================================== */}
      <section id="product" className="py-16 sm:py-20 border-t border-ui-border-decorative scroll-mt-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-ui-blue uppercase tracking-widest block mb-2">
              Action Engine
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ui-text tracking-tight">
              Jan Aushadhi generic price discovery
            </h2>
            <p className="mt-2 text-sm text-ui-text-secondary leading-relaxed">
              Search any Indian medicine brand below to check verified active salt matches, NPPA price ceilings, and generic savings.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <PriceSimulatorCard />
            <p className="text-[11px] text-ui-text-secondary text-center mt-3">
              Data mapped to official PMBJP and NPPA reference catalogues. Never substitute prescribed medicines without physician guidance.
            </p>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 5: SECONDARY DASHBOARD LOGIN CTA (#dashboard)
          ============================================================== */}
      <section
        id="dashboard"
        className="py-16 sm:py-20 border-t border-ui-border-decorative bg-ui-surface-subtle/50 scroll-mt-20"
      >
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-ui-surface border border-ui-border-decorative rounded-2xl p-8 sm:p-12 shadow-ui-card">
            <span className="inline-block px-3 py-1 rounded-full bg-ui-surface-subtle text-ui-blue text-xs font-semibold mb-4">
              Secure Workspace Access
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-ui-text tracking-tight mb-3">
              Ready to review your prescriptions?
            </h2>
            <p className="text-sm sm:text-base text-ui-text-secondary max-w-lg mx-auto mb-8 leading-relaxed">
              Sign in to manage your active medication schedule, run drug-drug safety reviews, and track adherence telemetry from any device.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAuthAction}
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-8 py-3 bg-ui-blue hover:bg-ui-blue-hover text-white rounded-lg text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue focus-visible:ring-offset-2"
              >
                {patient ? "Open Workspace" : "Sign in to Dashboard"}
              </button>
              <Link
                href="/search"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-ui-surface hover:bg-ui-surface-subtle text-ui-text border border-ui-border-decorative rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue"
              >
                Public Search & Compare
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 6: FAQ (#faq)
          ============================================================== */}
      <section id="faq" className="py-16 sm:py-20 border-t border-ui-border-decorative scroll-mt-20">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-ui-blue uppercase tracking-widest block mb-2">
              Common Questions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ui-text tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-ui-text-secondary leading-relaxed">
              Clear answers on clinical boundaries, privacy, caregiver consent, and generic medicines.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="border border-ui-border-decorative rounded-xl bg-ui-surface overflow-hidden transition-colors"
              >
                <h3>
                  <button
                    type="button"
                    id={`faq-btn-${idx}`}
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-panel-${idx}`}
                    onClick={() => toggleFaq(idx)}
                    className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-ui-text hover:text-ui-blue transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-ui-blue transition-transform duration-200 ${
                        openFaq === idx ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                {openFaq === idx && (
                  <div
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-labelledby={`faq-btn-${idx}`}
                    className="px-5 pb-5 pt-1 text-sm text-ui-text-secondary leading-relaxed border-t border-ui-border-decorative/50"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==============================================================
          SECTION 7: SUBSCRIBE (#subscribe)
          ============================================================== */}
      <section
        id="subscribe"
        className="py-16 sm:py-20 border-t border-ui-border-decorative bg-ui-surface-subtle/30 scroll-mt-20"
      >
        <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-ui-surface border border-ui-border-decorative rounded-2xl p-6 sm:p-8 shadow-ui-card">
            <div className="w-12 h-12 bg-ui-surface-subtle text-ui-blue mx-auto mb-4 flex items-center justify-center rounded-full">
              <Mail className="w-6 h-6" aria-hidden="true" />
            </div>

            <h2 className="font-serif text-2xl font-semibold text-ui-text mb-2">
              Healthcare Brief & Adherence Updates
            </h2>
            <p className="text-xs sm:text-sm text-ui-text-secondary mb-6 leading-relaxed">
              Research on Jan Aushadhi generic availability, healthcare accessibility, and elder care adherence patterns.
            </p>

            <div className="p-4 bg-ui-surface-subtle border border-ui-border-decorative rounded-xl text-xs text-ui-text-secondary leading-relaxed">
              <strong className="text-ui-text block mb-1">Subscriptions in Private Preview</strong>
              Public newsletter signups are currently paused while our messaging infrastructure is configured. Registered patients and caregivers receive active adherence check-ins directly via WhatsApp and the web dashboard.
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* ==============================================================
          SECTION 8: FOOTER (LANDMARK)
          ============================================================== */}
      <footer className="bg-ui-surface border-t border-ui-border-decorative py-14 sm:py-16">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Col 1: Brand & Purpose */}
            <div className="space-y-4">
              <Link href="/" className="inline-block">
                <img
                  src="/caresetu-logo.png"
                  alt="CareSetu"
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <p className="text-xs text-ui-text-secondary leading-relaxed">
                CareSetu — Intelligent Elderly Care, Medication Scheduling & Family Coordination Platform. Not a substitute for licensed medical consultation.
              </p>
            </div>

            {/* Col 2: Navigation Anchors */}
            <div>
              <h4 className="text-xs font-semibold text-ui-text uppercase tracking-wider mb-3">
                Overview
              </h4>
              <ul className="space-y-2 text-xs text-ui-text-secondary">
                <li>
                  <a href="#home" className="hover:text-ui-blue transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#trust" className="hover:text-ui-blue transition-colors">
                    Safety & Boundaries
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-ui-blue transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#product" className="hover:text-ui-blue transition-colors">
                    Generic Comparison
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-ui-blue transition-colors">
                    Frequently Asked Questions
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Public Tools */}
            <div>
              <h4 className="text-xs font-semibold text-ui-text uppercase tracking-wider mb-3">
                Public Tools
              </h4>
              <ul className="space-y-2 text-xs text-ui-text-secondary">
                <li>
                  <Link href="/search" className="hover:text-ui-blue transition-colors">
                    Search & Compare Medicines
                  </Link>
                </li>
                <li>
                  <Link href="/scan" className="hover:text-ui-blue transition-colors">
                    Prescription OCR Scanner
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="hover:text-ui-blue transition-colors">
                    Find Jan Aushadhi Kendra
                  </Link>
                </li>
                <li>
                  <Link href="/history" className="hover:text-ui-blue transition-colors">
                    Saved Local History
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Emergency Assistance */}
            <div>
              <h4 className="text-xs font-semibold text-ui-text uppercase tracking-wider mb-3">
                Emergency Contact
              </h4>
              <div className="space-y-2 text-xs text-ui-text-secondary">
                <a
                  href="tel:108"
                  className="inline-flex items-center gap-1.5 font-bold text-ui-danger hover:underline text-sm"
                >
                  <PhoneCall size={14} aria-hidden="true" />
                  <span>National Emergency: 108</span>
                </a>
                <p className="text-[11px] leading-relaxed pt-1">
                  For sudden chest pain, breathing difficulty, or acute emergencies, call 108 immediately or visit the nearest emergency room.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-ui-border-decorative/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ui-text-secondary">
            <span>
              © 2026 CareSetu. All rights reserved. Always consult your registered medical practitioner.
            </span>
            <span className="text-[11px]">
              PMBJP & NPPA Reference Data Aligned
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---- Sub-Component: CareSetu Interactive Senior Voice & Care Circle Card ----
function CareSetuCompanionCard({ onLaunchDemo }) {
  const [activeTab, setActiveTab] = useState("voice"); // 'voice' | 'circle'
  const [isPlaying, setIsPlaying] = useState(true);
  const [doseStatus, setDoseStatus] = useState("pending"); // 'pending' | 'taken' | 'snoozed' | 'missed'
  const [toast, setToast] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-dismiss transient toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Voice speech simulation using browser speech synthesis if available
  const handleToggleVoice = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPlaying(false);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const text =
          "Namaste Ramesh ji! Subah ka nashta ho gaya? Amlong 5mg BP wali goli lene ka samay ho gaya hai. Kya aapne le li?";
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "hi-IN";
        u.rate = 0.92;
        u.onend = () => {
          setIsSpeaking(false);
          setIsPlaying(false);
        };
        u.onerror = () => {
          setIsSpeaking(false);
        };
        window.speechSynthesis.speak(u);
        setIsSpeaking(true);
        setIsPlaying(true);
      } catch (e) {
        setIsPlaying((p) => !p);
      }
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const handleAction = (type) => {
    setDoseStatus(type);
    if (type === "taken") {
      setToast({
        title: "Dose Verified & Logged ✓",
        msg: "Morning dose Amlong 5mg recorded taken by Ramesh Kumar at 08:14 AM. Care Circle (Meera) notified via Email & WhatsApp.",
        tone: "success",
      });
    } else if (type === "snoozed") {
      setToast({
        title: "Reminder Snoozed ⏰",
        msg: "Rescheduled for 08:30 AM. Proactive reminder queued for patient and care manager.",
        tone: "warning",
      });
    } else if (type === "missed") {
      setToast({
        title: "Escalation Noted ⚠️",
        msg: "Dose skipped. Non-clinical alert dispatched to Meera Kulkarni. Emergency contact 108 on standby.",
        tone: "danger",
      });
    }
  };

  return (
    <div
      role="region"
      aria-label="CareSetu Live Telemetry and Care Circle Companion"
      className="w-full max-w-lg bg-ui-surface border border-ui-border-decorative rounded-xl shadow-[0_12px_32px_-8px_rgba(23,43,77,0.12),0_2px_6px_rgba(23,43,77,0.04)] relative z-10 transition-all duration-300 hover:shadow-[0_16px_40px_-6px_rgba(23,43,77,0.16)] flex flex-col overflow-hidden"
    >
      {/* Decorative ambient top glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ui-blue via-amber-400 to-ui-blue" />

      {/* Card Header: Live Telemetry Indicator + Segmented Tab Switcher */}
      <div className="px-3.5 py-2 border-b border-ui-border-decorative/70 bg-ui-canvas/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-[10px] font-bold tracking-wider text-ui-text uppercase flex items-center gap-1 font-mono">
            <Radio size={11} className="text-emerald-600" aria-hidden="true" />
            Live Adherence
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-full">
            Senior Mode
          </span>
        </div>

        {/* Segmented View Switcher */}
        <div className="inline-flex items-center p-0.5 bg-ui-canvas border border-ui-border-decorative rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
              activeTab === "voice"
                ? "bg-ui-surface text-ui-blue shadow-sm border border-ui-border-decorative/60 font-bold"
                : "text-ui-text-secondary hover:text-ui-text"
            }`}
          >
            <PhoneCall size={11} className={activeTab === "voice" ? "text-ui-blue" : "text-ui-text-secondary"} />
            <span>Senior Voice</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("circle")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
              activeTab === "circle"
                ? "bg-ui-surface text-ui-blue shadow-sm border border-ui-border-decorative/60 font-bold"
                : "text-ui-text-secondary hover:text-ui-text"
            }`}
          >
            <Users size={11} className={activeTab === "circle" ? "text-ui-blue" : "text-ui-text-secondary"} />
            <span>Care Circle</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 space-y-2">
        {/* Dynamic Toast Notification for live actions */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`p-2 rounded-lg border flex items-start gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150 ${
              toast.tone === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                : toast.tone === "warning"
                ? "bg-amber-50/90 border-amber-200 text-amber-900"
                : "bg-rose-50/90 border-rose-200 text-rose-900"
            }`}
          >
            <CheckCircle2
              size={14}
              className={`shrink-0 mt-0.5 ${
                toast.tone === "success"
                  ? "text-emerald-600"
                  : toast.tone === "warning"
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            />
            <div className="flex-1 min-w-0">
              <strong className="font-semibold block text-[11px]">{toast.title}</strong>
              <p className="mt-0.5 text-[10.5px] leading-snug">{toast.msg}</p>
            </div>
          </div>
        )}

        {activeTab === "voice" ? (
          <>
            {/* Senior Dossier Header */}
            <div className="flex items-center justify-between p-2 bg-ui-canvas border border-ui-border-decorative rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ui-blue text-white flex items-center justify-center font-serif font-bold text-xs shadow-sm shrink-0">
                  RK
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif font-semibold text-xs sm:text-sm text-ui-text leading-none">
                      Ramesh Kumar
                    </h3>
                    <span className="text-[9px] font-sans font-semibold bg-ui-surface text-ui-text-secondary border border-ui-border-decorative px-1.5 py-0.2 rounded-full">
                      71 yrs
                    </span>
                  </div>
                  <p className="text-[10.5px] text-ui-text-secondary mt-0.5">
                    Hypertension Care &bull; Caregiver: <span className="font-medium text-ui-text">Meera (Daughter)</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9.5px] font-mono font-bold text-ui-blue block uppercase tracking-wider">
                  Morning Dose
                </span>
                <span className="text-[10.5px] font-mono font-semibold text-ui-text">
                  08:00 AM &bull; {doseStatus === "taken" ? (
                    <span className="text-emerald-700 font-bold">Taken ✓</span>
                  ) : doseStatus === "snoozed" ? (
                    <span className="text-amber-700 font-bold">08:30 AM ⏰</span>
                  ) : (
                    "Scheduled"
                  )}
                </span>
              </div>
            </div>

            {/* Active Medication Card */}
            <div className="p-2.5 bg-ui-surface border-l-3 border-l-ui-blue border border-ui-border-decorative rounded-lg shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-ui-amber-subtle rounded-lg border border-ui-amber/30 text-ui-amber mt-0.5 shrink-0">
                    <Pill size={15} className="text-ui-amber" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif font-semibold text-xs sm:text-sm text-ui-text">Amlong 5mg</span>
                      <span className="text-[9.5px] font-mono bg-ui-surface-subtle text-ui-text-secondary px-1.5 py-0.2 rounded font-semibold border border-ui-border-decorative/60">
                        1 Tab &bull; Post-Breakfast
                      </span>
                    </div>
                    <p className="text-[10.5px] text-ui-text-secondary mt-0.5">
                      Salt: <span className="font-mono text-ui-text font-medium">Amlodipine Besylate IP 5mg</span>
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-800">
                      <ShieldCheck size={12} className="text-emerald-700 shrink-0" aria-hidden="true" />
                      <span>Zero drug interactions detected</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block text-[9.5px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    Jan Aushadhi: ₹6
                  </span>
                </div>
              </div>
            </div>

            {/* Voice Companion Speech Bubble */}
            <div className="relative p-2.5 bg-gradient-to-br from-ui-canvas via-ui-surface to-ui-amber-subtle/30 border border-ui-border-decorative rounded-lg shadow-xs">
              <div className="flex items-center justify-between mb-1 pb-1 border-b border-ui-border-decorative/50">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-ui-blue" aria-hidden="true" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ui-text font-mono">
                    CareSetu Companion (Bilingual Voice)
                  </span>
                </div>
                <span className="text-[9px] font-mono font-medium text-ui-text-secondary bg-ui-surface px-1.5 py-0.2 rounded border border-ui-border-decorative/60">
                  Hindi &bull; English
                </span>
              </div>

              <p className="font-serif text-xs sm:text-[13px] text-ui-text leading-snug italic">
                &ldquo;Namaste Ramesh ji! Subah ka nashta ho gaya? BP wali goli{" "}
                <span className="font-semibold underline decoration-ui-blue decoration-1 not-italic text-ui-blue">
                  Amlong 5mg
                </span>{" "}
                lene ka samay ho gaya hai. Kya aapne le li?&rdquo;
              </p>

              {/* Animated Audio Waveform with sleek mini bars */}
              <div className="flex items-center justify-between gap-0.5 h-4 mt-1.5 px-2 bg-ui-surface/90 rounded border border-ui-border-decorative/80 overflow-hidden">
                {[40, 65, 80, 45, 90, 70, 30, 85, 100, 60, 40, 95, 75, 50, 85, 60, 35, 70, 90, 55, 30, 80, 65, 45, 85, 50, 30, 60].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={`w-0.5 sm:w-1 rounded-full transition-all duration-300 ${
                        i % 4 === 1
                          ? "bg-ui-blue"
                          : i % 4 === 3
                          ? "bg-ui-amber"
                          : "bg-ui-text-secondary"
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(25, (h * ((i % 3) + 1)) % 100)}%` : "25%",
                        opacity: isPlaying ? 0.9 : 0.35,
                      }}
                    />
                  )
                )}
              </div>
            </div>

            {/* Interactive Confirmation Actions */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ui-text-secondary block mb-1">
                Senior 1-Tap Response:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAction("taken")}
                  className={`min-h-[34px] px-2 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue ${
                    doseStatus === "taken"
                      ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                      : "bg-ui-surface text-ui-text border-ui-border-decorative hover:border-ui-blue/60 hover:bg-ui-surface-subtle"
                  }`}
                >
                  <Check size={13} className={doseStatus === "taken" ? "text-white" : "text-emerald-600"} aria-hidden="true" />
                  <span>Haan, Le Li</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction("snoozed")}
                  className={`min-h-[34px] px-2 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue ${
                    doseStatus === "snoozed"
                      ? "bg-ui-text text-white border-ui-text shadow-xs"
                      : "bg-ui-surface text-ui-text border-ui-border-decorative hover:border-ui-blue/60 hover:bg-ui-surface-subtle"
                  }`}
                >
                  <CalendarClock size={13} className={doseStatus === "snoozed" ? "text-white" : "text-amber-600"} aria-hidden="true" />
                  <span>15 Min Baad</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction("missed")}
                  className={`min-h-[34px] px-2 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue ${
                    doseStatus === "missed"
                      ? "bg-rose-700 text-white border-rose-800 shadow-xs"
                      : "bg-ui-surface text-ui-text border-ui-border-decorative hover:border-ui-blue/60 hover:bg-ui-surface-subtle"
                  }`}
                >
                  <AlertTriangle size={13} className={doseStatus === "missed" ? "text-white" : "text-rose-600"} aria-hidden="true" />
                  <span>Nahi Li</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Care Circle View */}
            <div className="p-2.5 bg-ui-canvas border border-ui-border-decorative rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ui-text">
                  <KeyRound size={14} className="text-ui-blue" aria-hidden="true" />
                  <span>Passcode Care Circle Engine</span>
                </div>
                <span className="text-[9px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  Encrypted &bull; 10m TTL
                </span>
              </div>
              <div className="p-2 bg-ui-surface border border-dashed border-ui-blue/40 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-ui-text-secondary font-semibold block">
                    Temporary Senior Access Passcode
                  </span>
                  <span className="font-mono text-base font-bold text-ui-blue tracking-wider">
                    8492 &bull; 3105
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-ui-blue bg-ui-blue/10 px-2 py-0.5 rounded">
                  08:42 Left
                </span>
              </div>
              <p className="text-[10.5px] text-ui-text-secondary leading-tight">
                Ramesh generates a one-time passcode to grant daughter Meera &ldquo;Care Manager&rdquo; rights without exposing master credentials.
              </p>
            </div>

            {/* Connected Circle Members List */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ui-text-secondary block">
                Synchronized Family Circle (3 Active):
              </span>
              <div className="divide-y divide-ui-border-decorative/60 border border-ui-border-decorative rounded-lg overflow-hidden bg-ui-surface">
                <div className="p-1.5 px-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-ui-blue text-white flex items-center justify-center text-[10px] font-bold font-serif shrink-0">
                      RK
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-ui-text block leading-none">Ramesh Kumar</span>
                      <span className="text-[9px] text-ui-text-secondary">Patient Owner (Full Control)</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-ui-blue bg-ui-surface-subtle px-1.5 py-0.2 rounded border border-ui-border-decorative/60">
                    Self
                  </span>
                </div>
                <div className="p-1.5 px-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold font-serif shrink-0">
                      MK
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-ui-text block leading-none">Meera Kulkarni</span>
                      <span className="text-[9px] text-ui-text-secondary">Daughter &bull; Care Manager</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Sync Active
                  </span>
                </div>
                <div className="p-1.5 px-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold font-serif shrink-0">
                      DS
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-ui-text block leading-none">Dr. R. K. Sharma</span>
                      <span className="text-[9px] text-ui-text-secondary">Cardiologist &bull; Clinical Viewer</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-ui-text-secondary bg-ui-surface-subtle px-1.5 py-0.2 rounded border border-ui-border-decorative/60">
                    Read-Only
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Proactive Multi-Channel Sync Strip */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-ui-border-decorative/60">
          <div className="p-1.5 rounded-md bg-ui-canvas border border-ui-border-decorative/60 text-center">
            <Mail size={12} className="mx-auto text-ui-blue mb-0.5" aria-hidden="true" />
            <span className="text-[9px] font-bold text-ui-text block font-mono">EMAIL</span>
            <span className="text-[8px] text-emerald-700 font-semibold">Dispatched ✓</span>
          </div>
          <div className="p-1.5 rounded-md bg-ui-canvas border border-ui-border-decorative/60 text-center">
            <MessageCircleHeart size={12} className="mx-auto text-emerald-600 mb-0.5" aria-hidden="true" />
            <span className="text-[9px] font-bold text-ui-text block font-mono">WHATSAPP</span>
            <span className="text-[8px] text-emerald-700 font-semibold">Synced ✓</span>
          </div>
          <div className="p-1.5 rounded-md bg-ui-canvas border border-ui-border-decorative/60 text-center">
            <PhoneCall size={12} className="mx-auto text-amber-600 mb-0.5" aria-hidden="true" />
            <span className="text-[9px] font-bold text-ui-text block font-mono">TELEPHONY</span>
            <span className="text-[8px] text-ui-text-secondary font-semibold">Standby</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Voice Scrubber & Workspace Demo Launcher */}
      <div className="px-3.5 py-2 border-t border-ui-border-decorative/80 bg-ui-canvas/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggleVoice}
            className="w-7 h-7 rounded-lg bg-ui-blue hover:bg-ui-blue-hover text-white flex items-center justify-center transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue shrink-0"
            title={isPlaying ? "Pause voice readout" : "Listen in Hindi"}
            aria-label={isPlaying ? "Pause voice readout" : "Listen in Hindi"}
          >
            {isPlaying ? (
              <Pause size={13} className="fill-current" aria-hidden="true" />
            ) : (
              <Play size={13} className="fill-current translate-x-0.5" aria-hidden="true" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-mono text-ui-text-secondary mb-0.5">
              <span className="font-semibold text-ui-text truncate">
                {isSpeaking ? "Speaking..." : isPlaying ? "Live audio" : "Voice paused"}
              </span>
              <span className="shrink-0">00:34 / 01:30</span>
            </div>
            <div className="h-1 bg-ui-border-decorative rounded-full overflow-hidden">
              <div
                className="h-full bg-ui-blue rounded-full transition-all duration-300"
                style={{ width: isPlaying ? "42%" : "25%" }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLaunchDemo}
          className="min-h-[32px] px-3 py-1 bg-ui-text hover:bg-ui-blue text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue shrink-0"
        >
          <span>Open Demo</span>
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </div>

      {/* Live Care Circle Notification Ticker */}
      <div className="px-3 py-1.5 bg-ui-surface-subtle/80 border-t border-ui-border-decorative/60 flex items-center justify-between text-[10px] text-ui-text-secondary">
        <span className="flex items-center gap-1.5 truncate">
          <HeartHandshake size={12} className="text-ui-blue shrink-0" aria-hidden="true" />
          <span className="truncate">
            Care Circle: <strong>Meera Kulkarni</strong> received instant adherence confirmation
          </span>
        </span>
        <span className="font-mono text-[9px] text-ui-text-secondary font-medium shrink-0 ml-2">08:14 AM</span>
      </div>
    </div>
  );
}

// ---- Sub-Component: Action Engine Price Simulator ----
function PriceSimulatorCard() {
  const [q, setQ] = useState("Dolo 650");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = (brand) => {
    if (!brand) return;
    setLoading(true);
    setError("");
    getPublicPrices({ brand })
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Price query failed");
        setLoading(false);
      });
  };

  useEffect(() => {
    run("Dolo 650");
  }, []);

  const money = (v) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—");

  return (
    <div className="bg-ui-surface border border-ui-border-decorative rounded-2xl p-6 sm:p-8 shadow-ui-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(q.trim());
        }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex-1 relative">
          <input
            id="price-simulator-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medicine brand e.g. Dolo 650, Glycomet 500"
            aria-label="Search medicine brand for price comparison"
            className="w-full min-h-[44px] px-4 py-2.5 text-base bg-ui-canvas/60 text-ui-text border border-ui-control-border rounded-lg placeholder:text-ui-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-ui-blue focus:border-ui-blue"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-6 py-2.5 bg-ui-blue hover:bg-ui-blue-hover disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-blue"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span>Checking…</span>
            </>
          ) : (
            <>
              <Search size={16} aria-hidden="true" />
              <span>Compare Prices</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div role="alert" className="p-3 bg-[#FDF0EE] border border-[#F5B5AE] text-ui-danger text-xs font-semibold rounded-lg mb-4 flex items-center gap-2">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {data._development_fixture && (
            <p className="text-xs font-semibold text-ui-warning bg-[#FFF8E6] border border-[#F1D699] p-2.5 rounded-lg mb-4">
              Note: Offline reference database values shown.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-ui-border-decorative">
            <div className="p-4 bg-ui-canvas/60 border border-ui-border-decorative rounded-xl">
              <span className="text-xs font-medium text-ui-text-secondary block">Branded Retail</span>
              <span className="text-2xl font-serif font-bold text-ui-text mt-1 block">
                ₹{money(data.market_price)}
              </span>
              <span className="text-[11px] text-ui-text-secondary mt-0.5 block">MRP estimation</span>
            </div>

            <div className="p-4 bg-ui-canvas/60 border border-ui-border-decorative rounded-xl">
              <span className="text-xs font-medium text-ui-text-secondary block">NPPA Price Ceiling</span>
              <span className="text-2xl font-serif font-bold text-ui-text mt-1 block">
                {data.nppa_ceiling_price != null ? `₹${money(data.nppa_ceiling_price)}` : "—"}
              </span>
              <span className="text-[11px] text-ui-text-secondary mt-0.5 block">Official price control</span>
            </div>

            <div className="p-4 bg-[#EAF5EC] border border-[#BDDDC2] rounded-xl relative">
              <span className="text-xs font-semibold text-ui-success block">Jan Aushadhi Generic</span>
              <span className="text-2xl font-serif font-bold text-ui-success mt-1 block">
                ₹{money(data.jan_aushadhi_price)}
              </span>
              {data.max_savings_percent > 0 && (
                <span className="inline-block mt-1 text-[11px] font-bold bg-ui-success text-white px-2 py-0.5 rounded-full">
                  Save up to {data.max_savings_percent}%
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
