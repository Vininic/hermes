import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { cn } from "@/lib/utils";

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="hermes-card p-6">
      <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{eyebrow}</div>
      <h2 className="font-display mt-1 text-2xl text-primary">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Appearance only at M0 — the Aetheris provider/model section (per
 *  SUITE-ARCHITECTURE.md §3a, "Provider & model settings live on the
 *  Settings page") joins once `lib/ai/` is copied in, alongside the real
 *  Aetheris chat. No AI settings to configure yet. See HERMES.md. */
export default function Settings() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const L = t.hermes.settings;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-secondary">{L.eyebrow}</div>
        <h1 className="font-display mt-1.5 text-4xl text-primary">{L.title}</h1>
      </header>

      <Section eyebrow={L.appearanceEyebrow} title={L.appearanceTitle}>
        <div className="flex gap-2">
          {([
            { value: "light", label: L.parchment, icon: Sun },
            { value: "dark", label: L.signal, icon: Moon },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                theme === value ? "border-secondary/60 bg-secondary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
