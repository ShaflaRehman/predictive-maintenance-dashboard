// components/analytics-components.jsx
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ============================================
// HISTORY TABLE
// ============================================
export const HistoryTable = ({ data }) => {
  return (
    <div className="history-table-container">
      <h3>Fault History ({data.length} records)</h3>
      <div className="table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Bearing</th>
              <th>Fault Detected</th>
              <th>Fault Type</th>
              <th>Confidence</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((fault) => (
              <tr key={fault.id}>
                <td>{fault.timestamp}</td>
                <td>{fault.bearing}</td>
                <td>
                  <span className="fault-detected-badge">
                    {fault.faultType !== 'None' ? '✓ Yes' : '✗ No'}
                  </span>
                </td>
                <td>{fault.faultType}</td>
                <td>
                  <span className="confidence-badge">{fault.confidence}%</span>
                </td>
                <td>
                  <span className={`severity-badge ${fault.severity.toLowerCase()}`}>
                    {fault.severity}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${fault.resolved ? "resolved" : "active"}`}>
                    {fault.resolved ? "Resolved" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// FAULT TYPE CHART
// ============================================
export const FaultTypeChart = ({ data }) => {
  if (!data) return null;

  const chartData = [
    { name: "Outer Race", value: data.outerRace, color: "#e74c3c" },
    { name: "Inner Race", value: data.innerRace, color: "#f39c12" },
    { name: "Ball Fault", value: data.ball, color: "#e67e22" },
    { name: "Normal", value: data.normal, color: "#2ecc71" },
  ];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ============================================
// FAULT TIMELINE
// ============================================
export const FaultTimeline = ({ data }) => {
  // Group faults by date
  const groupByDate = data.reduce((acc, fault) => {
    const date = fault.timestamp.split(' ')[0]; // Get date part
    if (!acc[date]) {
      acc[date] = {
        date,
        outerRace: 0,
        innerRace: 0,
        ball: 0,
        total: 0,
      };
    }
    
    if (fault.faultType === 'Outer Race') acc[date].outerRace++;
    if (fault.faultType === 'Inner Race') acc[date].innerRace++;
    if (fault.faultType === 'Ball Fault') acc[date].ball++;
    acc[date].total++;
    
    return acc;
  }, {});

  const timelineData = Object.values(groupByDate).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="chart-container">
      <h3>📅 Fault Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={timelineData}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="outerRace" name="Outer Race" fill="#e74c3c" stackId="a" />
          <Bar dataKey="innerRace" name="Inner Race" fill="#f39c12" stackId="a" />
          <Bar dataKey="ball" name="Ball Fault" fill="#e67e22" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// CONFIDENCE OVER TIME CHART
// ============================================
export const ConfidenceChart = ({ data }) => {
  const confidenceData = data
    .map(fault => ({
      time: fault.timestamp,
      confidence: fault.confidence,
      bearing: fault.bearing,
    }))
    .slice(-20); // Last 20 predictions

  return (
    <div className="chart-container">
      <h3>📊 Confidence Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={confidenceData}>
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="confidence"
            stroke="#3498db"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================
// DATE RANGE PICKER
// ============================================
export const DateRangePicker = ({ onChange }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleApply = () => {
    onChange(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    onChange(null, null);
  };

  return (
    <div className="date-range-picker">
      <div className="date-input-group">
        <label>Start Date:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="date-input-group">
        <label>End Date:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <button className="btn-apply" onClick={handleApply}>
        Apply
      </button>
      <button className="btn-reset" onClick={handleReset}>
        Reset
      </button>
    </div>
  );
};