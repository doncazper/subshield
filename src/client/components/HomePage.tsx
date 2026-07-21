import { ArrowRight, Check, Clock3, Cpu, LockKeyhole, Play, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { loadHealth, loadSession } from "../lib/api";
import type { SessionState } from "../types";
import { Header } from "./Header";
import { ScanPanel } from "./ScanPanel";

type HealthState = "loading" | "ready" | "unavailable";

export function HomePage() {
  const [healthState, setHealthState] = useState<HealthState>("loading");
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const refreshSession = async () => {
    try {
      setSession(await loadSession());
    } catch {
      setSession({ status: "unavailable" });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal)
      .then(() => {
        setHealthState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealthState("unavailable");
      });
    void loadSession(controller.signal)
      .then(setSession)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSession({ status: "unavailable" });
      });
    return () => controller.abort();
  }, []);

  const oauthConfigured = session.status === "authenticated"
    || (session.status === "anonymous" && session.configured);
  const localOnlyPreview = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const accessState: "checking" | "pending" | "configured" | "unavailable" = oauthConfigured
    ? "configured"
    : (healthState === "unavailable" || session.status === "unavailable") && !localOnlyPreview
      ? "unavailable"
      : healthState === "loading" || session.status === "loading"
        ? "checking"
        : "pending";

  return (
    <div className="app-shell">
      <Header session={session} accessState={accessState} onLoggedOut={() => void refreshSession()} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1>Review one community’s queue with clarity.</h1>
            <p>
              SubShield helps moderators review published spam and safety-rule matches in one community at a time. Every decision stays with the moderator.
            </p>
            {session.status === "authenticated" ? (
              <a className="button button--primary hero-cta" href="#scan">
                Open your community scan
                <ArrowRight size={19} strokeWidth={1.9} aria-hidden="true" />
              </a>
            ) : accessState === "configured" ? (
              <a className="button button--primary hero-cta" href="/api/auth/reddit">
                <UserRound size={20} strokeWidth={1.8} aria-hidden="true" />
                Connect Reddit account
              </a>
            ) : (
              <a className="button button--primary hero-cta" href="#scan">
                <Play size={20} strokeWidth={1.8} aria-hidden="true" />
                Explore the moderator workflow
              </a>
            )}
            <a className="access-link" href="/privacy#data-access">
              See exactly what we access
              <ArrowRight size={19} strokeWidth={1.8} aria-hidden="true" />
            </a>
            {accessState === "pending" ? (
              <div className="approval-state" role="status">
                <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  <strong>Preview mode</strong>
                  OAuth is not configured yet. Explore the local workflow with synthetic examples.
                </span>
              </div>
            ) : accessState === "unavailable" ? (
              <div className="approval-state approval-state--unavailable" role="status">
                <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  <strong>Live connection status unavailable</strong>
                  The local workflow preview remains available while the live status endpoint is unavailable.
                </span>
              </div>
            ) : null}
          </div>
          <ScanPanel session={session} />
        </section>

        <section className="process" id="how-it-works" aria-labelledby="process-title">
          <h2 className="sr-only" id="process-title">How SubShield handles a scan</h2>
          <article className="process-step">
            <span className="process-icon"><LockKeyhole size={29} strokeWidth={1.7} /></span>
            <div><strong>1. Connect</strong><p>Connect your moderator account and choose one community you manage.</p></div>
          </article>
          <ArrowRight className="process-arrow" size={32} strokeWidth={1.4} aria-hidden="true" />
          <article className="process-step">
            <span className="process-icon"><Cpu size={29} strokeWidth={1.7} /></span>
            <div><strong>2. Review a queue</strong><p>Run a rules-based check of up to 25 recent public submissions.</p></div>
          </article>
          <ArrowRight className="process-arrow" size={32} strokeWidth={1.4} aria-hidden="true" />
          <article className="process-step">
            <span className="process-icon"><Trash2 size={29} strokeWidth={1.7} /></span>
            <div><strong>3. Decide</strong><p>Review the explanation yourself, then clear the response when you are done.</p></div>
          </article>
        </section>

        <section className="data-band" aria-labelledby="data-band-title">
          <span className="data-band__icon"><ShieldCheck size={36} strokeWidth={1.7} /></span>
          <div>
            <h2 id="data-band-title">Review prompts, not automated actions.</h2>
            <p>Published rules surface likely spam and safety-language signals; the moderator makes the final call.</p>
            <ul className="data-band__list">
              <li><Check size={15} /> One community at a time</li>
              <li><Check size={15} /> Up to 25 recent submissions</li>
              <li><Check size={15} /> No actions on Reddit</li>
            </ul>
          </div>
          <a href="/privacy">Read data practices <ArrowRight size={18} /></a>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-footer__identity">
          <span>© 2026 SubShield</span>
          <span>Independent open-source software; not affiliated with or endorsed by Reddit.</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/privacy">Privacy</a>
          <a href="/security">Security</a>
          <a href="/terms">Terms</a>
          <a href="https://github.com/doncazper/subshield" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}
