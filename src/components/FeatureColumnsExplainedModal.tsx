import React from 'react';
import Modal from './Modal';

export interface FeatureColumnsExplainedModalProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    title: '1. Funnel (Ideation)',
    body: 'Features originate here, often from Epic splitting, customer feedback, or stakeholder requests.',
    bullets: [
      'Definition: Features are defined with a short phrase, a benefit hypothesis (value proposition), and acceptance criteria.',
      'Goal: To capture ideas with minimal overhead.',
    ],
  },
  {
    title: '2. Analyzing (Refinement)',
    body: 'Product Management and System/Solution Architects analyze the feature in this stage.',
    bullets: [
      'Refinement: The feature is analyzed to determine if it is small enough to fit within a PI, and its acceptance criteria are refined.',
      'Estimating: Initial estimation of effort takes place.',
      'Prioritization: The Weighted Shortest Job First (WSJF) technique is used to rank features based on cost of delay and job size.',
    ],
  },
  {
    title: '3. Program Backlog',
    body: 'Prioritized features await the next Program Increment (PI) Planning session.',
    bullets: [
      'Definition of Ready: Features must meet the Definition of Ready to be pulled into planning.',
      'Refinement: Further breakdown into user stories may begin here.',
    ],
  },
  {
    title: '4. Implementing',
    body: 'During PI Planning, teams select high-priority features from the backlog and plan them.',
    bullets: [
      'Splitting: Features are broken down into user stories that fit into iterations (usually 2-week timeboxes).',
      'Development: Agile teams develop the functionality within the PI.',
    ],
  },
  {
    title: '5. Validating (System Demo)',
    body: 'The feature is tested and validated to ensure it meets the acceptance criteria.',
    bullets: [
      'System Demo: The working feature is demonstrated at the end of every iteration.',
      'Built-in Quality: Testing ensures the feature meets both functional and non-functional requirements (NFRs).',
    ],
  },
  {
    title: '6. Deploying (to Production)',
    body: 'The feature is deployed into the production environment.',
    bullets: [
      'Continuous Delivery Pipeline: SAFe uses a Continuous Delivery Pipeline to make this process continuous rather than a one-time event.',
    ],
  },
  {
    title: '7. Releasing (Value Delivery)',
    body: 'The feature is released to the end user.',
    bullets: [
      'Release on Demand: The business decides when to release the feature to maximize value.',
    ],
  },
];

const FeatureColumnsExplainedModal: React.FC<FeatureColumnsExplainedModalProps> = ({ onClose }) => (
  <Modal title="Columns Explained" onClose={onClose} maxWidth="560px">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#111827',
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#374151',
                  lineHeight: 1.5,
                }}
              >
                {section.body}
              </p>
              {section.bullets.length > 0 && (
                <ul
                  style={{
                    margin: '8px 0 0 0',
                    paddingLeft: '20px',
                    fontSize: '14px',
                    color: '#4b5563',
                    lineHeight: 1.6,
                  }}
                >
                  {section.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
    </div>
  </Modal>
);

export default FeatureColumnsExplainedModal;
