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
  getAlignedTelemetryFromCloud,
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

  const applyDashboardData = (inference, alignedTelemetry, windowSize) => {
    if (!inference) return;

    const system = mapInferenceToSystemStatus(inference);
    const pred = mapInferenceToPrediction(inference);
    const degradation = mapInferenceToDegradationData(inference);

    const filteredTelemetry =
      windowSize === 10000
        ? alignedTelemetry
        : alignedTelemetry.slice(-windowSize);

    const latestTelemetry = filteredTelemetry[filteredTelemetry.length - 1] || null;

    const previousPrediction = previousPredictionRef.current;
    if (pred?.prediction === "faulty" && previousPrediction !== "faulty") {
      setNewFaultDetected(true);
      setTimeout(() => setNewFaultDetected(false), 3000);
    }
    previousPredictionRef.current = pred?.prediction ?? null;

    setSystemData(system);
    setPrediction(pred);
    setDegradationData(degradation);

    setVibrationData(
      filteredTelemetry.map((item) => ({
        time: item.time,
        value: item.vibration,
      }))
    );

    setTemperatureData(
      filteredTelemetry.map((item) => ({
        time: item.time,
        value: item.temperature,
      }))
    );

    setCurrentData(
      filteredTelemetry.map((item) => ({
        time: item.time,
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

  const fetchDashboardData = async (windowSize) => {
    const inference = await getFullInference();
    const windowTimestamps = Array.isArray(inference?.window_timestamps)
      ? inference.window_timestamps
      : [];

    const alignedTelemetry = await getAlignedTelemetryFromCloud(windowTimestamps);
    applyDashboardData(inference, alignedTelemetry, windowSize);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);

      try {
        await fetchDashboardData(timeWindow);
        setError(null);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard");
        setIsStreaming(false);
        console.error("Error fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    setDataSource("history");
    setIsPaused(true);

    try {
      await fetchDashboardData(timeWindow);
    } catch (err) {
      console.error("Error loading history:", err);
      setIsStreaming(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  const switchToLiveMode = async () => {
    setDataSource("live");
    setIsPaused(false);

    try {
      await fetchDashboardData(timeWindow);
    } catch (err) {
      console.error("Error switching to live mode:", err);
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      if (isPaused) return;

      try {
        const inference = await getFullInference();
        const windowTimestamps = Array.isArray(inference?.window_timestamps)
          ? inference.window_timestamps
          : [];

        const alignedTelemetry = await getAlignedTelemetryFromCloud(windowTimestamps);

        if (!isMounted || !inference) return;
        applyDashboardData(inference, alignedTelemetry, timeWindow);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
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

  useEffect(() => {
    if (dataSource === "history") {
      loadHistoryData();
    }
  }, [timeWindow]);

  const handlePauseResume = () => setIsPaused((prev) => !prev);

  const handleResetData = () => {
    setVibrationData([]);
    setTemperatureData([]);
    setCurrentData([]);
  };

  const handleTimeWindowChange = (window) => setTimeWindow(window);

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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Machine Health Monitoring</h1>
          <p className="subtitle">Environment - 07 | Wiser Factory</p>
        </div>
        <div className="header-controls">
          <LiveIndicator
            isStreaming={isStreaming && dataSource === "live"}
            lastUpdate={lastUpdate}
          />
        </div>
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

      <div className="top-row single-panel">
        <PredictionPanel
          prediction={prediction}
          activeFault={systemData?.activeFault}
          newFault={newFaultDetected}
        />
      </div>

      <MachineHealthCard machine={machineData} />

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