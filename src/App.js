// App.js
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CAGR = 0.07;
const FIRE_MULTIPLIER = 25;
const SEMIFI_MULTIPLIER = 15;
const COAST_RETIREMENT_AGE = 65;

function calculateGrowth({
  income,
  savingsRate,
  expenses,
  currentSavings,
  age
}) {
  const annualContribution = income * (savingsRate / 100);
  const fireTarget = expenses * FIRE_MULTIPLIER;
  const semiFiTarget = expenses * SEMIFI_MULTIPLIER;

  let year = 0;
  let balance = currentSavings;
  const fireData = [];
  const semiFiData = [];
  const coastFiData = [];

  // Coast FI target (future value of FIRE target at 65)
  const coastTarget = fireTarget / Math.pow(1 + CAGR, COAST_RETIREMENT_AGE - age);
  let coastAchieved = false;

  while (year < 100) {
    fireData.push({ year: age + year, balance });
    semiFiData.push({ year: age + year, balance });
    coastFiData.push({ year: age + year, balance });

    if (!coastAchieved && balance >= coastTarget) coastAchieved = year;
    if (balance >= fireTarget && !fireData.finishedAt) fireData.finishedAt = year;
    if (balance >= semiFiTarget && !semiFiData.finishedAt) semiFiData.finishedAt = year;

    if (fireData.finishedAt && semiFiData.finishedAt && coastAchieved !== false) break;

    balance = (balance + annualContribution) * (1 + CAGR);
    year++;
  }

  return {
    fireData,
    semiFiData,
    coastFiData,
    fireTarget,
    semiFiTarget,
    coastTarget,
    coastYear: coastAchieved !== false ? age + coastAchieved : null
  };
}

function App() {
  const [inputs, setInputs] = useState({
    income: 60000,
    savingsRate: 20,
    expenses: 30000,
    currentSavings: 10000,
    age: 25
  });

  const handleChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: Number(e.target.value) });
  };

  const {
    fireData,
    semiFiData,
    coastFiData,
    fireTarget,
    semiFiTarget,
    coastTarget,
    coastYear
  } = calculateGrowth(inputs);

  const chartData = fireData.map((_, i) => ({
    year: fireData[i].year,
    FIRE: fireData[i].balance,
    SemiFI: semiFiData[i].balance,
    CoastFI: coastFiData[i].balance
  }));

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: 'auto' }}>
      <h1>📈 FI Planner</h1>
      <p>Estimate your path to FIRE, Semi-FI, or Coast FI</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {['income', 'savingsRate', 'expenses', 'currentSavings', 'age'].map((field) => (
          <div key={field}>
            <label>
              {field.charAt(0).toUpperCase() + field.slice(1)}:
              <input
                type="number"
                name={field}
                value={inputs[field]}
                onChange={handleChange}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </label>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
          <Legend />
          <Line type="monotone" dataKey="FIRE" stroke="#8884d8" strokeWidth={2} />
          <Line type="monotone" dataKey="SemiFI" stroke="#82ca9d" strokeWidth={2} />
          <Line type="monotone" dataKey="CoastFI" stroke="#ffc658" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '2rem' }}>
        <h3>Targets</h3>
        <ul>
          <li>🔥 FIRE Target: ${fireTarget.toLocaleString()}</li>
          <li>💼 Semi-FI Target: ${semiFiTarget.toLocaleString()}</li>
          <li>🌴 Coast FI Target: ${coastTarget.toLocaleString()} (grow to FIRE by age 65)</li>
        </ul>
        <p>🌅 Coast FI Achieved by: {coastYear ? coastYear : 'Not within projection window'}</p>
      </div>
    </div>
  );
}

export default App;
