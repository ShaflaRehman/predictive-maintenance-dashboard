import { useState, useEffect, useRef } from "react";
import {
  MachineHealthCard,
  MaintenanceBox,
  PredictionPanel,
  LiveIndicator,
  TelemetryCharts,
  StatsPanel,
  ControlPanel,
  DegradationCharts,
} from "../components/dashboard-components";
import { Loading } from "../components/Loading";
import {
  getTelemetryHistory,   // ✅ CHANGED (was aligned telemetry logic)
  getFullInference,
  mapInferenceToSystemStatus,
  mapInferenceToPrediction,
  mapInferenceToDegradationData,
} from "../services/api";
import "../styles/dashboard.css";

const Dashboard = () => {
  const [systemData, setSystemData] = useState(null);
  const [machineData, setMachineData] = useState(null);

  const [vibrationData, setVibrationData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [currentData, setCurrentData] = useState([]);

  const [prediction, setPrediction] = useState(null);
  const [degradationData, setDegradationData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeWindow, setTimeWindow] = useState(50);
  const [newFaultDetected, setNewFaultDetected] = useState(false);
  const [dataSource, setDataSource] = useState("live");
  const [historyLoading, setHistoryLoading] = useState(false);

  const previousPredictionRef = useRef(null);

  // ==============================
  // APPLY DATA
  // ==============================
  const applyDashboardData = (inference, telemetry) => {
    if (!inference) return;

    const system = mapInferenceToSystemStatus(inference);
    const pred = mapInferenceToPrediction(inference);
    const degradation = mapInferenceToDegradationData(inference);

    // ✅ RAW SENSOR DATA (FROM TELEMETRY HISTORY)
    const filteredTelemetry = telemetry;

    const latestTelemetry =
      filteredTelemetry[filteredTelemetry.length - 1] || null;

    // Fault detection trigger (unchanged)
    const previousPrediction = previousPredictionRef.current;
    if (pred?.prediction === "faulty" && previousPrediction !== "faulty") {
      setNewFaultDetected(true);
      setTimeout(() => setNewFaultDetected(false), 3000);
    }
    previousPredictionRef.current = pred?.prediction ?? null;

    // ==============================
    // STATE UPDATES
    // ==============================
    setSystemData(system);
    setPrediction(pred);
    setDegradationData(degradation);

    // 📡 TELEMETRY GRAPHS (ONLY FROM HISTORY)
    setVibrationData(
      filteredTelemetry.map((item) => ({
        time: item.timestamp,
        value: item.vibration,
      }))
    );

    setTemperatureData(
      filteredTelemetry.map((item) => ({
        time: item.timestamp,
        value: item.temperature,
      }))
    );

    setCurrentData(
      filteredTelemetry.map((item) => ({
        time: item.timestamp,
        value: item.current,
      }))
    );

    setMachineData({
      vibrationRMS: latestTelemetry?.vibration ?? 0,
      temperature: latestTelemetry?.temperature ?? 0,
      current: latestTelemetry?.current ?? 0,
      status: system?.overallStatus || "Normal",
    });

    setLastUpdate(new Date());
    setIsStreaming(true);
  };

  // ==============================
  // FETCH DATA
  // ==============================
  const fetchDashboardData = async (windowSize) => {
    const inference = await getFullInference();

    // ✅ ONLY TELEMETRY HISTORY (NO ALIGNMENT, NO INFERENCE TIMESTAMPS)
    const telemetry = await getTelemetryHistory(windowSize);

    applyDashboardData(inference, telemetry);
  };

  // ==============================
  // INITIAL LOAD
  // ==============================
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);

      try {
        await fetchDashboardData(timeWindow);
        setError(null);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard");
        setIsStreaming(false);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // ==============================
  // LIVE UPDATE LOOP
  // ==============================
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      if (isPaused) return;

      try {
        const inference = await getFullInference();
        const telemetry = await getTelemetryHistory(timeWindow);

        if (!isMounted) return;

        applyDashboardData(inference, telemetry);
      } catch (err) {
        console.error(err);
        if (isMounted) setIsStreaming(false);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isPaused, timeWindow]);

  // ==============================
  // HANDLERS (UNCHANGED)
  // ==============================
  const handlePauseResume = () => setIsPaused((p) => !p);

  const handleResetData = () => {
    setVibrationData([]);
    setTemperatureData([]);
    setCurrentData([]);
  };

  const handleTimeWindowChange = (w) => setTimeWindow(w);

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    setDataSource("history");
    setIsPaused(true);

    try {
      await fetchDashboardData(timeWindow);
    } finally {
      setHistoryLoading(false);
    }
  };

  const switchToLiveMode = async () => {
    setDataSource("live");
    setIsPaused(false);
    await fetchDashboardData(timeWindow);
  };

  // ==============================
  // LOADING / ERROR
  // ==============================
  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-box">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================
  return (
    <div className="dashboard">

      <div className="dashboard-header">
        <div className="header-left">
          <h1>Machine Health Monitoring</h1>
          <p className="subtitle">Environment - 07 | Wiser Factory</p>
        </div>

        <LiveIndicator
          isStreaming={isStreaming && dataSource === "live"}
          lastUpdate={lastUpdate}
        />
      </div>

      <ControlPanel
        isPaused={isPaused}
        timeWindow={timeWindow}
        onPauseResume={handlePauseResume}
        onReset={handleResetData}
        onTimeWindowChange={handleTimeWindowChange}
        dataSource={dataSource}
        onLoadHistory={loadHistoryData}
        onSwitchToLive={switchToLiveMode}
        historyLoading={historyLoading}
      />

      <PredictionPanel
        prediction={prediction}
        activeFault={systemData?.activeFault}
        newFault={newFaultDetected}
      />

      <MachineHealthCard machine={machineData} prediction={prediction} />

      <StatsPanel
        vibrationData={vibrationData}
        temperatureData={temperatureData}
        currentData={currentData}
        machineData={machineData}
      />

      <TelemetryCharts
        vibrationData={vibrationData}
        temperatureData={temperatureData}
        currentData={currentData}
      />

      <DegradationCharts
        degradationData={degradationData}
        prediction={prediction}
      />

      <MaintenanceBox machineData={machineData} prediction={prediction} />

    </div>
  );
};

export default Dashboard;