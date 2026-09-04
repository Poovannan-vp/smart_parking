import { useNavigate } from "react-router-dom";
import { HiMapPin, HiUser, HiShieldCheck, HiCog6Tooth } from "react-icons/hi2";

import Button from "../../../shared/components/Button";
import Header from "../../../shared/components/Header";
import { ROUTES } from "../../../app/routes";
import { ParkingPreviewGraphic } from "../components/ParkingPreviewGraphic";

const STEPS = [
  {
    number: "01",
    title: "Check",
    description: "View your office parking availability before you arrive.",
  },
  {
    number: "02",
    title: "Park",
    description: "Arrive and park in an available space.",
  },
  {
    number: "03",
    title: "Stay Updated",
    description: "Parking status stays current in real time.",
  },
];

const ROLES = [
  {
    icon: HiUser,
    title: "Employee",
    description: "View your assigned office location and current parking availability.",
  },
  {
    icon: HiShieldCheck,
    title: "Security",
    description: "Keep parking status accurate as spaces become occupied or available.",
  },
  {
    icon: HiCog6Tooth,
    title: "Administrator",
    description: "Manage physical parking layouts and monitor live parking status.",
  },
];

function scrollToHowItWorks() {
  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <Header variant="public" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-temenos-border bg-temenos-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-temenos-teal/30 bg-temenos-teal-light px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-temenos-teal-dark">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-temenos-teal opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-temenos-teal" />
                  </span>
                  Live Parking
                </span>

                <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-temenos-navy sm:text-5xl">
                  Smart Parking,
                  <br />
                  Made Simple.
                </h1>

                <p className="mt-6 text-lg leading-relaxed text-slate-600">
                  Check your parking availability before you arrive and view your office parking layout in real
                  time.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button variant="teal" className="px-6 py-3 text-base" onClick={() => navigate(ROUTES.LOGIN)}>
                    Employee Login
                  </Button>
                  <Button variant="secondary" className="px-6 py-3 text-base" onClick={scrollToHowItWorks}>
                    How It Works
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-temenos-border bg-white p-6 shadow-sm sm:p-8">
                <ParkingPreviewGraphic />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-temenos-navy sm:text-3xl">
              Parking, without the guesswork.
            </h2>

            <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:divide-x sm:divide-temenos-border">
              {STEPS.map((step) => (
                <div key={step.number} className="sm:pl-10 sm:first:pl-0">
                  <span className="text-sm font-bold text-temenos-teal">{step.number}</span>
                  <h3 className="mt-3 text-lg font-semibold text-temenos-navy">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Locations */}
        <section className="border-y border-temenos-border bg-temenos-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-temenos-navy sm:text-3xl">
                One parking experience across every Temenos location
              </h2>
              <p className="mt-3 text-slate-600">
                Access your office parking information from one application, wherever your office is.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-2 text-base font-semibold text-temenos-navy">
              <HiMapPin className="h-5 w-5 text-temenos-teal" aria-hidden="true" />
              Every Temenos office is supported automatically as new locations are added.
            </div>
          </div>
        </section>

        {/* Product Preview */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold tracking-tight text-temenos-navy sm:text-3xl">
                  Your parking. Your layout. Live.
                </h2>
                <p className="mt-3 text-slate-600">
                  A precise view of your office&apos;s actual parking layout, not a generic grid.
                </p>
              </div>

              <div className="rounded-2xl border border-temenos-border bg-temenos-bg p-6 sm:p-8">
                <ParkingPreviewGraphic showLegend />
              </div>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section className="border-y border-temenos-border bg-temenos-bg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-temenos-navy sm:text-3xl">
              Built for every parking role
            </h2>

            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {ROLES.map((role) => (
                <div key={role.title}>
                  <role.icon className="h-6 w-6 text-temenos-teal" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-temenos-navy">{role.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-temenos-navy">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Know your parking before you arrive.
            </h2>
            <p className="mt-3 text-slate-300">Check your office parking availability in one place.</p>
            <div className="mt-8">
              <Button variant="teal" className="px-8 py-3 text-base" onClick={() => navigate(ROUTES.LOGIN)}>
                Employee Login
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-temenos-border bg-white py-8 text-sm text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold text-temenos-navy">TEMENOS</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Smart Parking</span>
          </div>
          <p className="text-xs text-slate-400">Internal Enterprise Solution · © 2026 Temenos</p>
        </div>
      </footer>
    </div>
  );
}
