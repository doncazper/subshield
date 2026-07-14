import { Clock3, Github, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { SessionState } from "../types";
import { logout } from "../lib/api";
import { Brand } from "./Brand";

interface HeaderProps {
  session: SessionState;
  oauthConfigured?: boolean;
  onLoggedOut: () => void;
}

export function Header({ session, oauthConfigured, onLoggedOut }: HeaderProps) {
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
          <Github size={17} strokeWidth={1.8} aria-hidden="true" />
          Open source
        </a>
      </nav>
      {session.status === "authenticated" ? (
        <button className="button button--outline header-action" type="button" onClick={() => void handleLogout()}>
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
          Log out
        </button>
      ) : oauthConfigured === true ? (
        <a className="button button--outline header-action" href="/api/auth/reddit">
          <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
          Connect Reddit account
        </a>
      ) : (
        <div
          className={`header-status ${oauthConfigured === false ? "is-pending" : "is-checking"}`}
          role="status"
          aria-label={oauthConfigured === false ? "Reddit OAuth review pending" : "Checking Reddit OAuth status"}
        >
          {oauthConfigured === false ? (
            <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span>{oauthConfigured === false ? "OAuth review pending" : "Checking access"}</span>
        </div>
      )}
    </header>
  );
}
