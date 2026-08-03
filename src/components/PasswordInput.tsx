"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** A password input with a show/hide (eye) toggle. Drop-in for `<input type="password" className="input" />`. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className = "", ...props },
  ref,
) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? "text" : "password"}
        className={`input pr-11 ${className}`.trim()}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-neutral-400 transition-colors hover:text-accent"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 5 9 7a12 12 0 0 1-2.2 2.9M6.2 6.2A12.6 12.6 0 0 0 3 12c0 2 4 7 9 7a9.6 9.6 0 0 0 3.2-.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
});
