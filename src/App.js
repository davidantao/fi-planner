import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Slider,
  Typography,
  Button,
  Grid,
  TextField,
  CssBaseline,
  Switch,
  FormControlLabel,
  createTheme,
  ThemeProvider
} from '@mui/material';
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
  const yieldShieldRate = 0.04;

  const fireTargetBase = expenses * ((1 - Math.pow(1 + realCAGR, -FIRE_HORIZON)) / realCAGR);
  const semiFiTarget = 0.6 * fireTargetBase;
  const coastTarget = fireTargetBase / Math.pow(1 + realCAGR, retirementAge - age);
  const cashCushionTarget = (expenses - (semiFiTarget * yieldShieldRate)) * 5;
  const fireTarget = fireTargetBase + cashCushionTarget;

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
    const currYear = age + year;
    fireData.push({ year: currYear, balance: fireBalance });
    semiFiData.push({ year: currYear, balance: semiFiBalance });
    coastFiData.push({ year: currYear, balance: coastFiBalance });

    if (!coastAchieved && coastFiBalance >= coastTarget) coastAchieved = year;
    if (fireFinishedAt === undefined && fireBalance >= fireTarget) fireFinishedAt = year;
    if (semiFiFinishedAt === undefined && semiFiBalance >= semiFiTarget) semiFiFinishedAt = year;

    if (fireFinishedAt !== undefined && semiFiFinishedAt !== undefined && coastAchieved !== false) break;

    fireBalance = (fireBalance + annualContribution) * (1 + realCAGR);
    if (semiFiBalance < semiFiTarget) semiFiBalance = (semiFiBalance + annualContribution) * (1 + realCAGR);
    else semiFiBalance = semiFiBalance * (1 + realCAGR);
    if (!coastAchieved) coastFiBalance = (coastFiBalance + annualContribution) * (1 + realCAGR);
    else coastFiBalance = coastFiBalance * (1 + realCAGR);

    year++;
  }

  fireData.finishedAt = fireFinishedAt;
  semiFiData.finishedAt = semiFiFinishedAt;

  return {
    fireData,
    semiFiData,
    coastFiData,
    fireTarget,
    fireTargetBase,
    semiFiTarget,
    coastTarget,
    coastYear: coastAchieved !== false ? age + coastAchieved : null,
    cashCushionTarget,
    realCAGR
  };
}

function App() {
  const defaultInputs = {
    income: 65000,
    savingsRate: 40,
    expenses: 40000,
    currentSavings: 0,
    age: 25,
    returnRate: 8,
    retirementAge: 50,
    inflationRate: 2
  };
  const [inputs, setInputs] = useState(defaultInputs);
  const [darkMode, setDarkMode] = useState(true);

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        background: {
          default: darkMode ? '#1d1d1d' : '#fafafa',
          paper: darkMode ? '#272727' : '#fff'
        },
        text: {
          primary: darkMode ? '#e0e0e0' : '#000',
          secondary: darkMode ? '#aaa' : '#555'
        }
      }
    }),
    [darkMode]
  );

  const handleSliderChange = (field) => (_, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field) => (e) => {
    setInputs((prev) => ({ ...prev, [field]: +e.target.value }));
  };

  const handleReset = () => setInputs(defaultInputs);

  const {
    fireData,
    semiFiData,
    coastFiData,
    fireTarget,
    fireTargetBase,
    semiFiTarget,
    coastTarget,
    coastYear,
    cashCushionTarget,
    realCAGR
  } = useMemo(() => calculateGrowth(inputs), [inputs]);

  const chartData = fireData.map((_, i) => ({
    year: fireData[i].year,
    FIRE: fireData[i].balance,
    SemiFI: semiFiData[i].balance,
    CoastFI: coastFiData[i].balance
  }));

  const handleDownload = () => {
    const chart = document.getElementById('chart-container');
    if (!chart) return;
    toPng(chart).then((dataUrl) => download(dataUrl, 'fi-chart.png')).catch(console.error);
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ padding: '2rem', maxWidth: 900, margin: 'auto' }}>
        <h1>📈 FI Planner</h1>
        <p>Estimate your path to FIRE, Semi-FI, or Coast FI (inflation-adjusted)</p>

        <Grid container spacing={2}>
          {sliders.map(({ label, field, min, max, step }) => (
            <Grid item xs={12} sm={6} key={field}>
              <Typography gutterBottom>{label}: {inputs[field]}</Typography>
              <Slider
                value={inputs[field]}
                onChange={handleSliderChange(field)}
                min={min}
                max={max}
                step={step}
                valueLabelDisplay="auto"
              />
              <TextField
                type="number"
                value={inputs[field]}
                onChange={handleInputChange(field)}
                fullWidth
              />
            </Grid>
          ))}
        </Grid>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <Button onClick={handleReset}>🔁 Reset</Button>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
            label="Dark Mode"
          />
        </div>

        <div id="chart-container" style={{ margin: '2rem 0' }}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
              <XAxis dataKey="year" stroke={darkMode ? '#aaa' : '#333'} />
              <YAxis stroke={darkMode ? '#aaa' : '#333'} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#333' : '#fff',
                  borderColor: darkMode ? '#555' : '#ccc',
                  color: darkMode ? '#eee' : '#000'
                }}
                formatter={(v) => `$${Math.round(v).toLocaleString()}`}
              />
              <Legend />
              <ReferenceLine y={fireTarget} stroke="#8884d8" strokeDasharray="3 3" label="FIRE Target" />
              <ReferenceLine y={semiFiTarget} stroke="#82ca9d" strokeDasharray="3 3" label="Semi-FI Target" />
              <ReferenceLine y={coastTarget} stroke="#ffc658" strokeDasharray="3 3" label="CoastFI Target" />
              <Line type="monotone" dataKey="FIRE" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="SemiFI" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="CoastFI" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Button variant="contained" onClick={handleDownload}>📥 Download Chart as PNG</Button>

      <div style={{ marginTop: '2rem' }}>
        <h3>💡 Definitions</h3>
        <p><strong>FIRE (Financial Independence, Retire Early):</strong> Enough savings to fully cover your expenses in retirement. Now includes a 5-year cash cushion for market downturns.</p>
        <p><strong>Semi-FI:</strong> When your portfolio can cover 60% of retirement expenses.</p>
        <p><strong>Coast FI:</strong> When you've saved enough that your portfolio will grow to full FIRE by retirement, even without more contributions.</p>
        <p><strong>Cash Cushion:</strong> A 5-year cash reserve to help you avoid selling your investments when the market is down. Most crashes recover in 2 years, but some take longer — like in 2008. This cushion helps you ride out even the worst economic downturns. Formula: <code>(expenses − (portfolio × yield shield rate) × 5)</code></p>
        <p><strong>Yield Shield:</strong> An early-retirement strategy where you temporarily shift your portfolio toward high-yielding assets to avoid selling investments, ideally yielding 4%. This is only recommended for the first 5 years of retirement.</p>

        <h3>🎯 Targets (inflation-adjusted)</h3>
        <p><strong>FIRE Target (with cushion):</strong> ${fireTarget.toLocaleString()}</p>
        <p><strong>FIRE Target (portfolio only):</strong> ${fireTargetBase.toLocaleString()}</p>
        <p><strong>Semi-FI Target:</strong> ${semiFiTarget.toLocaleString()}</p>
        <p><strong>Coast FI Target:</strong> ${coastTarget.toLocaleString()}</p>
        <p><strong>Cash Cushion:</strong> ${cashCushionTarget.toLocaleString()}</p>

        <h3 style={{ marginTop: '2rem' }}>📅 Estimated Achievement</h3>
        <p><strong>Full FI with Cash Cushion Achieved by:</strong> {fireData.finishedAt !== undefined ? inputs.age + fireData.finishedAt : 'Not within projection window'}</p>
        <p><strong>Full FI Portfolio Only Achieved by:</strong> {
    (() => {
      const baseOnlyYear = fireData.find(d => d.balance >= fireTargetBase)?.year;
      return baseOnlyYear ? baseOnlyYear : 'Not within projection window';
    })()
  }</p>
        <p><strong>Semi-FI Achieved by:</strong> {semiFiData.finishedAt !== undefined ? inputs.age + semiFiData.finishedAt : 'Not within projection window'}</p>
        <p><strong>Coast FI Achieved by:</strong> {coastYear !== null ? coastYear : 'Not within projection window'}</p>
      
        <h3 style={{ marginTop: '2rem' }}>🧠 Good-To-Know's</h3>
        <p><strong>What is a realistic rate of return?: </strong>For the S&P-500, 95%+ of all 15-year rolling periods delivered <strong>8%</strong> or more, and 90%+ of all 20-year rolling periods delivered <strong>9%</strong> or more annually when invested monthly.</p>
        <p><strong>What adjustments can I make?: </strong>Increasing your savings rate dramatically increases your compounding potential and chances of retiring early.</p>
        <p><strong>How do I compare to others?: </strong>Less than 3% of Americans retire by 50 — most work until 65 or later. The average US life expectancy is 77 - retiring early gives you extra years, potentially decades to enjoy life on your own terms.</p>
      </div>
    </div>
    </ThemeProvider>
  );
}

export default App;
