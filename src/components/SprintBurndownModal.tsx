import React, { useMemo } from 'react';
import Modal from './Modal';

export interface SprintBurndownModalProps {
  totalStoryPoints: number;
  sprintDays: number;
  /** Points completed each day; length should be sprintDays. Day 1 = index 0. */
  actualDailyCompletedPoints?: number[];
  onClose: () => void;
}

function buildIdealRemaining(totalStoryPoints: number, sprintDays: number): number[] {
  if (sprintDays <= 0) return [];
  if (sprintDays === 1) return [0];
  const result: number[] = [];
  for (let day = 1; day <= sprintDays; day++) {
    const v = totalStoryPoints * (1 - (day - 1) / (sprintDays - 1));
    result.push(Math.max(0, v));
  }
  return result;
}

function buildActualRemaining(
  totalStoryPoints: number,
  sprintDays: number,
  actualDailyCompletedPoints: number[]
): number[] {
  const result: number[] = [totalStoryPoints];
  for (let day = 1; day < sprintDays; day++) {
    const completed = actualDailyCompletedPoints[day - 1] ?? 0;
    const next = Math.max(0, result[result.length - 1] - completed);
    result.push(next);
  }
  return result;
}

const PAD = { left: 48, right: 24, top: 24, bottom: 40 };
const AXIS_COLOR = '#6b7280';
const IDEAL_COLOR = '#3b82f6';
const ACTUAL_COLOR = '#059669';

const SprintBurndownModal: React.FC<SprintBurndownModalProps> = ({
  totalStoryPoints,
  sprintDays,
  actualDailyCompletedPoints,
  onClose,
}) => {
  const hasActual = useMemo(
    () =>
      Array.isArray(actualDailyCompletedPoints) &&
      actualDailyCompletedPoints.length >= sprintDays &&
      actualDailyCompletedPoints.some((p) => p > 0),
    [actualDailyCompletedPoints, sprintDays]
  );

  const { idealRemaining, actualRemaining, chartWidth, chartHeight, scaleX, scaleY } = useMemo(() => {
    const idealRemaining = buildIdealRemaining(totalStoryPoints, sprintDays);
    const actualRemaining =
      hasActual && actualDailyCompletedPoints
        ? buildActualRemaining(totalStoryPoints, sprintDays, actualDailyCompletedPoints)
        : null;

    const width = 320;
    const height = 220;
    const chartWidth = width - PAD.left - PAD.right;
    const chartHeight = height - PAD.top - PAD.bottom;

    const maxY = Math.max(totalStoryPoints, 1);
    const scaleX = (dayIndex: number) =>
      PAD.left + (dayIndex / Math.max(sprintDays - 1, 1)) * chartWidth;
    const scaleY = (points: number) =>
      PAD.top + chartHeight - (points / maxY) * chartHeight;

    return {
      idealRemaining,
      actualRemaining,
      chartWidth,
      chartHeight,
      scaleX,
      scaleY,
      maxY,
    };
  }, [totalStoryPoints, sprintDays, hasActual, actualDailyCompletedPoints]);

  const idealPath = useMemo(() => {
    if (idealRemaining.length === 0) return '';
    const points = idealRemaining.map((y, i) => {
      const x = scaleX(i);
      const sy = scaleY(y);
      return `${x},${sy}`;
    });
    return `M ${points.join(' L ')}`;
  }, [idealRemaining, scaleX, scaleY]);

  const actualPath = useMemo(() => {
    if (!actualRemaining || actualRemaining.length === 0) return '';
    const points = actualRemaining.map((y, i) => {
      const x = scaleX(i);
      const sy = scaleY(y);
      return `${x},${sy}`;
    });
    return `M ${points.join(' L ')}`;
  }, [actualRemaining, scaleX, scaleY]);

  const yTicks = useMemo(() => {
    const maxY = Math.max(totalStoryPoints, 1);
    const step = maxY <= 10 ? 2 : maxY <= 30 ? 5 : 10;
    const ticks: number[] = [];
    for (let v = 0; v <= maxY; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY);
    return ticks;
  }, [totalStoryPoints]);

  return (
    <Modal title="Sprint Burndown" onClose={onClose} maxWidth="420px">
      {sprintDays <= 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No sprint selected.</p>
        ) : (
          <>
            {!hasActual && (
              <p
                style={{
                  marginBottom: '12px',
                  color: '#6b7280',
                  fontSize: '13px',
                }}
              >
                No actual burn data yet
              </p>
            )}
            <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
              <svg
                width="100%"
                height="240"
                viewBox={`0 0 392 240`}
                preserveAspectRatio="xMidYMid meet"
                style={{ minWidth: '320px' }}
              >
                {/* Y-axis label */}
                <text
                  x={14}
                  y={PAD.top + chartHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(-90, 14, ${PAD.top + chartHeight / 2})`}
                  fill={AXIS_COLOR}
                  fontSize="12"
                >
                  Story Points Remaining
                </text>
                {/* X-axis label */}
                <text
                  x={PAD.left + chartWidth / 2}
                  y={240 - 8}
                  textAnchor="middle"
                  fill={AXIS_COLOR}
                  fontSize="12"
                >
                  Day
                </text>
                {/* Y ticks */}
                {yTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      y1={scaleY(tick)}
                      x2={PAD.left + chartWidth}
                      y2={scaleY(tick)}
                      stroke="#e5e7eb"
                      strokeDasharray="2,2"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 6}
                      y={scaleY(tick)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill={AXIS_COLOR}
                      fontSize="10"
                    >
                      {tick}
                    </text>
                  </g>
                ))}
                {/* X ticks (Day 1 ... Day N) */}
                {idealRemaining.length > 0 &&
                  [1, Math.ceil(sprintDays / 2), sprintDays].filter((d, i, a) => a.indexOf(d) === i).map((day) => (
                    <text
                      key={day}
                      x={scaleX(day - 1)}
                      y={PAD.top + chartHeight + 14}
                      textAnchor="middle"
                      fill={AXIS_COLOR}
                      fontSize="10"
                    >
                      Day {day}
                    </text>
                  ))}
                {/* Ideal line */}
                <path
                  d={idealPath}
                  fill="none"
                  stroke={IDEAL_COLOR}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Actual line */}
                {actualPath && (
                  <path
                    d={actualPath}
                    fill="none"
                    stroke={ACTUAL_COLOR}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '3px',
                    backgroundColor: IDEAL_COLOR,
                    borderRadius: 1,
                  }}
                />
                Ideal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '3px',
                    backgroundColor: ACTUAL_COLOR,
                    borderRadius: 1,
                  }}
                />
                Actual
              </span>
            </div>
          </>
        )}
    </Modal>
  );
};

export default SprintBurndownModal;
