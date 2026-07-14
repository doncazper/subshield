import { ChevronDown, Clock3, ExternalLink, FileText, Info, Play, ShieldCheck, X } from "lucide-react";
import { Fragment, useState } from "react";
import { scoreSubmission, type ScoredSubmission } from "../../shared/scoring";
import { runScan } from "../lib/api";
import { demoScenarios } from "../lib/demoScenarios";
import type { SessionState } from "../types";

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
  const [selectedScenarioId, setSelectedScenarioId] = useState(demoScenarios[0].id);

  const selectedCommunity = community && communities.includes(community)
    ? community
    : communities[0] ?? "";
  const previewMode = session.status !== "authenticated";
  const selectedScenario = demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? demoScenarios[0];

  const selectDemoScenario = (scenarioId: string) => {
    const scenario = demoScenarios.find((candidate) => candidate.id === scenarioId);
    if (!scenario) return;
    setSelectedScenarioId(scenario.id);
    setResults([]);
    setExpandedId(null);
    setStatus(`Selected ${scenario.label} — local only, 0 Reddit requests`);
  };

  const handleScan = async () => {
    setBusy(true);
    setExpandedId(null);
    try {
      if (session.status !== "authenticated") {
        setResults(selectedScenario.inputs.map(scoreSubmission));
        setStatus(`Local demo completed at ${new Date().toLocaleTimeString()} — ${selectedScenario.inputs.length} synthetic submissions, 0 Reddit requests`);
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
          <div className="demo-source" aria-label="Local demo source">
            <div className="demo-source__summary">
              <FileText size={18} strokeWidth={1.7} aria-hidden="true" />
              <span>
                <small>Demo source</small>
                <strong>{selectedScenario.inputs.length} synthetic submissions</strong>
                <em>{selectedScenario.description}</em>
              </span>
            </div>
            <fieldset className="demo-scenarios">
              <legend>Choose a demo scenario</legend>
              <div className="demo-scenarios__options">
                {demoScenarios.map((scenario) => (
                  <button
                    className="demo-scenario-button"
                    type="button"
                    key={scenario.id}
                    aria-pressed={selectedScenario.id === scenario.id}
                    onClick={() => selectDemoScenario(scenario.id)}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="demo-request-proof" role="status">
              <ShieldCheck size={15} strokeWidth={1.9} aria-hidden="true" />
              <span><strong>Local-only: 0 Reddit requests.</strong> Examples are evaluated in this browser.</span>
            </p>
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
                ? `Run the local demo to evaluate ${selectedScenario.inputs.length} synthetic submissions in this browser.`
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
