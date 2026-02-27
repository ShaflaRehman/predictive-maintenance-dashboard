// data/mockData.js
// Mock data for local development - Single Machine Monitoring

export const systemData = {
  overallStatus: "Normal", // Can be: Normal, Warning, Critical
  activeFault: null, // e.g., "Outer Race Fault" or null
  modelConfidence: 94,
  lastUpdated: new Date().toISOString(),
  lastInspection: "2026-01-28",
};

export const machineData = {
  id: 1,
  name: "Production Machine 01",
  status: "Normal", // Can be: Normal, Warning, Faulty
  faultType: "None", // Can be: None, Outer Race, Inner Race, Ball Fault
  vibrationRMS: 0.25, // in g (gravitational force)
  temperature: 62, // in Celsius
  current: 9.2, // in Amperes
  location: "Environment - 07",
  factory: "Wiser Factory",
};

// Generate vibration data for the last 50 time points
export const vibrationData = Array.from({ length: 50 }, (_, i) => ({
  time: `${i}s`,
  value: +(Math.random() * 0.3 + 0.2).toFixed(3), // 0.2 to 0.5 g
}));

// Temperature data
export const temperatureData = Array.from({ length: 50 }, (_, i) => ({
  time: `${i}s`,
  value: +(Math.random() * 10 + 55).toFixed(1), // 55 to 65°C
}));

// Current data
export const currentData = Array.from({ length: 50 }, (_, i) => ({
  time: `${i}s`,
  value: +(Math.random() * 2 + 8).toFixed(1), // 8 to 10 A
}));

// Prediction from ML model
export const prediction = {
  timestamp: new Date().toISOString(),
  prediction: "normal", // Can be: normal, faulty
  faultType: null, // Can be: null, "Outer Race", "Inner Race", "Ball Fault"
  confidence: 0.95, // 0 to 1
};

// Fault history for analytics page
export const faultHistory = [
  {
    id: 1,
    timestamp: "2026-02-01 14:32:00",
    bearing: "Main Bearing",
    faultType: "Outer Race",
    confidence: 94,
    severity: "High",
    resolved: false,
  },
  {
    id: 2,
    timestamp: "2026-01-28 09:15:00",
    bearing: "Main Bearing",
    faultType: "Inner Race",
    confidence: 87,
    severity: "Medium",
    resolved: true,
  },
  {
    id: 3,
    timestamp: "2026-01-25 16:45:00",
    bearing: "Main Bearing",
    faultType: "Ball Fault",
    confidence: 91,
    severity: "Medium",
    resolved: true,
  },
  {
    id: 4,
    timestamp: "2026-01-20 11:20:00",
    bearing: "Main Bearing",
    faultType: "Outer Race",
    confidence: 89,
    severity: "High",
    resolved: true,
  },
  {
    id: 5,
    timestamp: "2026-01-18 08:30:00",
    bearing: "Main Bearing",
    faultType: "Inner Race",
    confidence: 85,
    severity: "Low",
    resolved: true,
  },
  {
    id: 6,
    timestamp: "2026-01-15 13:05:00",
    bearing: "Main Bearing",
    faultType: "None",
    confidence: 97,
    severity: "Low",
    resolved: true,
  },
  {
    id: 7,
    timestamp: "2026-01-12 10:30:00",
    bearing: "Main Bearing",
    faultType: "Ball Fault",
    confidence: 88,
    severity: "Medium",
    resolved: true,
  },
  {
    id: 8,
    timestamp: "2026-01-08 15:20:00",
    bearing: "Main Bearing",
    faultType: "Outer Race",
    confidence: 92,
    severity: "High",
    resolved: true,
  },
];

// Fault statistics for analytics
export const faultStats = {
  outerRace: 3,
  innerRace: 2,
  ball: 2,
  normal: 1,
  totalFaults: 8,
  activeFaults: 1,
  resolvedFaults: 7,
};