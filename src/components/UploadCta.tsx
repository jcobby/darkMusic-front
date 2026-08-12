import Link from "next/link";
import { Reveal } from "./Reveal";

/** "Sign in & upload" banner pointing contributors to the account submit form. */
export function UploadCta({
  title,
  blurb,
  cta = "Sign in & upload",
  email,
}: {
  title: string;
  blurb: string;
  cta?: string;
  email?: string;
}) {
  return (
    <Reveal>
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-0.5 text-sm text-neutral-400">
            {blurb}
            {email && (
              <>
                {" "}
                — or email{" "}
                <a href={`mailto:${email}`} className="text-accent hover:underline">
                  {email}
                </a>
                .
              </>
            )}
          </p>
        </div>
        <Link href="/account" className="btn-accent shrink-0 whitespace-nowrap">
          {cta} →
        </Link>
      </div>
    </Reveal>
  );
}
