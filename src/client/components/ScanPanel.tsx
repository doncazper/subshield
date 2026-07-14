import { ChevronDown, Clock3, ExternalLink, FileText, Info, Play, X } from "lucide-react";
import { Fragment, useState } from "react";
import { scoreSubmission, type ScoredSubmission, type SubmissionInput } from "../../shared/scoring";
import { runScan } from "../lib/api";
import type { SessionState } from "../types";

const syntheticInputs: SubmissionInput[] = [
  {
    id: "preview-1",
    title: "Quick question about a build error",
    selfText: "I keep seeing this error after upgrading. What should I check?",
    domain: "self",
    permalink: "",
    createdUtc: 0,
  },
  {
    id: "preview-2",
    title: "Limited time offer you can’t miss!!!!",
    selfText: "Act now. Message me for details and guaranteed income.",
    domain: "tinyurl.com",
    permalink: "",
    createdUtc: 0,
  },
  {
    id: "preview-3",
    title: "Check out this community resource",
    selfText: "A reference guide that may answer common setup questions.",
    domain: "example.org",
    permalink: "",
    createdUtc: 0,
  },
  {
    id: "preview-4",
    title: "Stop posting bad advice",
    selfText: "You're an idiot. Shut up and stop posting.",
    domain: "self",
    permalink: "",
    createdUtc: 0,
  },
  {
    id: "preview-5",
    title: "Earn cash fast today",
    selfText: "Risk free profit. Send crypto now for guaranteed income.",
    domain: "bit.ly",
    permalink: "",
    createdUtc: 0,
  },
];

const syntheticResults = syntheticInputs.map(scoreSubmission);

function SignalTag({ signal }: { signal: ScoredSubmission["spam"] }) {
  const matchCount = signal.reasons.length;
  const label = matchCount === 0 ? "No matches" : `${matchCount} matched`;
  const level = matchCount === 0 ? "clear" : signal.level;

  return (
    <span className={`risk risk--${level}`} aria-label={`${matchCount} configured rules matched`}>
      {label}
    </span>
  );
}

function SignalDetails({ result }: { result: ScoredSubmission }) {
  return (
    <div className="signal-detail">
      <div>
        <strong>Spam rule matches</strong>
        <span>{result.spam.reasons.join(" · ") || "No configured rules matched"}</span>
      </div>
      <div>
        <strong>Safety rule matches</strong>
        <span>{result.language.reasons.join(" · ") || "No configured rules matched"}</span>
      </div>
      {result.permalink ? (
        <a href={`https://www.reddit.com${result.permalink}`} target="_blank" rel="noreferrer">
          Review on Reddit <ExternalLink size={14} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

interface ScanPanelProps {
  session: SessionState;
}

export function ScanPanel({ session }: ScanPanelProps) {
  const communities = session.status === "authenticated" ? session.communities : [];
  const [community, setCommunity] = useState(communities[0] ?? "");
  const [results, setResults] = useState<ScoredSubmission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready — nothing has been processed");
  const [busy, setBusy] = useState(false);

  const selectedCommunity = community && communities.includes(community)
    ? community
    : communities[0] ?? "";
  const previewMode = session.status !== "authenticated";

  const handleScan = async () => {
    setBusy(true);
    setExpandedId(null);
    try {
      if (session.status !== "authenticated") {
        setResults(syntheticResults);
        setStatus(`Local demo completed at ${new Date().toLocaleTimeString()} — no Reddit data used`);
        return;
      }
      if (!selectedCommunity) throw new Error("Choose a community first");
      const response = await runScan(selectedCommunity);
      setResults(response.results);
      setStatus(`Scanned ${response.results.length} recent submissions; response is not stored`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="scan-panel" id="scan" aria-labelledby="scan-title">
      <div className="scan-panel__heading">
        <div>
          <h2 id="scan-title">On-demand community scan</h2>
          <p className="eyeline">{session.status === "authenticated" ? `Connected as u/${session.username}` : "Interactive local demo · synthetic data only"}</p>
        </div>
        <div className="scan-panel__quiet">
          <Clock3 size={22} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <strong>Nothing runs</strong>
            until you ask
          </span>
        </div>
      </div>

      <div className="scan-controls">
        {previewMode ? (
          <div className="demo-source" role="status" aria-label="Local demo source">
            <FileText size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>
              <small>Demo source</small>
              <strong>Five synthetic submissions</strong>
              <em>No Reddit connection or content</em>
            </span>
          </div>
        ) : (
          <label className="field-label" htmlFor="community">
            Choose a community
            <span className="select-wrap">
              <select
                id="community"
                value={selectedCommunity}
                onChange={(event) => setCommunity(event.target.value)}
                disabled={communities.length === 0}
              >
                {communities.length === 0 ? <option>No moderated communities found</option> : null}
                {communities.map((name) => (
                  <option key={name} value={name}>
                    r/{name}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </label>
        )}
        <button
          className="button button--primary scan-button"
          type="button"
          onClick={() => void handleScan()}
          disabled={busy || (session.status === "authenticated" && !selectedCommunity)}
        >
          <Play size={19} fill="none" strokeWidth={1.9} aria-hidden="true" />
          {busy ? "Scanning in memory…" : previewMode ? "Run local demo scan" : "Run ephemeral scan"}
        </button>
      </div>

      <div className="table-wrap">
        {results.length > 0 ? (
          <>
            <table className="results-table">
            <thead>
              <tr>
                <th>Submission</th>
                <th>
                  Spam rule matches <Info size={14} aria-label="Published promotional, link, and formatting rules" />
                </th>
                <th>
                  Safety rule matches <Info size={14} aria-label="Published threatening and hostile phrase rules" />
                </th>
                <th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <Fragment key={result.id}>
                  <tr className={expandedId === result.id ? "is-expanded" : undefined}>
                    <td>
                      <span className="submission-title">
                        <FileText size={17} strokeWidth={1.7} aria-hidden="true" />
                        <span>{result.title}</span>
                      </span>
                    </td>
                    <td><SignalTag signal={result.spam} /></td>
                    <td><SignalTag signal={result.language} /></td>
                    <td>
                      <button
                        className="review-button"
                        type="button"
                        aria-expanded={expandedId === result.id}
                        aria-label={`${expandedId === result.id ? "Hide" : "View"} rules for ${result.title}`}
                        onClick={() => setExpandedId((current) => (current === result.id ? null : result.id))}
                      >
                        {expandedId === result.id ? "Hide rules" : "View rules"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === result.id ? (
                    <tr className="detail-row">
                      <td colSpan={4}>
                        <SignalDetails result={result} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
            </table>
            <div className="result-cards">
              {results.map((result) => (
                <article className={`result-card${expandedId === result.id ? " is-expanded" : ""}`} key={result.id}>
                  <header>
                    <FileText size={17} strokeWidth={1.7} aria-hidden="true" />
                    <strong>{result.title}</strong>
                  </header>
                  <div className="result-card__signals">
                    <div><span>Spam rules</span><SignalTag signal={result.spam} /></div>
                    <div><span>Safety rules</span><SignalTag signal={result.language} /></div>
                  </div>
                  <button
                    className="review-button"
                    type="button"
                    aria-expanded={expandedId === result.id}
                    aria-label={`${expandedId === result.id ? "Hide" : "View"} rules for ${result.title}`}
                    onClick={() => setExpandedId((current) => (current === result.id ? null : result.id))}
                  >
                    {expandedId === result.id ? "Hide rules" : "View rules"}
                  </button>
                  {expandedId === result.id ? <SignalDetails result={result} /> : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
            <strong>Nothing processed yet</strong>
            <span>
              {previewMode
                ? "Run the local demo to evaluate five synthetic submissions in this browser."
                : "Choose one community and run a scan when you are ready."}
            </span>
          </div>
        )}
      </div>

      <div className="scan-footer" aria-live="polite">
        <span>{status}</span>
        {results.length > 0 ? (
          <button className="text-button" type="button" onClick={() => { setResults([]); setExpandedId(null); setStatus("Results cleared from this browser view"); }}>
            <X size={15} strokeWidth={1.8} aria-hidden="true" />
            Clear results
          </button>
        ) : null}
      </div>
    </section>
  );
}
