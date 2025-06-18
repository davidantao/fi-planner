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
  retirementAge
}) {
  const CAGR = returnRate / 100;
  const FIRE_MULTIPLIER = 25;
  const SEMIFI_MULTIPLIER = 15;

  const annualContribution = income * (savingsRate / 100);
  const fireTarget = expenses * FIRE_MULTIPLIER;
  const semiFiTarget = expenses * SEMIFI_MULTIPLIER;
  const coastTarget = fireTarget / Math.pow(1 + CAGR, retirementAge - age);

  let year = 0;
  let balance = currentSavings;
  const fireData = [];
  const semiFiData = [];
  const coastFiData = [];
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
    age: 25,
    returnRate: 7,
    retirementAge: 65
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
    { label: 'Income', field: 'income', min: 0, max: 300000, step: 1000 },
    { label: 'Savings Rate (%)', field: 'savingsRate', min: 0, max: 100, step: 1 },
    { label: 'Expenses', field: 'expenses', min: 0, max: 200000, step: 1000 },
    { label: 'Current Savings', field: 'currentSavings', min: 0, max: 1000000, step: 1000 },
    { label: 'Age', field: 'age', min: 18, max: 70, step: 1 },
    { label: 'Return Rate (%)', field: 'returnRate', min: 1, max: 15, step: 0.1 },
    { label: 'Retirement Age', field: 'retirementAge', min: 40, max: 75, step: 1 }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: 'auto' }}>
      <h1>📈 FI Planner</h1>
      <p>Estimate your path to FIRE, Semi-FI, or Coast FI</p>

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
        <h3>Targets</h3>
        <ul>
          <li>🔥 FIRE Target: ${fireTarget.toLocaleString()}</li>
          <li>💼 Semi-FI Target: ${semiFiTarget.toLocaleString()}</li>
          <li>🌴 Coast FI Target: ${coastTarget.toLocaleString()} (grow to FIRE by age {inputs.retirementAge})</li>
        </ul>
        <p>🌅 Coast FI Achieved by: {coastYear ? coastYear : 'Not within projection window'}</p>
      </div>
    </div>
  );
}

export default App;
