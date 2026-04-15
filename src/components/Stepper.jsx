import React from 'react';

/**
 * Stepper Component
 * Visualizes chronological steps in a process.
 */
function Stepper({ steps, currentStep }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={i} className={`step-item ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
          <div className="step-circle">{i < currentStep ? '' : i + 1}</div>
          <span className="step-label">{s}</span>
          {i < steps.length - 1 && <div className={`step-line ${i < currentStep ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

export default Stepper;
