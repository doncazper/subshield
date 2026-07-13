import { HomePage } from "./components/HomePage";
import { PrivacyPage, TermsPage } from "./components/PolicyPage";

export function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  return <HomePage />;
}
