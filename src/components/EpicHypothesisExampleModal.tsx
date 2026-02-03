import React from 'react';
import Modal from './Modal';

interface EpicHypothesisExampleModalProps {
  onClose: () => void;
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: '#374151' };
const sectionStyle: React.CSSProperties = { marginBottom: '16px' };
const blockStyle: React.CSSProperties = { fontSize: '14px', color: '#374151', lineHeight: 1.5, margin: 0 };
const listStyle: React.CSSProperties = { margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: '#374151', lineHeight: 1.6 };

const EpicHypothesisExampleModal: React.FC<EpicHypothesisExampleModalProps> = ({ onClose }) => (
  <Modal title="Hypothesis Example" onClose={onClose} maxWidth="640px" zIndex={1100}>
    <div style={sectionStyle}>
        <span style={labelStyle}>Epic Name</span>
        <p style={blockStyle}>Unified Billing Experience Across Products</p>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Epic description (elevator pitch)</span>
        <div style={{ marginTop: '8px' }}>
          <p style={blockStyle}><strong>For [Target Customers]:</strong> Our enterprise customers who use multiple SaaS products.</p>
          <p style={blockStyle}><strong>Who [Do Something]:</strong> Are currently forced to manage invoices across three separate portals, resulting in confusion and delayed payments.</p>
          <p style={blockStyle}><strong>The [Solution]:</strong> Is a unified billing dashboard integrated into the main account portal.</p>
          <p style={blockStyle}><strong>That [Provides Value]:</strong> Enables centralized viewing, payment, and reporting.</p>
          <p style={blockStyle}><strong>Unlike [Alternatives]:</strong> The current, disconnected, product-specific billing systems.</p>
          <p style={blockStyle}><strong>Our Solution [Why]:</strong> Will reduce billing-related support calls by 30% and improve customer satisfaction scores (CSAT) by 15% within six months.</p>
        </div>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Business Outcomes (Lagging Indicators)</span>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>These measure the ultimate success of the initiative, looking at the results 3–6 months post-launch.</p>
        <ul style={listStyle}>
          <li><strong>Reduce Billing Support Volume:</strong> Reduce the volume of &quot;billing issue&quot; support tickets by 30% within six months.</li>
          <li><strong>Increase Customer Satisfaction (CSAT):</strong> Increase the CSAT score related to the invoice and payment process by 15% within six months.</li>
          <li><strong>Improve Cash Flow (DSO):</strong> Decrease Days Sales Outstanding (DSO) by 10% by reducing confusion and payment bottlenecks.</li>
          <li><strong>Improve Renewal Rate:</strong> Increase net retention rate by 5% for enterprise customers using multiple products.</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Leading Indicators (Predictive Metrics)</span>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Early indicators that the epic is on track, measurable during development or immediately after.</p>
        <ul style={listStyle}>
          <li><strong>Alpha/Beta Usage:</strong> 80% of identified enterprise customers in the beta program successfully link all three products to the new dashboard.</li>
          <li><strong>Task Success Rate:</strong> Users complete the &quot;pay all invoices&quot; workflow in under 2 minutes (compared to &gt;5 minutes in the old system).</li>
          <li><strong>Data Integrity Check:</strong> 0% variance in invoice amounts between the old separate systems and the new consolidated database before launch.</li>
          <li><strong>API Reliability:</strong> 99.9% uptime for the API endpoints feeding data from the legacy products to the new unified dashboard.</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Nonfunctional Requirements (NFRs)</span>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>How the system must perform and operate to meet quality and security standards.</p>
        <ul style={listStyle}>
          <li><strong>Availability/Reliability:</strong> The billing portal must have 99.99% (&quot;four nines&quot;) uptime during peak billing cycles to avoid revenue loss.</li>
          <li><strong>Security &amp; Compliance (Critical):</strong> The system must be fully PCI-DSS compliant and adhere to AICPA SOC 2 Type II standards.</li>
          <li><strong>Data Accuracy:</strong> Zero-error tolerance for transactional data; financial data must be updated in real-time or near real-time (within 5 seconds).</li>
          <li><strong>Performance/Latency:</strong> The dashboard must load invoice data in &lt;1 second for up to 10,000 line items.</li>
          <li><strong>Usability:</strong> A user must be able to download all monthly invoices as a consolidated PDF in 3 clicks or less.</li>
          <li><strong>Scalability:</strong> The system must handle a 300% increase in monthly invoices without degradation in performance.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
          Close
        </button>
      </div>
  </Modal>
);

export default EpicHypothesisExampleModal;
