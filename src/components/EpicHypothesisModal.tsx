import React, { useState } from 'react';
import { X } from 'lucide-react';

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
}

const EpicHypothesisModal: React.FC<EpicHypothesisModalProps> = ({ onClose, onApply }) => {
  const [data, setData] = useState<EpicHypothesisData>(defaultHypothesis);

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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Epic Hypothesis Statement</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Funnel Entry Date</label>
          <input
            type="date"
            value={data.funnelEntryDate}
            onChange={(e) => setData({ ...data, funnelEntryDate: e.target.value })}
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
      </div>
    </div>
  );
};

export default EpicHypothesisModal;
