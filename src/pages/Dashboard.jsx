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
  DegradationCharts,
} from "../components/dashboard-components";
import { Loading } from "../components/Loading";
import {
  getMachineTelemetry,
  connectToLiveStream,
  getTelemetryHistory,
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

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [telemetry, inference] = await Promise.all([
          getMachineTelemetry(),
          getFullInference(),
        ]);

        const system = mapInferenceToSystemStatus(inference);
        const pred = mapInferenceToPrediction(inference);
        const degradation = mapInferenceToDegradationData(inference);

        setSystemData(system);
        setPrediction(pred);

        setMachineData({
          vibrationRMS: telemetry.vibration,
          temperature: telemetry.temperature,
          current: telemetry.current,
        });

        setVibrationData([{ time: telemetry.timestamp, value: telemetry.vibration }]);
        setTemperatureData([{ time: telemetry.timestamp, value: telemetry.temperature }]);
        setCurrentData([{ time: telemetry.timestamp, value: telemetry.current }]);

        setDegradationData(degradation);

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

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    setDataSource("history");
    setIsPaused(true);

    try {
      const history = await getTelemetryHistory();

      if (history && history.length > 0) {
        const filteredHistory = timeWindow === 10000 ? history : history.slice(-timeWindow);

        setVibrationData(
          filteredHistory.map((item) => ({
            time: item.time,
            value: item.vibration,
          }))
        );

        setTemperatureData(
          filteredHistory.map((item) => ({
            time: item.time,
            value: item.temperature,
          }))
        );

        setCurrentData(
          filteredHistory.map((item) => ({
            time: item.time,
            value: item.current,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const switchToLiveMode = () => {
    setDataSource("live");
    setIsPaused(false);
    setVibrationData([]);
    setTemperatureData([]);
    setCurrentData([]);
  };

  useEffect(() => {
    const fetchPredictionAndDegradation = async () => {
      try {
        const inference = await getFullInference();

        const system = mapInferenceToSystemStatus(inference);
        const pred = mapInferenceToPrediction(inference);
        const degradation = mapInferenceToDegradationData(inference);

        if (pred.prediction === "faulty" && prediction?.prediction !== "faulty") {
          setNewFaultDetected(true);
          setTimeout(() => setNewFaultDetected(false), 3000);
        }

        setSystemData(system);
        setPrediction(pred);
        setDegradationData(degradation);
      } catch (err) {
        console.error("Error fetching prediction/degradation:", err);
      }
    };

    fetchPredictionAndDegradation();
    const interval = setInterval(fetchPredictionAndDegradation, 5000);

    return () => clearInterval(interval);
  }, [prediction?.prediction]);

  useEffect(() => {
    if (isPaused || dataSource === "history") return;

    const cleanup = connectToLiveStream(
      (data) => {
        setLastUpdate(new Date());
        setIsStreaming(true);

        setMachineData((prev) => ({
          ...prev,
          vibrationRMS: data.vibration,
          temperature: data.temperature,
          current: data.current,
        }));

        setVibrationData((prev) => {
          const last = prev[prev.length - 1];
          if (last?.time === data.timestamp) return prev;
          return [
            ...prev.slice(-(timeWindow - 1)),
            { time: data.timestamp, value: data.vibration },
          ];
        });

        setTemperatureData((prev) => {
          const last = prev[prev.length - 1];
          if (last?.time === data.timestamp) return prev;
          return [
            ...prev.slice(-(timeWindow - 1)),
            { time: data.timestamp, value: data.temperature },
          ];
        });

        setCurrentData((prev) => {
          const last = prev[prev.length - 1];
          if (last?.time === data.timestamp) return prev;
          return [
            ...prev.slice(-(timeWindow - 1)),
            { time: data.timestamp, value: data.current },
          ];
        });
      },
      (streamError) => {
        console.error("Live stream error:", streamError);
        setIsStreaming(false);
      },
      5000
    );

    return cleanup;
  }, [isPaused, timeWindow, dataSource]);

  useEffect(() => {
    if (dataSource === "history") {
      loadHistoryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeWindow]);

  const handlePauseResume = () => setIsPaused(!isPaused);

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

      <div className="top-row">
        <SystemStatusCard data={systemData} newFault={newFaultDetected} />
        <PredictionPanel prediction={prediction} />
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
s