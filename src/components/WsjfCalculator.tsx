import React from 'react';

export interface WsjfValue {
  wsjfBusinessValue?: number | null;
  wsjfTimeCriticality?: number | null;
  wsjfRiskReduction?: number | null;
  wsjfJobSize?: number | null;
}

/** numerator = BV + TC + RR; if Job Size is null/0/NaN then score is null, else score = numerator / Job Size */
export function computeWsjfScore(
  bv: number | null | undefined,
  tc: number | null | undefined,
  rr: number | null | undefined,
  js: number | null | undefined
): number | null {
  const num = (bv ?? 0) + (tc ?? 0) + (rr ?? 0);
  const denom = js;
  if (denom == null || denom === 0 || Number.isNaN(denom)) return null;
  return num / denom;
}

function toNum(val: string): number | null {
  if (val.trim() === '') return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

interface WsjfCalculatorProps {
  value: WsjfValue;
  onChange: (next: WsjfValue) => void;
  readOnly?: boolean;
  /** When true, parent can use this to block save (Job Size 0/empty with other WSJF set). */
  onValidityChange?: (valid: boolean) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '500',
  fontSize: '14px',
};

const WsjfCalculator: React.FC<WsjfCalculatorProps> = ({ value, onChange, readOnly = false, onValidityChange }) => {
  const bv = value.wsjfBusinessValue ?? null;
  const tc = value.wsjfTimeCriticality ?? null;
  const rr = value.wsjfRiskReduction ?? null;
  const js = value.wsjfJobSize ?? null;

  const score = computeWsjfScore(bv, tc, rr, js);

  const anyOtherSet = bv != null && bv !== 0 || tc != null && tc !== 0 || rr != null && rr !== 0;
  const jobSizeInvalid = anyOtherSet && (js == null || js === 0 || Number.isNaN(js));
  React.useEffect(() => {
    onValidityChange?.(!jobSizeInvalid);
  }, [jobSizeInvalid, onValidityChange]);

  const update = (updates: Partial<WsjfValue>) => {
    onChange({ ...value, ...updates });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 12px 0', fontWeight: '600', fontSize: '14px' }}>WSJF Calculator</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Business Value</label>
          <input
            type="number"
            inputMode="decimal"
            value={bv != null ? String(bv) : ''}
            onChange={(e) => update({ wsjfBusinessValue: toNum(e.target.value) })}
            disabled={readOnly}
            style={inputStyle}
            placeholder="1–10"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Relative business value</p>
        </div>
        <div>
          <label style={labelStyle}>Time Criticality</label>
          <input
            type="number"
            inputMode="decimal"
            value={tc != null ? String(tc) : ''}
            onChange={(e) => update({ wsjfTimeCriticality: toNum(e.target.value) })}
            disabled={readOnly}
            style={inputStyle}
            placeholder="1–10"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Time sensitivity</p>
        </div>
        <div>
          <label style={labelStyle}>Risk Reduction / Opportunity Enablement</label>
          <input
            type="number"
            inputMode="decimal"
            value={rr != null ? String(rr) : ''}
            onChange={(e) => update({ wsjfRiskReduction: toNum(e.target.value) })}
            disabled={readOnly}
            style={inputStyle}
            placeholder="1–10"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Risk or opportunity</p>
        </div>
        <div>
          <label style={labelStyle}>Job Size</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={js != null ? String(js) : ''}
            onChange={(e) => update({ wsjfJobSize: toNum(e.target.value) })}
            disabled={readOnly}
            style={inputStyle}
            placeholder="1–10"
          />
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Relative size (denominator)</p>
        </div>
      </div>
      <p style={{ margin: '12px 0 0 0', fontSize: '14px' }}>
        <strong>WSJF Score:</strong> {score == null ? '—' : score.toFixed(2)}
      </p>
      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
        (BV + TC + RR) / Job Size
      </p>
      {jobSizeInvalid && (
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#b91c1c' }}>
          Job Size must be &gt; 0 to compute WSJF.
        </p>
      )}
    </div>
  );
};

export default WsjfCalculator;
