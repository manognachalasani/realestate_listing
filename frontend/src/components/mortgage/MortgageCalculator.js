import React, { useState, useEffect, useCallback } from 'react';
import './MortgageCalculator.css';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export default function MortgageCalculator({ propertyPrice = 500000 }) {
  const [values, setValues] = useState({
    homePrice: propertyPrice,
    downPayment: Math.round(propertyPrice * 0.2),
    downPaymentPercent: 20,
    interestRate: 7.25,
    loanTerm: 30,
    propertyTax: Math.round((propertyPrice * 0.012) / 12),
    homeInsurance: 150,
    pmi: 0,
    hoa: 0,
  });

  const [results, setResults] = useState(null);

  const calculate = useCallback(() => {
    const { homePrice, downPayment, interestRate, loanTerm, propertyTax, homeInsurance, hoa } = values;
    const loanAmount = homePrice - downPayment;

    if (loanAmount <= 0 || interestRate <= 0) {
      setResults(null); return;
    }

    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const monthlyPrincipalInterest =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const downPct = (downPayment / homePrice) * 100;
    const pmi = downPct < 20 ? (loanAmount * 0.008) / 12 : 0;

    const totalMonthly = monthlyPrincipalInterest + propertyTax + homeInsurance + pmi + hoa;
    const totalPayment = totalMonthly * numPayments;
    const totalInterest = monthlyPrincipalInterest * numPayments - loanAmount;

    setResults({
      monthlyPrincipalInterest,
      totalMonthly,
      totalPayment,
      totalInterest,
      loanAmount,
      pmi,
      breakdown: [
        { label: 'Principal & Interest', value: monthlyPrincipalInterest, color: '#1a2940' },
        { label: 'Property Tax', value: propertyTax, color: '#c9a84c' },
        { label: 'Home Insurance', value: homeInsurance, color: '#4a7c59' },
        { label: 'HOA', value: hoa, color: '#7c6a4a' },
        { label: 'PMI', value: pmi, color: '#9a4a4a' },
      ].filter(b => b.value > 0),
    });
  }, [values]);

  useEffect(() => { calculate(); }, [calculate]);

  // Sync down payment percent <-> amount
  const handleChange = (field, val) => {
    const numVal = parseFloat(val) || 0;
    if (field === 'downPaymentPercent') {
      setValues(v => ({ ...v, downPaymentPercent: numVal, downPayment: Math.round(v.homePrice * numVal / 100) }));
    } else if (field === 'downPayment') {
      setValues(v => ({ ...v, downPayment: numVal, downPaymentPercent: parseFloat(((numVal / v.homePrice) * 100).toFixed(1)) }));
    } else if (field === 'homePrice') {
      setValues(v => ({ ...v, homePrice: numVal, downPayment: Math.round(numVal * v.downPaymentPercent / 100) }));
    } else {
      setValues(v => ({ ...v, [field]: numVal }));
    }
  };

  return (
    <div className="mortgage-calc">
      <div className="calc-header">
        <div className="calc-icon">🏦</div>
        <div>
          <h3>Mortgage Calculator</h3>
          <p>Estimate your monthly repayments</p>
        </div>
      </div>

      <div className="calc-body">
        {/* Inputs */}
        <div className="calc-inputs">
          <div className="calc-field">
            <label>Home Price</label>
            <div className="input-prefix">
              <span>$</span>
              <input type="number" value={values.homePrice} onChange={e => handleChange('homePrice', e.target.value)} min="0" />
            </div>
          </div>

          <div className="calc-field">
            <label>Down Payment</label>
            <div className="down-row">
              <div className="input-prefix">
                <span>$</span>
                <input type="number" value={values.downPayment} onChange={e => handleChange('downPayment', e.target.value)} min="0" />
              </div>
              <div className="input-suffix">
                <input type="number" value={values.downPaymentPercent} onChange={e => handleChange('downPaymentPercent', e.target.value)} min="0" max="100" step="0.5" />
                <span>%</span>
              </div>
            </div>
            {values.downPaymentPercent < 20 && (
              <p className="pmi-note">⚠️ PMI required for down payments under 20%</p>
            )}
          </div>

          <div className="calc-field">
            <label>Interest Rate</label>
            <div className="input-suffix">
              <input type="number" value={values.interestRate} onChange={e => handleChange('interestRate', e.target.value)} min="0" max="30" step="0.125" />
              <span>%</span>
            </div>
          </div>

          <div className="calc-field">
            <label>Loan Term</label>
            <div className="term-tabs">
              {[10, 15, 20, 30].map(yr => (
                <button
                  key={yr}
                  className={`term-tab ${values.loanTerm === yr ? 'active' : ''}`}
                  onClick={() => handleChange('loanTerm', yr)}
                >
                  {yr}yr
                </button>
              ))}
            </div>
          </div>

          <details className="calc-advanced">
            <summary>Advanced Options</summary>
            <div className="advanced-fields">
              <div className="calc-field">
                <label>Monthly Property Tax</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" value={values.propertyTax} onChange={e => handleChange('propertyTax', e.target.value)} min="0" />
                </div>
              </div>
              <div className="calc-field">
                <label>Home Insurance / month</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" value={values.homeInsurance} onChange={e => handleChange('homeInsurance', e.target.value)} min="0" />
                </div>
              </div>
              <div className="calc-field">
                <label>HOA Fees / month</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input type="number" value={values.hoa} onChange={e => handleChange('hoa', e.target.value)} min="0" />
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* Results */}
        {results && (
          <div className="calc-results">
            <div className="monthly-total">
              <span className="monthly-label">Estimated Monthly Payment</span>
              <span className="monthly-amount">{formatCurrency(results.totalMonthly)}</span>
            </div>

            {/* Donut-style bar */}
            <div className="breakdown-bar">
              {results.breakdown.map((item, i) => (
                <div
                  key={i}
                  className="bar-segment"
                  style={{ width: `${(item.value / results.totalMonthly) * 100}%`, background: item.color }}
                  title={`${item.label}: ${formatCurrency(item.value)}`}
                />
              ))}
            </div>

            {/* Breakdown legend */}
            <div className="breakdown-list">
              {results.breakdown.map((item, i) => (
                <div key={i} className="breakdown-item">
                  <div className="breakdown-dot" style={{ background: item.color }} />
                  <span className="breakdown-label">{item.label}</span>
                  <span className="breakdown-value">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="calc-summary">
              <div className="summary-row">
                <span>Loan Amount</span>
                <span>{formatCurrency(results.loanAmount)}</span>
              </div>
              <div className="summary-row">
                <span>Total Interest</span>
                <span>{formatCurrency(results.totalInterest)}</span>
              </div>
              <div className="summary-row total">
                <span>Total Cost ({values.loanTerm} yrs)</span>
                <span>{formatCurrency(results.totalPayment + values.downPayment)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
