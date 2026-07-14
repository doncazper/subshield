import { HomePage } from "./components/HomePage";
import { PrivacyPage, SecurityPage, TermsPage } from "./components/PolicyPage";

export function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/security") return <SecurityPage />;
  if (path === "/terms") return <TermsPage />;
  return <HomePage />;
}
