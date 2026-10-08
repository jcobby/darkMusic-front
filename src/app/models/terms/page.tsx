import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/config/site";
import { MODELS_MARKET } from "@/lib/modelsMarket";

export const metadata: Metadata = {
  title: "DMY Models Terms",
  description: "How bookings, payments, commission and responsibilities work on DMY Models.",
};

const pct = `${MODELS_MARKET.commissionRate * 100}%`;

const MODEL_RESPONSIBILITIES = [
  "Their conduct",
  "Their availability",
  "Their rates",
  "Their performance",
  "Their punctuality",
  "Their representations",
  "Their agreements with clients",
  "Their taxes and other obligations",
  "Their personal safety decisions",
  "Any dispute arising from their service",
];

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. What DMY Models is",
    body: (
      <p>
        DMY Models is a booking platform run by Dark Music Yard (&ldquo;DMY&rdquo;). It connects
        independent models with customers who want to book them for music videos, photoshoots,
        commercials, events, brand promos and similar work. DMY lists profiles, takes bookings and
        payments, and pays models. DMY is not the model&apos;s employer or agent.
      </p>
    ),
  },
  {
    title: "2. Who can register as a model",
    body: (
      <ul>
        <li>You must be {MODELS_MARKET.minAge} years or older. DMY does not list minors.</li>
        <li>The information and photos you submit must be accurate and must be of you.</li>
        <li>
          DMY reviews every profile before it goes live, and may decline, hide or remove any
          profile at its discretion.
        </li>
      </ul>
    ),
  },
  {
    title: "3. How a booking works",
    body: (
      <ol>
        <li>The customer sends a booking request with the date, time, location, shoot type, duration and an offer.</li>
        <li>The model accepts (confirming the final price) or declines.</li>
        <li>The customer pays the agreed price through DMY. The booking is confirmed only once payment succeeds.</li>
        <li>After payment, the model and customer receive each other&apos;s contact details to finalise the shoot.</li>
        <li>After the shoot, the booking is marked completed and the customer can leave a review.</li>
      </ol>
    ),
  },
  {
    title: "4. Rates, commission and payouts",
    body: (
      <ul>
        <li>
          Each model sets their own starting rate, from GH₵{MODELS_MARKET.minRateGhs.toLocaleString("en-US")}.
        </li>
        <li>
          DMY keeps a {pct} commission on every booking paid through the platform. The model
          receives the balance.
        </li>
        <li>
          DMY collects the full payment and pays the model their balance after the shoot is
          completed, to the payment details agreed with DMY.
        </li>
      </ul>
    ),
  },
  {
    title: "5. Keep bookings on DMY",
    body: (
      <p>
        Any booking that starts on DMY must be paid through DMY, including repeat bookings with
        the same customer. Arranging payment privately to avoid the commission may lead to the
        model&apos;s profile being removed and the customer&apos;s account being closed.
      </p>
    ),
  },
  {
    title: "6. The model is responsible for",
    body: (
      <>
        <p>Models are independent. Each model is responsible for:</p>
        <ul>
          {MODEL_RESPONSIBILITIES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    title: "7. Cancellations and refunds",
    body: (
      <ul>
        <li>Before payment, the customer can cancel and the model can decline or withdraw at any time.</li>
        <li>
          After payment, contact DMY to cancel or change a booking. Refunds are reviewed case by
          case.
        </li>
        <li>If DMY cancels a paid booking, DMY will arrange the customer&apos;s refund.</li>
      </ul>
    ),
  },
  {
    title: "8. Customers",
    body: (
      <ul>
        <li>Give accurate booking details, including the real location and the nature of the shoot.</li>
        <li>Treat models with respect. DMY may cancel bookings or close accounts for abusive or unsafe behaviour.</li>
        <li>Reviews can only be left after a completed, paid booking and must be honest.</li>
      </ul>
    ),
  },
  {
    title: "9. Photos and profile",
    body: (
      <p>
        By registering, the model authorizes DMY to display their submitted photos, video and
        profile on the DMY website and to promote DMY Models. A model can ask DMY to remove their
        profile at any time.
      </p>
    ),
  },
  {
    title: "10. Privacy",
    body: (
      <p>
        A model&apos;s legal name, age, weight, phone number and email are kept private by DMY.
        Phone and email are shared with a customer only after that customer has paid for a
        booking, and the customer&apos;s contact details are shared with the model at the same
        point.
      </p>
    ),
  },
  {
    title: "11. Changes",
    body: (
      <p>
        DMY may update these terms. The version in effect when a booking is made applies to that
        booking.
      </p>
    ),
  },
];

export default function ModelsTermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="DMY Models"
        title="DMY Models Terms"
        subtitle="How bookings, payments, commission and responsibilities work."
      />
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl space-y-8 text-[15px] leading-relaxed text-neutral-300 [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
          <p className="text-sm text-neutral-500">Last updated 6 October 2026</p>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="mb-2 text-lg font-semibold text-white">{s.title}</h2>
              {s.body}
            </div>
          ))}
          <p className="border-t border-white/[0.06] pt-6 text-sm text-neutral-400">
            Questions? Email{" "}
            <a href={`mailto:${site.contact.email}`} className="text-accent hover:underline">
              {site.contact.email}
            </a>{" "}
            or go back to{" "}
            <Link href="/models" className="text-accent hover:underline">
              DMY Models
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
