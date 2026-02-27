// pages/Dashboard.jsx
import { useState, useEffect } from "react";
import {
  SystemStatusCard,
  MachineHealthCard,
  MaintenanceBox,
  PredictionPanel,
  LiveIndicator,
  TelemetryCharts,
  StatsPanel,
  ControlPanel,
} from "../components/dashboard-components";
import { Loading } from "../components/Loading";
import { 
  getSystemStatus, 
  getMachineTelemetry, 
  getPredictions, 
  connectToLiveStream,
  getTelemetryHistory 
} from "../services/api";
import "../styles/dashboard.css";

const Dashboard = () => {
  const [systemData, setSystemData] = useState(null);
  const [machineData, setMachineData] = useState(null);
  const [vibrationData, setVibrationData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeWindow, setTimeWindow] = useState(50);
  const [newFaultDetected, setNewFaultDetected] = useState(false);
  const [dataSource, setDataSource] = useState("live");
  const [historyLoading, setHistoryLoading] = useState(false);

  // ========================
  // INITIAL DATA FETCH
  // ========================
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [system, telemetry] = await Promise.all([
          getSystemStatus(),
          getMachineTelemetry()
        ]);

        setSystemData(system);

        setMachineData({
          vibrationRMS: telemetry.vibration,
          temperature: telemetry.temperature,
          current: telemetry.current,
        });

        setVibrationData([{ time: telemetry.timestamp, value: telemetry.vibration }]);
        setTemperatureData([{ time: telemetry.timestamp, value: telemetry.temperature }]);
        setCurrentData([{ time: telemetry.timestamp, value: telemetry.current }]);

        setError(null);
        setIsStreaming(true);
      } catch (err) {
        setError(err.message);
        setIsStreaming(false);
        console.error("Error fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // ========================
  // LOAD HISTORY DATA
  // ========================
  const loadHistoryData = async () => {
    setHistoryLoading(true);
    setDataSource("history");
    setIsPaused(true);
    
    try {
      const history = await getTelemetryHistory();
      
      if (history && history.length > 0) {
        const filteredHistory = history.slice(-timeWindow);
        
        // ✅ Only update charts, cards are untouched
        setVibrationData(filteredHistory.map(item => ({
          time: item.time,
          value: item.vibration
        })));
        
        setTemperatureData(filteredHistory.map(item => ({
          time: item.time,
          value: item.temperature
        })));
        
        setCurrentData(filteredHistory.map(item => ({
          time: item.time,
          value: item.current
        })));
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ========================
  // SWITCH TO LIVE MODE
  // ========================
  const switchToLiveMode = () => {
    setDataSource("live");
    setIsPaused(false);
    setVibrationData([]);
    setTemperatureData([]);
    setCurrentData([]);
  };

  // ========================
  // PREDICTIONS
  // ========================
  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const pred = await getPredictions();

        if (pred.prediction === "faulty" && prediction?.prediction !== "faulty") {
          setNewFaultDetected(true);
          setTimeout(() => setNewFaultDetected(false), 3000);
        }

        setPrediction(pred);
      } catch (err) {
        console.error("Error fetching predictions:", err);
      }
    };

    fetchPrediction();
    const interval = setInterval(fetchPrediction, 5000);

    return () => clearInterval(interval);
  }, [prediction]);

  // ========================
  // LIVE TELEMETRY STREAM
  // ========================
  useEffect(() => {
    if (isPaused || dataSource === "history") return;

    const cleanup = connectToLiveStream(
      (data) => {
        setLastUpdate(new Date());
        setIsStreaming(true);

        // ✅ Always update machine cards from live stream
        setMachineData((prev) => ({
          ...prev,
          vibrationRMS: data.vibration,
          temperature: data.temperature,
          current: data.current,
        }));

        setVibrationData((prev) => [
          ...prev.slice(-(timeWindow - 1)),
          { time: data.timestamp, value: data.vibration },
        ]);
        setTemperatureData((prev) => [
          ...prev.slice(-(timeWindow - 1)),
          { time: data.timestamp, value: data.temperature },
        ]);
        setCurrentData((prev) => [
          ...prev.slice(-(timeWindow - 1)),
          { time: data.timestamp, value: data.current },
        ]);
      },
      (error) => {
        console.error("Live stream error:", error);
        setIsStreaming(false);
      },
      2000
    );

    return cleanup;
  }, [isPaused, timeWindow, dataSource]);

  // ========================
  // RELOAD HISTORY WHEN TIME WINDOW CHANGES
  // ========================
  useEffect(() => {
    if (dataSource === "history") {
      loadHistoryData();
    }
  }, [timeWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================
  // CONTROL PANEL HANDLERS
  // ========================
  const handlePauseResume = () => setIsPaused(!isPaused);
  
  const handleResetData = () => {
    setVibrationData([]);
    setTemperatureData([]);
    setCurrentData([]);
  };
  
  const handleTimeWindowChange = (window) => setTimeWindow(window);

  // ========================
  // LOADING / ERROR STATE
  // ========================
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

  // ========================
  // RENDER DASHBOARD
  // ========================
  return (
    <div className="dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Machine Health Monitoring</h1>
          <p className="subtitle">Environment - 07 | Wiser Factory</p>
        </div>
        <div className="header-controls">
          <LiveIndicator isStreaming={isStreaming && dataSource === "live"} lastUpdate={lastUpdate} />
        </div>
      </div>

      {/* CONTROL PANEL */}
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

      {/* TOP ROW */}
      <div className="top-row">
        <SystemStatusCard data={systemData} newFault={newFaultDetected} />
        <PredictionPanel prediction={prediction} />
      </div>

      {/* MACHINE HEALTH CARD */}
      <MachineHealthCard machine={machineData} />

      {/* STATISTICS PANEL */}
      <StatsPanel
        vibrationData={vibrationData}
        temperatureData={temperatureData}
        currentData={currentData}
        machineData={machineData}
      />

      {/* TELEMETRY CHARTS */}
      <TelemetryCharts
        vibrationData={vibrationData}
        temperatureData={temperatureData}
        currentData={currentData}
      />

      {/* MAINTENANCE BOX */}
      <MaintenanceBox machineData={machineData} prediction={prediction} />
    </div>
  );
};

export default Dashboard;