import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Scatter,
  CartesianGrid,
} from "recharts";

// ============================================
// LIVE INDICATOR
// ============================================
export const LiveIndicator = ({ isStreaming, lastUpdate }) => {
  return (
    <div className="live-indicator-container">
      <div className={`live-badge ${isStreaming ? "streaming" : "disconnected"}`}>
        <span className="live-dot"></span>
        <span className="live-text">{isStreaming ? "Live" : "Disconnected"}</span>
      </div>
      <span className="last-update">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </span>
    </div>
  );
};

// ============================================
// CONTROL PANEL
// ============================================
export const ControlPanel = ({
  isPaused,
  onPauseResume,
  onReset,
  dataSource = "live",
  onLoadHistory,
  onSwitchToLive,
  historyLoading = false,
}) => {
  return (
    <div className="control-panel">
      <div className="control-group">
        <label>Data Source:</label>
        <div className="data-source-buttons">
          <button
            className={`btn ${dataSource === "live" ? "btn-primary" : "btn-secondary"}`}
            onClick={onSwitchToLive}
            disabled={dataSource === "live"}
          >
            {dataSource === "live" && "● "} Live Stream
          </button>
        </div>
      </div>

      <div className="control-info">
        <span className="info-text">
          {isPaused ? "⏸ Stream paused" : "● Live streaming data"}
        </span>
      </div>
    </div>
  );
};


// ============================================
// PREDICTION PANEL
// ============================================
export const PredictionPanel = ({ prediction, activeFault }) => {
  if (!prediction) return null;

  const severity =
    prediction.severity ||
    (prediction.prediction === "faulty"
      ? prediction.confidence > 0.9
        ? "high"
        : prediction.confidence > 0.7
        ? "medium"
        : "low"
      : "normal");

  const hasF1 =
    prediction.f1Normal !== null ||
    prediction.f1Fault !== null ||
    prediction.f1Macro !== null;

  return (
    <div className={`prediction-panel severity-${severity}`}>
      <div className="card-header">
        <h3>Model Prediction</h3>
        <span className="prediction-timestamp">
          {new Date(prediction.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="prediction-content">
        <div className="prediction-main">
          <div className={`prediction-icon ${prediction.prediction}`}>{prediction.prediction === "faulty"? "⚠️": prediction.finalStatus === "Insufficient Data" ? "⏳" : "✓"}
            
          </div>
          <div className="prediction-text">
            <span className="prediction-label">Status</span>
            <span className={`prediction-status ${prediction.prediction}`}>{prediction.prediction === "faulty"? "Fault Detected" : prediction.finalStatus === "Insufficient Data" ? "Insufficient Data": "Normal Operation"}

            </span>
          </div>
        </div>

        <div className="status-item prediction-detail">
          <span className="label">Backend Status:</span>
          <span className="value">{prediction.finalStatus || "Unknown"}</span>
        </div>

        <div className="status-item prediction-detail">
          <span className="label">Active Fault:</span>
          <span className="value">{activeFault || "None"}</span>
        </div>

        {prediction.faultType && prediction.faultType !== "None" && (
          <div className="fault-type-box">
            <span className="fault-label">Fault Type:</span>
            <span className="fault-value">{prediction.faultType}</span>
          </div>
        )}

        {prediction.healthScore !== null && prediction.healthScore !== undefined && (
          <div className="status-item prediction-detail">
            <span className="label">Health Score:</span>
            <span className="value">{prediction.healthScore.toFixed(1)}%</span>
          </div>
        )}

        {prediction.latestError !== undefined && prediction.threshold !== undefined && (
          <div className="status-item prediction-detail">
            <span className="label">Error / Threshold:</span>
            <span className="value">
              {Number(prediction.latestError).toFixed(3)} / {Number(prediction.threshold).toFixed(3)}
            </span>
          </div>
        )}

        {prediction.latestDegradation !== null && prediction.latestDegradation !== undefined && (
          <div className="status-item prediction-detail">
            <span className="label">Smoothed Degradation:</span>
            <span className="value">{Number(prediction.latestDegradation).toFixed(3)}</span>
          </div>
        )}

        {hasF1 && (
          <div className="prediction-timing-box">
            <div className="detail-row">
              <span>F1 Normal:</span>
              <span>
                {prediction.f1Normal !== null ? Number(prediction.f1Normal).toFixed(3) : "N/A"}
              </span>
            </div>
            <div className="detail-row">
              <span>F1 Fault:</span>
              <span>
                {prediction.f1Fault !== null ? Number(prediction.f1Fault).toFixed(3) : "N/A"}
              </span>
            </div>
            <div className="detail-row">
              <span>F1 Macro:</span>
              <span>
                {prediction.f1Macro !== null ? Number(prediction.f1Macro).toFixed(3) : "N/A"}
              </span>
            </div>
          </div>
        )}

       

        {(prediction.t1_timestamp || prediction.t2_timestamp) && (
          <div className="prediction-timing-box">
            {prediction.t1_timestamp && (
              <div className="detail-row">
                <span>First anomaly:</span>
                <span>{prediction.t1_timestamp}</span>
              </div>
            )}
            {prediction.t2_timestamp && (
              <div className="detail-row">
                <span>Confirmed fault:</span>
                <span>{prediction.t2_timestamp}</span>
              </div>
            )}
          </div>
        )}

        {prediction.prediction === "faulty" && (
          <div className={`severity-indicator severity-${severity}`}>
            <span>Severity: {severity.toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MACHINE HEALTH CARD
// ============================================
export const MachineHealthCard = ({ machine, prediction }) => {  // add prediction prop
  if (!machine) return null;

  // Override status display if insufficient data
  const displayStatus = prediction?.finalStatus === "Insufficient Data"
    ? "Warning"
    : machine.status || "Normal";

  // ... rest of your code ...

  return (
    <div className="machine-health-card">
      <div className="card-header">
        <h3>Machine Health Metrics</h3>
        <div className={`overall-health ${displayStatus.toLowerCase()}`}>
          <span className="health-dot"></span>
          <span>{displayStatus}</span>  {/* ← was machine.status */}
        </div>
      </div>
      {/* ... */}
    </div>
  );
};

// ============================================
// DATA READINESS CARD
// ============================================
export const DataReadinessCard = ({ validationData }) => {
  if (!validationData) return null;

  const ready =
    validationData.enough_for_windows && validationData.enough_for_sequences;

  return (
    <div className={`data-readiness-card ${ready ? "normal" : "warning"}`}>
      <div className="card-header">
        <h3>Inference Data Readiness</h3>
        <div className={`status-badge ${ready ? "normal" : "warning"}`}>
          <span className="status-dot"></span>
          <span>{ready ? "Ready" : "Limited"}</span>
        </div>
      </div>

      <div className="readiness-grid">
        <div className="status-item">
          <span className="label">Rows in processed.csv</span>
          <span className="value">{validationData.rows}</span>
        </div>
        <div className="status-item">
          <span className="label">Windows Created</span>
          <span className="value">{validationData.num_windows}</span>
        </div>
        <div className="status-item">
          <span className="label">Window Size</span>
          <span className="value">{validationData.window_size}</span>
        </div>
        <div className="status-item">
          <span className="label">Sequence Length</span>
          <span className="value">{validationData.seq_len}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STATS PANEL
// ============================================
export const StatsPanel = ({ vibrationData, temperatureData, currentData }) => {
  const calculateStats = (data) => {
    if (!data || data.length === 0) return { avg: 0, max: 0, min: 0 };

    const values = data.map((d) => parseFloat(d.value)).filter((v) => !isNaN(v));
    if (values.length === 0) return { avg: 0, max: 0, min: 0 };

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { avg, max, min };
  };

  const vibStats = calculateStats(vibrationData);
  const tempStats = calculateStats(temperatureData);
  const currStats = calculateStats(currentData);

  return (
    <div className="stats-panel">
      <h3>Rolling Statistics (Time Window)</h3>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span className="stat-icon">📊</span>
            <span className="stat-title">Vibration</span>
          </div>
          <div className="stat-values">
            <div className="stat-row">
              <span className="stat-label">Average:</span>
              <span className="stat-value">{vibStats.avg.toFixed(3)} g</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Maximum:</span>
              <span className="stat-value">{vibStats.max.toFixed(3)} g</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Minimum:</span>
              <span className="stat-value">{vibStats.min.toFixed(3)} g</span>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span className="stat-icon">🌡️</span>
            <span className="stat-title">Temperature</span>
          </div>
          <div className="stat-values">
            <div className="stat-row">
              <span className="stat-label">Average:</span>
              <span className="stat-value">{tempStats.avg.toFixed(1)}°C</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Maximum:</span>
              <span className="stat-value">{tempStats.max.toFixed(1)}°C</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Minimum:</span>
              <span className="stat-value">{tempStats.min.toFixed(1)}°C</span>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-header">
            <span className="stat-icon">⚡</span>
            <span className="stat-title">Current</span>
          </div>
          <div className="stat-values">
            <div className="stat-row">
              <span className="stat-label">Average:</span>
              <span className="stat-value">{currStats.avg.toFixed(1)} A</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Maximum:</span>
              <span className="stat-value">{currStats.max.toFixed(1)} A</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Minimum:</span>
              <span className="stat-value">{currStats.min.toFixed(1)} A</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TELEMETRY CHARTS
// ============================================
export const TelemetryCharts = ({ vibrationData, temperatureData, currentData }) => {
  return (
    <div className="telemetry-section">
      <h3>Live Sensor Telemetry</h3>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h4>Vibration Levels</h4>
            <span className="chart-unit">g (gravitational force)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={vibrationData}>
              <defs>
                <linearGradient id="vibrationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3498db" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7f8c8d" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#7f8c8d" }} domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#3498db" strokeWidth={2} fill="url(#vibrationGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h4>Temperature</h4>
            <span className="chart-unit">°C (Celsius)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={temperatureData}>
              <defs>
                <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a085" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#16a085" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7f8c8d" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#7f8c8d" }} domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#16a085" strokeWidth={2} fill="url(#temperatureGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h4>Current Draw</h4>
            <span className="chart-unit">A (Amperes)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={currentData}>
              <defs>
                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f39c12" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f39c12" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7f8c8d" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#7f8c8d" }} domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                }}
              />
              <Area type="monotone" dataKey="value" stroke="#f39c12" strokeWidth={2} fill="url(#currentGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DEGRADATION CHARTS
// ============================================
export const DegradationCharts = ({ degradationData, prediction }) => {
  if (!degradationData || degradationData.length === 0) return null;

  const anomalyPoints = degradationData.filter((d) => d.anomaly === 1);

  return (
    <div className="telemetry-section">
      <h3>AE Degradation and Fault Detection</h3>

      <div className="charts-grid">
        <div className="chart-card anomaly-card-span">
          <div className="chart-header">
            <h4>Reconstruction Error with Detection Markers</h4>
            <span className="chart-unit">MAE vs time</span>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={degradationData}
              margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="x"
                type="number"
                domain={[0, "dataMax"]}
                ticks={degradationData.map((_, i) => i)}
                tickFormatter={(val) => {
                  const point = degradationData[val];
                  return point?.label ?? val;
                }}
                tick={{ fontSize: 10, fill: "#7f8c8d", angle: -45, textAnchor: "end" }}
                interval={0}
                height={60}
              />

              <YAxis tick={{ fontSize: 11, fill: "#7f8c8d" }} />

              <Tooltip
                labelFormatter={(val) => {
                  const point = degradationData[val];
                  return `Time: ${point?.label ?? val}`;
                }}
              />

              <Legend verticalAlign="top" />

              <Line
                type="monotone"
                dataKey="error"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
                name="Reconstruction Error"
              />

              <Line
                type="monotone"
                dataKey="threshold"
                stroke="#ef4444"
                dot={false}
                strokeWidth={2}
                strokeDasharray="8 4"
                name="Threshold"
              />

              <Scatter
                name="Anomaly Windows"
                data={anomalyPoints}
                fill="#f97316"
              />

              {/* T1 — predicted fault */}
              {prediction?.t1 !== null && prediction?.t1 !== undefined && (
                <ReferenceLine
                  x={prediction.t1}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{
                    value: `T1: ${prediction.t1_timestamp ?? ""} (Predicted Fault)`,
                    position: "insideTopLeft",
                    fontSize: 11,
                    fill: "#f59e0b",
                  }}
                />
              )}

              {/* T2 — actual fault confirmed */}
              {prediction?.t2 !== null && prediction?.t2 !== undefined && (
                <ReferenceLine
                  x={prediction.t2}
                  stroke="#dc2626"
                  strokeWidth={2}
                  label={{
                    value: `T2: ${prediction.t2_timestamp ?? ""} (Actual Fault)`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#dc2626",
                  }}
                />
              )}

            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAINTENANCE BOX
// ============================================
export const MaintenanceBox = ({ machineData, prediction }) => {
  if (!prediction || !machineData) return null;

  const isFaulty = prediction.prediction === "faulty";
  const isInsufficient = prediction.finalStatus === "Insufficient Data";
  const isNormal = prediction.finalStatus === "Normal";

  if (isInsufficient) {
    return (
      <div className="maintenance-box warning">
        <div className="maintenance-icon">ℹ️</div>
        <div className="maintenance-content">
          <h3>Maintenance Status</h3>
          <p>Model inference is limited because the current cloud data window is too short.</p>
          <div className="maintenance-detail">
            <span>Recommended Action: Collect more sensor samples before final fault assessment.</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isFaulty && isNormal) {
    return (
      <div className="maintenance-box normal">
        <div className="maintenance-icon">✓</div>
        <div className="maintenance-content">
          <h3>Maintenance Status</h3>
          <p>Machine operating normally. No immediate maintenance required.</p>
          <div className="maintenance-detail">
            <span>
              Next scheduled maintenance:{" "}
              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-box warning">
      <div className="maintenance-icon">⚠️</div>
      <div className="maintenance-content">
        <h3>Maintenance Recommendation</h3>
        <div className="maintenance-item">
          <p>
            Machine shows signs of <strong>{prediction.faultType || "fault"}</strong>.
          </p>
          <p className="recommendation">
            Recommended Action: Schedule inspection within 24-48 hours.
          </p>
          <div className="maintenance-details">
            <div className="detail-row">
              <span>Severity:</span>
              <span className="severity-badge">
                {prediction.severity
                  ? prediction.severity.toUpperCase()
                  : prediction.confidence > 0.9
                  ? "HIGH"
                  : prediction.confidence > 0.7
                  ? "MEDIUM"
                  : "LOW"}
              </span>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};