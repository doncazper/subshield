import { ArrowLeft, Check, Clock3, Database, Github, Server, ShieldCheck } from "lucide-react";
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
        <a href="https://github.com/doncazper/subshield" target="_blank" rel="noreferrer"><Github size={16} /> View source</a>
      </footer>
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
        <p>SubShield applies a published, deterministic set of phrase, link, punctuation, and formatting rules to surface possible spam and high-risk language. It does not infer sensitive characteristics, build user profiles, calculate subreddit sentiment, train models, or make moderation decisions.</p>
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
          <li><Check size={16} /> Nothing runs until you click “Run ephemeral scan.”</li>
          <li><Check size={16} /> “Clear results” removes the current response from the interface.</li>
          <li><Check size={16} /> Logging out immediately clears the encrypted authorization cookie.</li>
          <li><Check size={16} /> You can revoke SubShield from your Reddit account’s connected-app settings.</li>
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
