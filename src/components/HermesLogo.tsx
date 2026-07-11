import { cn } from "@/lib/utils";

/** The Hermes mark — a "kinetic relay": a diamond node core (the relay,
 *  always mid-transmission) flanked by swept wing-feather strokes (Hermes'
 *  winged sandals, abstracted to the suite's geometric stroke language), with
 *  a hairline tick top and bottom — the same mint-mark convention Pluto's
 *  coin carries, here read as a signal pulse instead of a mint stamp. */
export function HermesMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={cn("h-6 w-6", className)} aria-hidden>
      {/* relay core */}
      <path d="M32 21 L43 32 L32 43 L21 32 Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      {/* left wing feathers */}
      <path d="M19 27 L6 18 M19 37 L6 44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      {/* right wing feathers */}
      <path d="M45 27 L58 18 M45 37 L58 44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      {/* signal ticks */}
      <path d="M32 16 V11 M32 53 V48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  /** "light" for dark surfaces (sidebar, login panel); "dark" for parchment. */
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "dark", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <HermesMark className={variant === "light" ? "text-secondary-soft" : "text-secondary"} />
      <span
        className={cn(
          "font-display text-xl leading-none",
          variant === "light" ? "text-sidebar-foreground" : "text-primary",
        )}
      >
        Hermes
      </span>
    </div>
  );
}
