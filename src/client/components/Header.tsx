import { Github, LogOut, UserRound } from "lucide-react";
import type { SessionState } from "../types";
import { logout } from "../lib/api";
import { Brand } from "./Brand";

interface HeaderProps {
  session: SessionState;
  onLoggedOut: () => void;
}

export function Header({ session, onLoggedOut }: HeaderProps) {
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
      ) : (
        <a className="button button--outline header-action" href="/api/auth/reddit">
          <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
          Connect Reddit account
        </a>
      )}
    </header>
  );
}
