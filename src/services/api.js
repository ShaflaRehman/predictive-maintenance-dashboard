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
// Keep these exactly for telemetry graphs/cards
const TELEMETRY_URL =
  "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetry";
const TELEMETRY_HISTORY_URL =
  "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetryHistory";

// Your Docker / FastAPI inference API
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
  if (!inf) return 0.5;

  if (typeof inf.health_score === "number") {
    if (inf.final_status === "Fault") {
      return Math.min(0.99, Math.max(0.75, 1 - inf.health_score / 100));
    }
    return Math.min(0.99, Math.max(0.7, inf.health_score / 100));
  }

  if (
    typeof inf.latest_error === "number" &&
    typeof inf.threshold === "number" &&
    inf.threshold > 0
  ) {
    const ratio = inf.latest_error / inf.threshold;
    if (inf.final_status === "Fault") return Math.min(0.99, Math.max(0.75, ratio / 2));
    return Math.max(0.6, 1 - Math.min(ratio, 1) * 0.4);
  }

  return inf.final_status === "Fault" ? 0.9 : 0.85;
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

// Map inference -> SystemStatusCard props
const mapInferenceToSystemStatus = (inf) => {
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

// Map inference -> PredictionPanel props
const mapInferenceToPrediction = (inf) => {
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
    healthScore:
      typeof inf?.health_score === "number" ? inf.health_score : null,

    // F1 metrics from backend
    f1Normal:
      typeof inf?.f1_normal === "number" ? inf.f1_normal : null,
    f1Fault:
      typeof inf?.f1_fault === "number" ? inf.f1_fault : null,
    f1Macro:
      typeof inf?.f1_macro === "number" ? inf.f1_macro : null,
  };
};

// Map inference -> degradation charts
const mapInferenceToDegradationData = (inf) => {
  const errors = Array.isArray(inf?.errors) ? inf.errors : [];
  const preds = Array.isArray(inf?.predictions) ? inf.predictions : [];
  const windowTimestamps = Array.isArray(inf?.window_timestamps)? inf.window_timestamps : [];
  const threshold = safeNum(inf?.threshold, 0);
  const smooth = Array.isArray(inf?.degradation_curve) ? inf.degradation_curve : [];

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

// ==============================
// SYSTEM / INFERENCE
// ==============================
export const getSystemStatus = async () => {
  try {
    const response = await fetch(INFERENCE_PREDICT_URL);
    if (!response.ok) throw new Error("Failed to fetch inference status");
    const data = await response.json();
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
  const response = await fetch(INFERENCE_PREDICT_URL);
  if (!response.ok) throw new Error("Failed to fetch inference results");
  return await response.json();
};

export const getPredictions = async () => {
  try {
    const data = await getInferenceResults();
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
    const inf = await getInferenceResults();
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
// TELEMETRY - KEEP AZURE FUNCTIONS
// ==============================
export const getMachineTelemetry = async () => {
  try {
    const response = await fetch(TELEMETRY_URL);
    if (!response.ok) throw new Error("Failed to fetch telemetry");
    const data = await response.json();

    const vibration = Math.sqrt(
      safeNum(data.ax) ** 2 + safeNum(data.ay) ** 2 + safeNum(data.az) ** 2
    );

    return {
      timestamp: data.ts || new Date().toLocaleTimeString(),
      current: safeNum(data.current),
      temperature: safeNum(data.temp),
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

export const getTelemetryHistory = async () => {
  try {
    const response = await fetch(TELEMETRY_HISTORY_URL);
    if (!response.ok) throw new Error("Failed to fetch telemetry history");
    const data = await response.json();

    return data.map((row, index) => {
      const vibration = Math.sqrt(
        safeNum(row.ax) ** 2 + safeNum(row.ay) ** 2 + safeNum(row.az) ** 2
      );

      const time = row.ts
        ? `${row.ts}`
        : new Date(Date.now() - (data.length - index) * 1000).toLocaleTimeString();

      return {
        timestamp: time,
        time,
        current: safeNum(row.current),
        temp: safeNum(row.temp),
        temperature: safeNum(row.temp),
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