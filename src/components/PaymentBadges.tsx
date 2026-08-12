"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const METHODS = [
  {
    label: "MTN MoMo",
    color: "#FFCC00",
    note: "Enter the one-time password (OTP) sent to your phone by SMS, then tap Authorize (approve with your MoMo PIN if asked).",
  },
  {
    label: "Telecel Cash",
    color: "#E2001A",
    note: "Enter the OTP sent by SMS, then tap Authorize. If no SMS arrives, wait for the countdown to finish, then tap “Resend via WhatsApp” on the Paystack screen — the code comes to your WhatsApp. Still stuck? Use MTN MoMo or card.",
  },
  {
    label: "AirtelTigo",
    color: "#005EB8",
    note: "Enter the one-time password (OTP) sent to your phone, then tap Authorize (approve with your AirtelTigo Money PIN if asked).",
  },
  {
    label: "Visa",
    color: "#1A1F71",
    note: "Enter your card details securely on the Paystack screen after you press Pay.",
  },
  {
    label: "Mastercard",
    color: "#EB001B",
    note: "Enter your card details securely on the Paystack screen after you press Pay.",
  },
];

/** Accepted payment methods. Tap one to see how to pay with it. */
export function PaymentBadges({ className = "" }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const activeNote = METHODS.find((m) => m.label === active)?.note;
  const centered = className.includes("justify-center");

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {METHODS.map((m) => {
          const on = active === m.label;
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => setActive((a) => (a === m.label ? null : m.label))}
              aria-pressed={on}
              title={`How to pay with ${m.label}`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
                on
                  ? "border-accent bg-accent/15 text-white shadow-glow-sm"
                  : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
              <span className={`text-[10px] transition-opacity ${on ? "opacity-70" : "opacity-40"}`}>
                {on ? "▴" : "▾"}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {activeNote && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className={`mt-2 flex max-w-md items-start gap-2 rounded-xl border border-accent/30 bg-accent/[0.08] px-3 py-2 text-left ${
                centered ? "mx-auto" : ""
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 shrink-0 text-accent"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
              </svg>
              <p className="text-[11px] leading-relaxed text-neutral-200">
                <span className="font-semibold text-accent">{active}: </span>
                {activeNote}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
