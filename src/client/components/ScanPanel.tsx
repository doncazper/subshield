import { ChevronDown, Clock3, ExternalLink, FileText, Info, Play, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
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
    title: "Help with a configuration issue",
    selfText: "I’m stuck on a permission error and would appreciate guidance.",
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

function RiskTag({ level }: { level: ScoredSubmission["spam"]["level"] }) {
  return <span className={`risk risk--${level}`}>{level[0].toUpperCase() + level.slice(1)}</span>;
}

interface ScanPanelProps {
  session: SessionState;
}

export function ScanPanel({ session }: ScanPanelProps) {
  const communities = session.status === "authenticated" ? session.communities : [];
  const [community, setCommunity] = useState(communities[0] ?? "");
  const [results, setResults] = useState<ScoredSubmission[]>(syntheticResults);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Synthetic preview — no Reddit data");
  const [busy, setBusy] = useState(false);

  const selectedCommunity = useMemo(() => {
    if (community && communities.includes(community)) return community;
    return communities[0] ?? "";
  }, [communities, community]);

  const handleScan = async () => {
    setBusy(true);
    setExpandedId(null);
    try {
      if (session.status !== "authenticated") {
        setResults(syntheticInputs.map(scoreSubmission));
        setStatus(`Local preview completed at ${new Date().toLocaleTimeString()}`);
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
          <p className="eyeline">{session.status === "authenticated" ? `Connected as u/${session.username}` : "Interactive local preview"}</p>
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
        <label className="field-label" htmlFor="community">
          Choose a community
          <span className="select-wrap">
            <select
              id="community"
              value={selectedCommunity}
              onChange={(event) => setCommunity(event.target.value)}
              disabled={session.status !== "authenticated" || communities.length === 0}
            >
              {session.status !== "authenticated" ? <option>Synthetic preview</option> : null}
              {session.status === "authenticated" && communities.length === 0 ? <option>No moderated communities found</option> : null}
              {communities.map((name) => (
                <option key={name} value={name}>
                  r/{name}
                </option>
              ))}
            </select>
            <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
        </label>
        <button
          className="button button--primary scan-button"
          type="button"
          onClick={() => void handleScan()}
          disabled={busy || (session.status === "authenticated" && !selectedCommunity)}
        >
          <Play size={19} fill="none" strokeWidth={1.9} aria-hidden="true" />
          {busy ? "Scanning in memory…" : "Run ephemeral scan"}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Submission</th>
              <th>
                Spam signals <Info size={14} aria-label="Rules-based promotional and link patterns" />
              </th>
              <th>
                Language risk <Info size={14} aria-label="Rules-based threatening and hostile phrase patterns" />
              </th>
              <th>Review</th>
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
                  <td><RiskTag level={result.spam.level} /></td>
                  <td><RiskTag level={result.language.level} /></td>
                  <td>
                    <button
                      className="review-button"
                      type="button"
                      aria-expanded={expandedId === result.id}
                      onClick={() => setExpandedId((current) => (current === result.id ? null : result.id))}
                    >
                      Review
                    </button>
                  </td>
                </tr>
                {expandedId === result.id ? (
                  <tr className="detail-row">
                    <td colSpan={4}>
                      <div className="signal-detail">
                        <div>
                          <strong>Spam signals</strong>
                          <span>{result.spam.reasons.join(" · ") || "No configured signals matched"}</span>
                        </div>
                        <div>
                          <strong>Language risk</strong>
                          <span>{result.language.reasons.join(" · ") || "No configured signals matched"}</span>
                        </div>
                        {result.permalink ? (
                          <a href={`https://www.reddit.com${result.permalink}`} target="_blank" rel="noreferrer">
                            Open on Reddit <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {results.length === 0 ? <p className="empty-state">Results cleared. Run a scan when you are ready.</p> : null}
      </div>

      <div className="scan-footer" aria-live="polite">
        <span>{status}</span>
        {results.length > 0 ? (
          <button className="text-button" type="button" onClick={() => { setResults([]); setStatus("Results cleared from this browser view"); }}>
            <X size={15} strokeWidth={1.8} aria-hidden="true" />
            Clear results
          </button>
        ) : null}
      </div>
    </section>
  );
}
