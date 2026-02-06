import React, { useState } from 'react';
import Modal from './Modal';
import { apiRequest } from '../api/client';

function formatTodayMMDDYYYY(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

interface GenerateHypothesisResponse {
  funnelEntryDate: string;
  epicName: string;
  epicOwner: string;
  elevatorPitch: {
    forCustomers: string;
    who: string;
    theSolution: string;
    isA: string;
    thatProvidesValue: string;
    unlike: string;
    ourSolution: string;
  };
  businessOutcomes: string[];
}

export interface EpicHypothesisData {
  funnelEntryDate: string;
  epicName: string;
  epicOwner: string;
  epicDescription: {
    forCustomers: string;
    whoDoSomething: string;
    theSolution: string;
    isA: string;
    thatProvidesValue: string;
    unlike: string;
    ourSolution: string;
  };
  businessOutcomes: string;
  leadingIndicators: string;
  nfrs: string;
}

const defaultHypothesis: EpicHypothesisData = {
  funnelEntryDate: '',
  epicName: '',
  epicOwner: '',
  epicDescription: {
    forCustomers: '',
    whoDoSomething: '',
    theSolution: '',
    isA: '',
    thatProvidesValue: '',
    unlike: '',
    ourSolution: '',
  },
  businessOutcomes: '',
  leadingIndicators: '',
  nfrs: '',
};

/** Build a single description string from hypothesis data for the work item. */
export function buildEpicDescriptionFromHypothesis(data: EpicHypothesisData): string {
  const lines: string[] = [];
  if (data.funnelEntryDate) {
    lines.push(`Funnel Entry Date: ${data.funnelEntryDate}`);
    lines.push('');
  }
  const d = data.epicDescription;
  if (d.forCustomers || d.whoDoSomething || d.theSolution || d.isA || d.thatProvidesValue || d.unlike || d.ourSolution) {
    lines.push('Epic description (elevator pitch):');
    if (d.forCustomers) lines.push(`For ${d.forCustomers}`);
    if (d.whoDoSomething) lines.push(`who ${d.whoDoSomething}`);
    if (d.theSolution) lines.push(`the ${d.theSolution}`);
    if (d.isA) lines.push(`is a ${d.isA}`);
    if (d.thatProvidesValue) lines.push(`that ${d.thatProvidesValue}`);
    if (d.unlike) lines.push(`unlike ${d.unlike}`);
    if (d.ourSolution) lines.push(`our solution ${d.ourSolution}`);
    lines.push('');
  }
  if (data.businessOutcomes) {
    lines.push('Business Outcomes:');
    lines.push(data.businessOutcomes);
    lines.push('');
  }
  if (data.leadingIndicators) {
    lines.push('Leading Indicators:');
    lines.push(data.leadingIndicators);
    lines.push('');
  }
  if (data.nfrs) {
    lines.push('Nonfunctional Requirements (NFRs):');
    lines.push(data.nfrs);
  }
  return lines.join('\n').trim();
}

interface EpicHypothesisModalProps {
  onClose: () => void;
  onApply: (data: { title: string; description: string; assignee?: string }) => void;
  initialNotes?: string | null;
}

const EpicHypothesisModal: React.FC<EpicHypothesisModalProps> = ({ onClose, onApply, initialNotes }) => {
  const [data, setData] = useState<EpicHypothesisData>(() => ({
    ...defaultHypothesis,
    funnelEntryDate: formatTodayMMDDYYYY(),
  }));
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleApply = () => {
    const title = data.epicName.trim() || 'New Epic';
    const description = buildEpicDescriptionFromHypothesis(data);
    onApply({
      title,
      description,
      assignee: data.epicOwner.trim() || undefined,
    });
    onClose();
  };

  const handleGenerate = async () => {
    setGenerateError(null);
    setGenerating(true);
    const hadEpicOwner = data.epicOwner.trim() !== '';
    const ownerToKeep = data.epicOwner;
    try {
      const res = await apiRequest<GenerateHypothesisResponse>('/.netlify/functions/generate-hypothesis', {
        method: 'POST',
        body: JSON.stringify({
          epicName: data.epicName.trim() || null,
          epicOwner: data.epicOwner.trim() || null,
          notes: initialNotes ?? null,
        }),
      });
      const ep = res.elevatorPitch;
      const businessOutcomesText = Array.isArray(res.businessOutcomes)
        ? res.businessOutcomes.map((o) => `- ${o}`).join('\n')
        : '';
      setData({
        funnelEntryDate: res.funnelEntryDate ?? formatTodayMMDDYYYY(),
        epicName: res.epicName ?? '',
        epicOwner: hadEpicOwner ? ownerToKeep : (res.epicOwner ?? ''),
        epicDescription: {
          forCustomers: ep?.forCustomers ?? '',
          whoDoSomething: ep?.who ?? '',
          theSolution: ep?.theSolution ?? '',
          isA: ep?.isA ?? '',
          thatProvidesValue: ep?.thatProvidesValue ?? '',
          unlike: ep?.unlike ?? '',
          ourSolution: ep?.ourSolution ?? '',
        },
        businessOutcomes: businessOutcomesText,
        leadingIndicators: '',
        nfrs: '',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setGenerateError(msg.includes('not configured') ? 'Configure API to enable.' : `Generation failed: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  };
  const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' };
  const sectionStyle: React.CSSProperties = { marginBottom: '16px' };
  const hintStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', marginTop: '4px' };

  return (
    <Modal title="Epic Hypothesis Statement" onClose={onClose} maxWidth="640px" zIndex={1100}>
      <div style={sectionStyle}>
          <label style={labelStyle}>Funnel Entry Date</label>
          <input
            type="text"
            value={data.funnelEntryDate}
            onChange={(e) => setData({ ...data, funnelEntryDate: e.target.value })}
            placeholder="MM/DD/YYYY"
            style={inputStyle}
          />
          <div style={hintStyle}>The date that the epic entered the funnel.</div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Epic Name</label>
          <input
            type="text"
            value={data.epicName}
            onChange={(e) => setData({ ...data, epicName: e.target.value })}
            placeholder="A short name for the epic"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Epic Owner</label>
          <input
            type="text"
            value={data.epicOwner}
            onChange={(e) => setData({ ...data, epicOwner: e.target.value })}
            placeholder="The name of the epic owner"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '8px 14px',
              border: '1px solid #8b5cf6',
              borderRadius: '6px',
              backgroundColor: '#ede9fe',
              color: '#5b21b6',
              fontSize: '14px',
              fontWeight: '500',
              cursor: generating ? 'wait' : 'pointer',
            }}
          >
            {generating ? 'Generating…' : 'Generate Hypothesis'}
          </button>
          {generateError && (
            <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#b91c1c' }}>
              {generateError}
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Epic Description (elevator pitch)</label>
          <div style={hintStyle}>Value statement: For / who / the / is a / that / unlike / our solution.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              value={data.epicDescription.forCustomers}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, forCustomers: e.target.value } })}
              placeholder="For [customers]"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.whoDoSomething}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, whoDoSomething: e.target.value } })}
              placeholder="who [do something]"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.theSolution}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, theSolution: e.target.value } })}
              placeholder="the [solution]"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.isA}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, isA: e.target.value } })}
              placeholder="is a [something - the 'how']"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.thatProvidesValue}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, thatProvidesValue: e.target.value } })}
              placeholder="that [provides this value]"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.unlike}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, unlike: e.target.value } })}
              placeholder="unlike [competitor, current solution or non-existing solution]"
              style={inputStyle}
            />
            <input
              type="text"
              value={data.epicDescription.ourSolution}
              onChange={(e) => setData({ ...data, epicDescription: { ...data.epicDescription, ourSolution: e.target.value } })}
              placeholder="our solution [does something better — the 'why']"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Business Outcomes</label>
          <textarea
            value={data.businessOutcomes}
            onChange={(e) => setData({ ...data, businessOutcomes: e.target.value })}
            placeholder="The measurable benefits that the business can anticipate if the epic hypothesis is proven to be correct."
            style={textareaStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Leading Indicators</label>
          <textarea
            value={data.leadingIndicators}
            onChange={(e) => setData({ ...data, leadingIndicators: e.target.value })}
            placeholder="Early measures that will help predict the business outcome hypothesis (see Innovation Accounting)."
            style={textareaStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Nonfunctional Requirements (NFRs)</label>
          <textarea
            value={data.nfrs}
            onChange={(e) => setData({ ...data, nfrs: e.target.value })}
            placeholder="Nonfunctional requirements associated with the epic."
            style={textareaStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Apply to Epic
          </button>
        </div>
    </Modal>
  );
};

export default EpicHypothesisModal;
