"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const suggestions = [
  "What needs my attention today?",
  "How is MyCoLivingPM performing?",
  "Have Claude audit DigiiState.",
];

interface CommandResult {
  response: string;
  state: 'RECEIVED' | 'PLANNING' | 'EXECUTING' | 'VERIFYING' | 'COMPLETE' | 'BLOCKED' | 'FOUNDER_REQUIRED';
  authority: 'GREEN' | 'YELLOW' | 'RED';
  founder_escalation: string | null;
  next_step: string | null;
  accessible_business_scope: string[];
}

export function AICommand() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      console.log("[AI COMMAND] Submitting to /api/ai...");
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to execute command: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const authorityColor = {
    GREEN: 'good',
    YELLOW: 'warn',
    RED: 'risk'
  };

  const stateClass = (state: string) => {
    if (state === 'COMPLETE') return 'active';
    if (['BLOCKED', 'FOUNDER_REQUIRED'].includes(state)) return 'watch';
    return 'build';
  };

  return (
    <aside className="aiPanel" id="command">
      <div className="aiHeader">
        <span className="aiOrb">AI</span>
        <div>
          <strong>Executive AI</strong>
          <small>Portfolio command layer</small>
        </div>
      </div>

      <form className="commandForm" onSubmit={submit} style={{ marginTop: '16px' }}>
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Ask StewardHQ…" 
          rows={3} 
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {error && (
        <div className="errorNotice" style={{ marginTop: '12px' }}>
          {error}
        </div>
      )}

      {result ? (
        <div className="commandResult" style={{ marginTop: '20px' }}>
          <div className="aiResponse" style={{ padding: '0 0 16px 0', minHeight: 'auto' }}>
            {result.response}
          </div>

          <div style={{ display: 'grid', gap: '12px', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8290a5', fontWeight: 800, letterSpacing: '.05em' }}>STATE</span>
              <span className={`statusPill ${stateClass(result.state)}`}>
                {result.state}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8290a5', fontWeight: 800, letterSpacing: '.05em' }}>AUTHORITY</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`statusDot ${authorityColor[result.authority]}`} />
                <strong style={{ color: 'white' }}>{result.authority}</strong>
              </div>
            </div>

            {result.next_step && (
              <div>
                <span style={{ color: '#8290a5', fontWeight: 800, letterSpacing: '.05em', display: 'block', marginBottom: '4px' }}>NEXT STEP</span>
                <p style={{ margin: 0, color: '#c8d2df', lineHeight: 1.5 }}>{result.next_step}</p>
              </div>
            )}

            {result.accessible_business_scope.length > 0 && (
              <div>
                <span style={{ color: '#8290a5', fontWeight: 800, letterSpacing: '.05em', display: 'block', marginBottom: '4px' }}>SCOPE</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.accessible_business_scope.map(s => (
                    <span key={s} style={{ background: 'rgba(255,255,255,.06)', color: '#c8d2df', padding: '3px 7px', borderRadius: '6px', fontSize: '10px' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.founder_escalation && (
              <div className="configNotice" style={{ margin: '8px 0 0 0', background: 'rgba(184,138,50,.1)', borderColor: 'rgba(184,138,50,.2)', color: '#e2bf73', fontSize: '11px' }}>
                <strong>Founder Required:</strong> {result.founder_escalation}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="aiResponse">
            Ask across the entire portfolio. The router will choose OpenAI, Claude, Accio, or a combination.
          </div>
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
