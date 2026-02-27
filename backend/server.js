import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

// ==============================
// CONFIG
// ==============================
const PORT = 5000;
const USE_MOCK_DATA = true; // ← later set false for Azure

const app = express();
app.use(cors());
app.use(express.json());

// ==============================
// MOCK DATA (same shape as frontend expects)
// ==============================
let faultHistory = [];
let thresholds = {
  vibration: 0.7,
  temperature: 75,
  current: 12,
};

const systemData = {
  status: "online",
  uptime: "12h 32m",
  lastFault: "None",
};

let machineData = {
  vibrationRMS: 0.45,
  temperature: 62,
  current: 9.3,
};

// ==============================
// HELPERS
// ==============================
const randomTelemetry = () => ({
  timestamp: new Date().toISOString(),
  vibration: +(Math.random() * 0.3 + 0.2).toFixed(3),
  temperature: +(Math.random() * 10 + 55).toFixed(1),
  current: +(Math.random() * 2 + 8).toFixed(1),
});

const generatePrediction = () => {
  const faulty = Math.random() > 0.8;

  if (!faulty) {
    return {
      prediction: "healthy",
      confidence: +(0.8 + Math.random() * 0.15).toFixed(2),
      timestamp: new Date().toISOString(),
    };
  }

  const faultTypes = ["Outer Race", "Inner Race", "Ball Fault"];
  const faultType = faultTypes[Math.floor(Math.random() * faultTypes.length)];

  const fault = {
    timestamp: new Date().toISOString(),
    bearing: "Bearing A",
    faultType,
    confidence: +(0.85 + Math.random() * 0.1).toFixed(2),
    severity: "High",
    resolved: false,
  };

  faultHistory.push(fault);

  return {
    prediction: "faulty",
    faultType,
    confidence: fault.confidence,
    timestamp: fault.timestamp,
  };
};

// ==============================
// REST API ROUTES
// ==============================

// SYSTEM STATUS
app.get("/api/system/status", (req, res) => {
  res.json(systemData);
});

// MACHINE DATA
app.get("/api/machine/data", (req, res) => {
  res.json(machineData);
});

// TELEMETRY
app.get("/api/telemetry/vibration", (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const data = Array.from({ length: limit }, randomTelemetry).map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    value: d.vibration,
  }));
  res.json(data);
});

// PREDICTIONS
app.get("/api/predictions/latest", (req, res) => {
  res.json(generatePrediction());
});

// FAULT HISTORY
app.get("/api/faults/history", (req, res) => {
  res.json(faultHistory);
});

// FAULT STATS
app.get("/api/faults/stats", (req, res) => {
  const stats = faultHistory.reduce((acc, f) => {
    acc[f.faultType] = (acc[f.faultType] || 0) + 1;
    return acc;
  }, {});
  res.json(stats);
});

// SETTINGS
app.get("/api/system/ping", (req, res) => {
  res.sendStatus(200);
});

app.post("/api/settings/thresholds", (req, res) => {
  thresholds = req.body;
  res.json({ success: true });
});

// ==============================
// WEBSOCKET (LIVE STREAM)
// ==============================
const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const interval = setInterval(() => {
    const data = randomTelemetry();

    machineData = {
      vibrationRMS: data.vibration,
      temperature: data.temperature,
      current: data.current,
    };

    ws.send(JSON.stringify(data));
  }, 2000);

  ws.on("close", () => clearInterval(interval));
});
