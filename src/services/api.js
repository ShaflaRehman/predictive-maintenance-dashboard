import {
  vibrationData as mockVibrationData,
  temperatureData as mockTemperatureData,
  currentData as mockCurrentData,
  faultHistory as mockFaultHistory,
  faultStats as mockFaultStats,
} from "../data/mockData";

// ==============================
// ENDPOINTS
// ==============================
const TELEMETRY_URL =
  "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetry";
const TELEMETRY_HISTORY_URL =
  "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetryHistory";

const INFERENCE_BASE_URL =
  import.meta.env.VITE_INFERENCE_API_URL || "http://localhost:8000";

const INFERENCE_PREDICT_URL = `${INFERENCE_BASE_URL}/predict`;
const INFERENCE_HEALTH_URL = `${INFERENCE_BASE_URL}/health`;
const INFERENCE_VALIDATE_URL = `${INFERENCE_BASE_URL}/validate`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==============================
// HELPERS
// ==============================
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const rms3 = (ax, ay, az) =>
  Math.sqrt(safeNum(ax) ** 2 + safeNum(ay) ** 2 + safeNum(az) ** 2);

const getRowTemperature = (row) => {
  if (
    row?.temperature !== undefined &&
    row?.temperature !== null &&
    row?.temperature !== ""
  ) {
    return safeNum(row.temperature);
  }
  return safeNum(row?.temp);
};

const healthScoreFromInference = (inf) => {
  if (
    typeof inf?.latest_error === "number" &&
    typeof inf?.threshold === "number" &&
    inf.threshold > 0
  ) {
    return Math.max(0, +(100 * (1 - inf.latest_error / inf.threshold)).toFixed(2));
  }

  if (typeof inf?.health_score === "number") {
    return inf.health_score;
  }

  return null;
};

const severityFromInference = (inf) => {
  if (!inf) return "normal";

  if (inf.final_status === "Fault") {
    if ((inf.latest_error ?? 0) > (inf.threshold ?? 0) * 1.5) return "high";
    if ((inf.latest_error ?? 0) > (inf.threshold ?? 0) * 1.15) return "medium";
    return "low";
  }

  if (inf.t1 !== null && inf.t1 !== undefined) return "medium";
  return "normal";
};

const statusFromInference = (inf) => {
  if (!inf) return "Normal";
  if (inf.final_status === "Fault") return "Critical";
  if (inf.final_status === "Insufficient Data") return "Warning";
  if (inf.t1 !== null && inf.t1 !== undefined) return "Warning";
  return "Normal";
};

const confidenceFromInference = (inf) => {
  const health = healthScoreFromInference(inf);

  if (health !== null) {
    if (inf?.final_status === "Fault") {
      return Math.min(0.99, Math.max(0.75, 1 - health / 100));
    }
    return Math.min(0.99, Math.max(0.7, health / 100));
  }

  if (
    typeof inf?.latest_error === "number" &&
    typeof inf?.threshold === "number" &&
    inf.threshold > 0
  ) {
    const ratio = inf.latest_error / inf.threshold;
    if (inf.final_status === "Fault") {
      return Math.min(0.99, Math.max(0.75, ratio / 2));
    }
    return Math.max(0.6, 1 - Math.min(ratio, 1) * 0.4);
  }

  return inf?.final_status === "Fault" ? 0.9 : 0.85;
};

const buildMaintenanceMessage = (inf) => {
  if (!inf) {
    return {
      title: "Monitoring State Unknown",
      action: "Check inference service connection.",
    };
  }

  if (inf.final_status === "Insufficient Data") {
    return {
      title: "Insufficient Data",
      action: "Collect more samples before performing full model inference.",
    };
  }

  if (inf.final_status === "Fault") {
    return {
      title: `Detected ${inf.fault_type || "Fault"}`,
      action: "Schedule inspection within 24-48 hours.",
    };
  }

  if (inf.t1 !== null && inf.t1 !== undefined) {
    return {
      title: "Early Degradation Detected",
      action: "Continue close monitoring and inspect if error trend rises further.",
    };
  }

  return {
    title: "Normal Operation",
    action: "No immediate maintenance required.",
  };
};

// ==============================
// MAPPERS
// ==============================
export const mapInferenceToSystemStatus = (inf) => {
  const status = statusFromInference(inf);

  return {
    overallStatus: status,
    activeFault: inf?.fault_type || null,
    modelConfidence: Math.round(confidenceFromInference(inf) * 100),
    lastUpdated: new Date().toISOString(),
    lastInspection: new Date().toISOString().slice(0, 10),
    maintenance: buildMaintenanceMessage(inf),
  };
};

export const mapInferenceToPrediction = (inf) => {
  const prediction = inf?.final_status === "Fault" ? "faulty" : "normal";

  return {
    timestamp: new Date().toISOString(),
    prediction,
    faultType: inf?.fault_type || null,
    confidence: confidenceFromInference(inf),
    severity: severityFromInference(inf),
    finalStatus: inf?.final_status || "Unknown",
    threshold: safeNum(inf?.threshold, 0),
    latestError: safeNum(inf?.latest_error, 0),
    latestDegradation:
      typeof inf?.latest_degradation === "number" ? inf.latest_degradation : null,
    t1: inf?.t1 ?? null,
    t2: inf?.t2 ?? null,
    t1_timestamp: inf?.t1_timestamp ?? null,
    t2_timestamp: inf?.t2_timestamp ?? null,
    healthScore: healthScoreFromInference(inf),
    f1Normal: typeof inf?.f1_normal === "number" ? inf.f1_normal : null,
    f1Fault: typeof inf?.f1_fault === "number" ? inf.f1_fault : null,
    f1Macro: typeof inf?.f1_macro === "number" ? inf.f1_macro : null,
  };
};

export const mapInferenceToDegradationData = (inf) => {
  const errors = Array.isArray(inf?.errors) ? inf.errors : [];
  const preds = Array.isArray(inf?.predictions) ? inf.predictions : [];
  const windowTimestamps = Array.isArray(inf?.window_timestamps)
    ? inf.window_timestamps
    : [];
  const threshold = safeNum(inf?.threshold, 0);
  const smooth = Array.isArray(inf?.degradation_curve)
    ? inf.degradation_curve
    : [];

  return errors.map((err, index) => {
    const healthScore =
      threshold > 0 ? Math.max(0, 100 * (1 - err / threshold)) : 0;

    return {
      index,
      x: windowTimestamps[index] ?? index,
      error: safeNum(err, 0),
      threshold,
      anomaly: preds[index] === 1 ? 1 : 0,
      healthScore: +healthScore.toFixed(2),
      smoothError: safeNum(smooth[index], safeNum(err, 0)),
      marker:
        index === inf?.t2
          ? "confirmed"
          : index === inf?.t1
          ? "first"
          : preds[index] === 1
          ? "anomaly"
          : "normal",
    };
  });
};

export const mapTelemetryFromInference = (inf) => {
  const ax = Array.isArray(inf?.ax) ? inf.ax : [];
  const ay = Array.isArray(inf?.ay) ? inf.ay : [];
  const az = Array.isArray(inf?.az) ? inf.az : [];
  const current = Array.isArray(inf?.current) ? inf.current : [];
  const temp = Array.isArray(inf?.temp) ? inf.temp : [];
  const ts = Array.isArray(inf?.ts) ? inf.ts : [];

  return ax.map((_, i) => ({
    index: i,
    ax: safeNum(ax[i]),
    ay: safeNum(ay[i]),
    az: safeNum(az[i]),
    vibration: +rms3(ax[i], ay[i], az[i]).toFixed(3),
    current: safeNum(current[i]),
    temperature: safeNum(temp[i]),
    temp: safeNum(temp[i]),
    timestamp: ts[i] || `${i}`,
    time: ts[i] || `${i}`,
  }));
};

// ==============================
// SYSTEM / INFERENCE
// ==============================
export const getFullInference = async () => {
  const response = await fetch(INFERENCE_PREDICT_URL);
  if (!response.ok) throw new Error("Failed to fetch inference results");
  return await response.json();
};

export const getSystemStatus = async () => {
  try {
    const data = await getFullInference();
    return mapInferenceToSystemStatus(data);
  } catch (error) {
    console.error("System Status API Error:", error);
    return {
      overallStatus: "Warning",
      activeFault: null,
      modelConfidence: 0,
      lastUpdated: new Date().toISOString(),
      lastInspection: new Date().toISOString().slice(0, 10),
      maintenance: {
        title: "Inference Unavailable",
        action: "Check backend connection.",
      },
    };
  }
};

export const getInferenceResults = async () => {
  return await getFullInference();
};

export const getPredictions = async () => {
  try {
    const data = await getFullInference();
    return mapInferenceToPrediction(data);
  } catch (error) {
    console.error("Prediction API Error:", error);
    return {
      timestamp: new Date().toISOString(),
      prediction: "normal",
      faultType: null,
      confidence: 0,
      severity: "normal",
      finalStatus: "Unavailable",
      threshold: 0,
      latestError: 0,
      latestDegradation: null,
      t1: null,
      t2: null,
      t1_timestamp: null,
      t2_timestamp: null,
      healthScore: null,
      f1Normal: null,
      f1Fault: null,
      f1Macro: null,
    };
  }
};

export const getDegradationData = async () => {
  try {
    const inf = await getFullInference();
    return {
      raw: inf,
      series: mapInferenceToDegradationData(inf),
    };
  } catch (error) {
    console.error("Degradation API Error:", error);
    return {
      raw: null,
      series: [],
    };
  }
};

export const getInferenceHealth = async () => {
  try {
    const response = await fetch(INFERENCE_HEALTH_URL);
    if (!response.ok) throw new Error("Inference service unavailable");
    return await response.json();
  } catch (error) {
    console.error("Inference Health Error:", error);
    return { status: "down" };
  }
};

export const getInferenceValidation = async () => {
  try {
    const response = await fetch(INFERENCE_VALIDATE_URL);
    if (!response.ok) throw new Error("Inference validation failed");
    return await response.json();
  } catch (error) {
    console.error("Inference Validate Error:", error);
    return null;
  }
};

// ==============================
// TELEMETRY
// ==============================
export const getMachineTelemetry = async () => {
  try {
    const response = await fetch(TELEMETRY_URL);
    if (!response.ok) throw new Error("Failed to fetch telemetry");
    const data = await response.json();

    const vibration = rms3(data.ax, data.ay, data.az);
    const resolvedTemperature =
      data?.temperature !== undefined && data?.temperature !== null && data?.temperature !== ""
        ? safeNum(data.temperature)
        : safeNum(data.temp);

    return {
      timestamp: data.ts || new Date().toLocaleTimeString(),
      current: safeNum(data.current),
      temperature: resolvedTemperature,
      vibration: +vibration.toFixed(3),
      raw: data,
    };
  } catch (error) {
    console.error("Telemetry API Error:", error);
    return {
      timestamp: new Date().toLocaleTimeString(),
      current: 0,
      temperature: 0,
      vibration: 0,
      raw: {},
    };
  }
};

export const getTelemetryHistory = async (limit = 500) => {
  try {
    const response = await fetch(`${TELEMETRY_HISTORY_URL}?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch telemetry history");
    const data = await response.json();

    return data.map((row, index) => {
      const vibration = rms3(row.ax, row.ay, row.az);

      const time = row.ts
        ? `${row.ts}`
        : new Date(Date.now() - (data.length - index) * 1000).toLocaleTimeString();

      const resolvedTemperature = getRowTemperature(row);

      return {
        timestamp: time,
        time,
        current: safeNum(row.current),
        temp: resolvedTemperature,
        temperature: resolvedTemperature,
        vibration: +vibration.toFixed(3),
        ax: safeNum(row.ax),
        ay: safeNum(row.ay),
        az: safeNum(row.az),
      };
    });
  } catch (error) {
    console.error("Telemetry History API Error:", error);
    return [];
  }
};

// Align cloud telemetry to inference window timestamps so x-axis matches degradation chart
export const getAlignedTelemetryFromCloud = async (windowTimestamps = []) => {
  const rows = await getTelemetryHistory(500);

  if (!rows.length) return [];

  const needed = Array.isArray(windowTimestamps) ? windowTimestamps.length : 0;

  // Fallback: no inference timestamps available, so show recent cloud telemetry directly
  if (needed === 0) {
    return rows.map((row, index) => ({
      time: row.time ?? row.timestamp ?? `${index}`,
      timestamp: row.timestamp ?? row.time ?? `${index}`,
      vibration: safeNum(row.vibration),
      temperature: safeNum(row.temperature),
      current: safeNum(row.current),
      ax: safeNum(row.ax),
      ay: safeNum(row.ay),
      az: safeNum(row.az),
      index,
    }));
  }

  const lastRows = rows.slice(-needed);

  return windowTimestamps.map((ts, index) => {
    const row = lastRows[index] || lastRows[lastRows.length - 1] || {};

    return {
      time: ts ?? row.time ?? `${index}`,
      timestamp: ts ?? row.timestamp ?? `${index}`,
      vibration: safeNum(row.vibration),
      temperature: safeNum(row.temperature),
      current: safeNum(row.current),
      ax: safeNum(row.ax),
      ay: safeNum(row.ay),
      az: safeNum(row.az),
      index,
    };
  });
};

export const getTemperatureHistoryFromCloud = async (limit = 500) => {
  const rows = await getTelemetryHistory(limit);

  return rows.map((row) => ({
    time: row.time,
    value: safeNum(row.temperature),
    timestamp: row.timestamp,
  }));
};

export const connectToLiveStream = (onData, onError, intervalMs = 10000) => {
  const interval = setInterval(async () => {
    try {
      const telemetry = await getMachineTelemetry();
      onData(telemetry);
    } catch (err) {
      onError(err);
    }
  }, intervalMs);

  return () => clearInterval(interval);
};

// ==============================
// LEGACY / MOCK FALLBACKS
// ==============================
export const getVibrationData = async (limit = 50) =>
  mockVibrationData.slice(-limit);

export const getTemperatureData = async (limit = 50) =>
  mockTemperatureData.slice(-limit);

export const getCurrentData = async (limit = 50) =>
  mockCurrentData.slice(-limit);

export const getFaultHistory = async () => mockFaultHistory;
export const getFaultStats = async () => mockFaultStats;

export const testConnection = async () => {
  const health = await getInferenceHealth();
  return health?.status === "healthy" || health?.status === "ok";
};

export const updateThresholds = async (thresholds) => {
  await delay(500);
  console.log("Frontend only: Thresholds updated", thresholds);
  return { success: true };
};

export const API_CONFIG = {
  TELEMETRY_URL,
  TELEMETRY_HISTORY_URL,
  INFERENCE_BASE_URL,
  INFERENCE_PREDICT_URL,
  INFERENCE_HEALTH_URL,
  INFERENCE_VALIDATE_URL,
};