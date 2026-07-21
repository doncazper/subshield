import { Clock3, Code2, LogOut, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import type { SessionState } from "../types";
import { logout } from "../lib/api";
import { Brand } from "./Brand";

interface HeaderProps {
  session: SessionState;
  accessState: "checking" | "pending" | "configured" | "unavailable";
  onLoggedOut: () => void;
}

export function Header({ session, accessState, onLoggedOut }: HeaderProps) {
  const handleLogout = async () => {
    await logout();
    onLoggedOut();
  };

  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/#how-it-works">How it works</a>
        <a href="/privacy">Data practices</a>
        <a href="/security">API &amp; security</a>
        <a href="https://github.com/doncazper/subshield" target="_blank" rel="noreferrer">
          <Code2 size={17} strokeWidth={1.8} aria-hidden="true" />
          Open source
        </a>
      </nav>
      {session.status === "authenticated" ? (
        <button className="button button--outline header-action" type="button" onClick={() => void handleLogout()}>
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
          Log out
        </button>
      ) : accessState === "configured" ? (
        <a className="button button--outline header-action" href="/api/auth/reddit">
          <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
          Connect Reddit account
        </a>
      ) : (
        <div
          className={`header-status ${accessState === "pending" ? "is-pending" : accessState === "unavailable" ? "is-unavailable" : "is-checking"}`}
          role="status"
          aria-label={
            accessState === "pending"
              ? "Preview mode"
              : accessState === "unavailable"
                ? "Live connection status unavailable"
                : "Checking Reddit account connection"
          }
        >
          {accessState === "pending" ? (
            <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : accessState === "unavailable" ? (
            <TriangleAlert size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span>
            {accessState === "pending" ? "Preview mode" : accessState === "unavailable" ? "Live status unavailable" : "Checking access"}
          </span>
        </div>
      )}
    </header>
  );
}
