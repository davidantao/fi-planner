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
import { Slider, Typography, Button } from '@mui/material';
import { toPng } from 'html-to-image';
import download from 'downloadjs';

function calculateGrowth({
  income,
  savingsRate,
  expenses,
  currentSavings,
  age,
  returnRate,
  retirementAge,
  inflationRate
}) {
  const CAGR = returnRate / 100;
  const INFLATION = inflationRate / 100;
  const realCAGR = ((1 + CAGR) / (1 + INFLATION)) - 1;

  const FIRE_HORIZON = 90 - retirementAge;
  const annualContribution = income * (savingsRate / 100);

  const fireTarget = expenses * ((1 - Math.pow(1 + realCAGR, -FIRE_HORIZON)) / realCAGR);
  const semiFiTarget = 0.6 * expenses * ((1 - Math.pow(1 + realCAGR, -FIRE_HORIZON)) / realCAGR);
  const coastTarget = fireTarget / Math.pow(1 + realCAGR, retirementAge - age);

  let year = 0;
  let fireBalance = currentSavings;
  let semiFiBalance = currentSavings;
  let coastFiBalance = currentSavings;

  const fireData = [];
  const semiFiData = [];
  const coastFiData = [];

  let coastAchieved = false;
  let fireFinishedAt = undefined;
  let semiFiFinishedAt = undefined;

  while (year < 100) {
    fireData.push({ year: age + year, balance: fireBalance });
    semiFiData.push({ year: age + year, balance: semiFiBalance });
    coastFiData.push({ year: age + year, balance: coastFiBalance });

    if (!coastAchieved && coastFiBalance >= coastTarget) coastAchieved = year;
    if (fireFinishedAt === undefined && fireBalance >= fireTarget) fireFinishedAt = year;
    if (semiFiFinishedAt === undefined && semiFiBalance >= semiFiTarget) semiFiFinishedAt = year;

    if (fireFinishedAt !== undefined && semiFiFinishedAt !== undefined && coastAchieved !== false) break;

    fireBalance = (fireBalance + annualContribution) * (1 + realCAGR);

    if (semiFiBalance < semiFiTarget) {
      semiFiBalance = (semiFiBalance + annualContribution) * (1 + realCAGR);
    } else {
      semiFiBalance = semiFiBalance * (1 + realCAGR);
    }

    coastFiBalance = coastFiBalance * (1 + realCAGR);
    year++;
  }

  fireData.finishedAt = fireFinishedAt;
  semiFiData.finishedAt = semiFiFinishedAt;

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
    age: 25,
    returnRate: 7,
    retirementAge: 65,
    inflationRate: 2 // %
  });

  const handleSliderChange = (field) => (_, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
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

  const handleDownload = () => {
    const chart = document.getElementById('chart-container');
    if (!chart) return;

    toPng(chart)
      .then((dataUrl) => {
        download(dataUrl, 'fi-chart.png');
      })
      .catch((err) => {
        console.error('Failed to export chart:', err);
      });
  };

  const sliders = [
    { label: 'Post-Tax Income', field: 'income', min: 0, max: 300000, step: 1000 },
    { label: 'Savings Rate (%)', field: 'savingsRate', min: 0, max: 100, step: 1 },
    { label: 'Annual Expenses', field: 'expenses', min: 0, max: 200000, step: 1000 },
    { label: 'Current Portfolio', field: 'currentSavings', min: 0, max: 1000000, step: 1000 },
    { label: 'Age', field: 'age', min: 18, max: 70, step: 1 },
    { label: 'Return Rate (%)', field: 'returnRate', min: 1, max: 15, step: 0.1 },
    { label: 'Retirement Age', field: 'retirementAge', min: 40, max: 75, step: 1 },
    { label: 'Inflation Rate (%)', field: 'inflationRate', min: 0, max: 10, step: 0.1 }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: 'auto' }}>
      <h1>📈 FI Planner</h1>
      <p>Estimate your path to FIRE, Semi-FI, or Coast FI (inflation-adjusted)</p>

      <div style={{ marginBottom: '2rem' }}>
        {sliders.map(({ label, field, min, max, step }) => (
          <div key={field} style={{ marginBottom: '1rem' }}>
            <Typography gutterBottom>
              {label}: {inputs[field]}
            </Typography>
            <Slider
              value={inputs[field]}
              onChange={handleSliderChange(field)}
              min={min}
              max={max}
              step={step}
              valueLabelDisplay="auto"
            />
          </div>
        ))}
      </div>

      <div id="chart-container" style={{ marginBottom: '1rem' }}>
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
      </div>

      <Button variant="contained" onClick={handleDownload}>
        📥 Download Chart as PNG
      </Button>

      <div style={{ marginTop: '2rem' }}>
        <h3>💡 Definitions</h3>
        <p><strong>FIRE (Financial Independence, Retire Early):</strong> Enough savings to fully cover your expenses during retirement, adjusted for inflation, assuming you live to age 90.</p>
        <p><strong>Semi-FI:</strong> Partial financial independence where your investments cover 60% of your inflation-adjusted expenses in retirement.</p>
        <p><strong>Coast FI:</strong> The point where you've saved enough that, even without further contributions, your investments will grow to your inflation-adjusted FIRE goal by your retirement age.</p>

        <h3 style={{ marginTop: '2rem' }}>🎯 Targets (inflation-adjusted)</h3>
        <p><strong>FIRE Target:</strong> ${fireTarget.toLocaleString()}</p>
        <p><strong>Semi-FI Target:</strong> ${semiFiTarget.toLocaleString()}</p>
        <p><strong>Coast FI Target:</strong> ${coastTarget.toLocaleString()}</p>

        <h3 style={{ marginTop: '2rem' }}>📅 Estimated Achievement</h3>
        <p><strong>Full FI Achieved by:</strong> {fireData.finishedAt !== undefined ? inputs.age + fireData.finishedAt : 'Not within projection window'}</p>
        <p><strong>Semi-FI Achieved by:</strong> {semiFiData.finishedAt !== undefined ? inputs.age + semiFiData.finishedAt : 'Not within projection window'}</p>
        <p><strong>Coast FI Achieved by:</strong> {coastYear !== null ? coastYear : 'Not within projection window'}</p>
      </div>
    </div>
  );
}

export default App;
