import { ArrowLeft, Check, Clock3, Code2, Database, KeyRound, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { loadHealth } from "../lib/api";
import { Brand } from "./Brand";

interface PolicyLayoutProps {
  title: string;
  summary: string;
  children: React.ReactNode;
}

function PolicyLayout({ title, summary, children }: PolicyLayoutProps) {
  return (
    <div className="policy-shell">
      <header className="policy-header">
        <Brand />
        <a href="/"><ArrowLeft size={17} /> Back to SubShield</a>
      </header>
      <main className="policy-main">
        <div className="policy-intro">
          <ShieldCheck size={38} strokeWidth={1.7} aria-hidden="true" />
          <h1>{title}</h1>
          <p>{summary}</p>
          <span>Effective July 12, 2026</span>
        </div>
        <div className="policy-content">{children}</div>
      </main>
      <footer className="policy-footer">
        <span>SubShield is open source and is not affiliated with or endorsed by Reddit.</span>
        <a href="https://github.com/doncazper/subshield" target="_blank" rel="noreferrer"><Code2 size={16} /> View source</a>
      </footer>
    </div>
  );
}

type AccessStatus = "loading" | "pending" | "configured" | "unavailable";

const accessStatusContent: Record<AccessStatus, { title: string; detail: string }> = {
  loading: {
    title: "Checking live access status",
    detail: "Reading the deployment's no-store health endpoint.",
  },
  pending: {
    title: "Reddit account connection unavailable",
    detail: "OAuth credentials are not configured. The public workflow preview uses synthetic examples only.",
  },
  configured: {
    title: "Reddit OAuth configured",
    detail: "Authorized moderators can connect with temporary, read-only OAuth.",
  },
  unavailable: {
    title: "Live status unavailable",
    detail: "The access model and source documentation below remain authoritative.",
  },
};

function LiveAccessStatus() {
  const [status, setStatus] = useState<AccessStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal)
      .then((health) => setStatus(health.configured ? "configured" : "pending"))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("unavailable");
      });
    return () => controller.abort();
  }, []);

  return (
    <div className={`live-access live-access--${status}`} role="status" aria-live="polite">
      <span className="live-access__dot" aria-hidden="true" />
      <span>
        <strong>{accessStatusContent[status].title}</strong>
        {accessStatusContent[status].detail}
      </span>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <PolicyLayout
      title="Privacy and data practices"
      summary="SubShield is designed to minimize access, avoid persistence, and keep every moderation decision in human hands."
    >
      <section id="data-access">
        <h2>Data we access</h2>
        <p>After you explicitly authorize SubShield, it requests only three Reddit OAuth scopes:</p>
        <dl className="scope-list">
          <div><dt>identity</dt><dd>Read your Reddit username so the app can show which account is connected.</dd></div>
          <div><dt>mysubreddits</dt><dd>List only the communities you moderate so you can choose an authorized community.</dd></div>
          <div><dt>read</dt><dd>Read up to 25 recent public submissions from the single community you select for that scan.</dd></div>
        </dl>
        <p>For each selected submission, the scan reads the title, self-text, domain, creation time, identifier, and permalink. It does not read private messages, voting history, saved items, or private account settings.</p>
      </section>

      <section>
        <h2>How the data is used</h2>
        <p>SubShield applies a published, deterministic set of phrase, link, punctuation, and formatting rules to surface configured spam and safety-rule matches. It does not infer sensitive characteristics, build user profiles, calculate subreddit sentiment, train models, or make moderation decisions.</p>
      </section>

      <section>
        <h2>Storage and retention</h2>
        <div className="policy-facts">
          <div><Database size={22} /><strong>Reddit content</strong><span>Never written to a database, object store, file, log, analytics product, or model.</span></div>
          <div><Clock3 size={22} /><strong>Authorization</strong><span>A temporary Reddit access token is held in an encrypted, essential, HttpOnly cookie for at most one hour. No refresh token is requested.</span></div>
          <div><Server size={22} /><strong>Scan response</strong><span>Returned with <code>Cache-Control: no-store</code> and held only in the current browser view until you clear it, navigate away, or close the tab.</span></div>
        </div>
        <p>The OAuth anti-forgery state cookie expires after ten minutes. SubShield does not create user accounts and does not retain Reddit usernames, moderated-community lists, submission content, scan results, or derived scores server-side.</p>
      </section>

      <section>
        <h2>Service providers and transfers</h2>
        <p>Reddit provides the authorized data. Cloudflare hosts the stateless web application and may process standard network and security metadata under its own terms. SubShield does not send Reddit content to Cloudflare storage, advertising services, AI providers, Slack, webhooks, or other third parties.</p>
      </section>

      <section>
        <h2>Your controls and deletion</h2>
        <ul className="check-list">
          <li><Check size={16} /><span>Nothing runs until you click “Run ephemeral scan.”</span></li>
          <li><Check size={16} /><span>“Clear results” removes the current response from the interface.</span></li>
          <li><Check size={16} /><span>Logging out immediately clears the encrypted authorization cookie.</span></li>
          <li><Check size={16} /><span>You can revoke SubShield from your Reddit account’s connected-app settings.</span></li>
        </ul>
        <p>Because SubShield does not maintain an account database or retain Reddit content, there is no server-side content record to delete. Privacy questions or deletion concerns can be filed publicly or privately through the repository’s security contact instructions.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>Material changes to data access or retention will be documented in the public repository and this page before release. Any change requiring additional Reddit permissions will be submitted to Reddit for review before use.</p>
      </section>
    </PolicyLayout>
  );
}

export function TermsPage() {
  return (
    <PolicyLayout
      title="Terms of use"
      summary="These terms explain the narrow, non-commercial preview service offered by SubShield."
    >
      <section>
        <h2>Purpose</h2>
        <p>SubShield is an open-source, read-only review aid for authorized Reddit moderators. It highlights configured signals in recent public submissions from one selected community. It does not replace moderator judgment and does not take actions on Reddit.</p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>You may use SubShield only for legitimate community moderation and safety review in communities you are authorized to moderate. You may not use it for surveillance, harassment, user profiling, sensitive-attribute inference, scraping, archiving, bulk collection, commercial data resale, or model training.</p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <p>You are responsible for verifying every surfaced signal, complying with Reddit’s rules and moderator requirements, and respecting the rights of Reddit users. Risk labels are heuristic prompts, not factual determinations about a user or submission.</p>
      </section>
      <section>
        <h2>Availability and warranties</h2>
        <p>The service is provided as-is, without warranties of uninterrupted availability, accuracy, or fitness for a particular purpose. Access may be limited or discontinued to comply with Reddit policies, legal requirements, or security needs.</p>
      </section>
      <section>
        <h2>Relationship with Reddit</h2>
        <p>SubShield is independent, is not affiliated with or endorsed by Reddit, and is subject to Reddit’s applicable user, developer, API, privacy, and moderation terms.</p>
      </section>
      <section>
        <h2>Contact and changes</h2>
        <p>Questions and responsible disclosures are handled through the public GitHub repository and its security policy. Material changes will be recorded in the repository before they take effect.</p>
      </section>
    </PolicyLayout>
  );
}

export function SecurityPage() {
  return (
    <PolicyLayout
      title="API access and security"
      summary="A technical map of SubShield's exact Reddit access, request boundaries, session controls, and public implementation evidence."
    >
      <section>
        <h2>Live deployment status</h2>
        <LiveAccessStatus />
        <p>
          The deployment reports only configuration state and policy-safe metadata from <code>/api/health</code>. The response is non-cacheable and contains no user or Reddit content.
        </p>
      </section>

      <section>
        <h2>Exact OAuth and API surface</h2>
        <p>SubShield requests temporary authorization and only the following read-only scopes and endpoints:</p>
        <dl className="scope-list">
          <div><dt>identity</dt><dd><code>GET /api/v1/me</code> — display the connected Reddit username.</dd></div>
          <div><dt>mysubreddits</dt><dd><code>GET /subreddits/mine/moderator</code> — list and revalidate communities the user moderates.</dd></div>
          <div><dt>read</dt><dd><code>{"GET /r/{subreddit}/new?limit=25"}</code> — read one selected community's newest public submissions.</dd></div>
        </dl>
        <p>No history, write, vote, submit, report, private-message, or moderator-action scope is requested. OAuth uses <code>duration=temporary</code>; no refresh token is requested.</p>
      </section>

      <section>
        <h2>Request and session boundaries</h2>
        <div className="policy-facts">
          <div><KeyRound size={22} /><strong>Short authorization</strong><span>The access token is encrypted into an essential cookie for at most one hour. OAuth state expires after ten minutes.</span></div>
          <div><Server size={22} /><strong>Bounded requests</strong><span>One moderator-membership recheck and one recent-submission request per user-triggered scan, capped at 25 items.</span></div>
          <div><Database size={22} /><strong>No content store</strong><span>No KV, D1, R2, database, queue, file, analytics event, webhook, or Reddit-content log.</span></div>
        </div>
      </section>

      <section>
        <h2>Data flow</h2>
        <ol className="security-flow">
          <li><strong>1. Authorize</strong><span>A moderator explicitly starts Reddit OAuth.</span></li>
          <li><strong>2. Select</strong><span>The app shows only communities that account moderates.</span></li>
          <li><strong>3. Review</strong><span>One click evaluates up to 25 recent submissions with published deterministic rules.</span></li>
          <li><strong>4. Discard</strong><span>The no-store response remains only in the current browser view and request memory.</span></li>
        </ol>
      </section>

      <section>
        <h2>Controls verified in source</h2>
        <ul className="check-list">
          <li><Check size={16} /><span>Every scan re-checks that the connected account moderates the requested community.</span></li>
          <li><Check size={16} /><span>Scan requests require a same-origin browser request and reject bodies larger than 2 KB.</span></li>
          <li><Check size={16} /><span>Session cookies use AES-GCM plus <code>Secure</code>, <code>HttpOnly</code>, and <code>SameSite=Lax</code>.</span></li>
          <li><Check size={16} /><span>API and session responses use <code>Cache-Control: no-store</code>.</span></li>
          <li><Check size={16} /><span>Error logs include only the request path and error class, never tokens, usernames, community names, content, or scores.</span></li>
        </ul>
        <p className="policy-links">
          <a href="https://github.com/doncazper/subshield/blob/main/src/worker/index.ts" target="_blank" rel="noreferrer"><Code2 size={16} /> Review Worker controls</a>
          <a href="https://github.com/doncazper/subshield/blob/main/src/shared/scoring.ts" target="_blank" rel="noreferrer"><Code2 size={16} /> Review published rules</a>
          <a href="https://github.com/doncazper/subshield/security/advisories/new" target="_blank" rel="noreferrer"><ShieldCheck size={16} /> Report privately</a>
        </p>
      </section>

      <section>
        <h2>Infrastructure and disclosure</h2>
        <p>Cloudflare hosts the stateless Worker and static assets and may process standard network and security metadata. Reddit content is not written to Cloudflare storage or sent to analytics, AI providers, messaging services, or any other third party.</p>
        <p>Security reports use GitHub's private vulnerability-reporting workflow. The public threat model, data inventory, architecture notes, CI results, and release history are maintained in the repository.</p>
      </section>
    </PolicyLayout>
  );
}
