import {
  systemData as mockSystemData,
  machineData as mockMachineData,
  vibrationData as mockVibrationData,
  temperatureData as mockTemperatureData,
  currentData as mockCurrentData,
  prediction as mockPrediction,
  faultHistory as mockFaultHistory,
  faultStats as mockFaultStats,
} from "../data/mockData";

const TELEMETRY_URL = "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetry";
const TELEMETRY_HISTORY_URL = "https://pm-api-demo-d8gmgvfvanc2e5ft.southeastasia-01.azurewebsites.net/api/getTelemetryHistory";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getSystemStatus = async () => {
  await delay(300);
  return mockSystemData;
};

export const getMachineData = async () => {
  await delay(300);
  return mockMachineData;
};

export const getMachineTelemetry = async () => {
  try {
    const response = await fetch(TELEMETRY_URL);
    if (!response.ok) throw new Error("Failed to fetch telemetry");
    const data = await response.json();

    const vibration = Math.sqrt(
      (+data.ax) ** 2 + (+data.ay) ** 2 + (+data.az) ** 2
    );

    return {
      timestamp: new Date().toLocaleTimeString(),
      current: +data.current,
      temperature: +data.temp,
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
        (+row.ax || 0) ** 2 + (+row.ay || 0) ** 2 + (+row.az || 0) ** 2
      );

      // ✅ Use row.ts instead of row.timestamp
      const time = row.ts
        ? `#${row.ts}`
        : new Date(Date.now() - (data.length - index) * 1000).toLocaleTimeString();

      return {
        timestamp: time,
        time: time,
        current: +row.current || 0,
        temp: +row.temp || 0,
        temperature: +row.temp || 0,
        vibration: +vibration.toFixed(3),
        ax: +row.ax || 0,
        ay: +row.ay || 0,
        az: +row.az || 0,
      };
    });
  } catch (error) {
    console.error("Telemetry History API Error:", error);
    return [];
  }
};

export const connectToLiveStream = (onData, onError, intervalMs = 2000) => {
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

export const getVibrationData = async (limit = 50) => mockVibrationData.slice(-limit);
export const getTemperatureData = async (limit = 50) => mockTemperatureData.slice(-limit);
export const getCurrentData = async (limit = 50) => mockCurrentData.slice(-limit);

export const getPredictions = async () => {
  await delay(200);
  return mockPrediction;
};

export const getFaultHistory = async (startDate = null, endDate = null) => mockFaultHistory;
export const getFaultStats = async () => mockFaultStats;

export const testConnection = async () => Math.random() > 0.2;
export const updateThresholds = async (thresholds) => {
  await delay(500);
  console.log("Mock: Thresholds updated", thresholds);
  return { success: true };
};

export const API_CONFIG = {
  TELEMETRY_URL,
  TELEMETRY_HISTORY_URL,
};