// pages/Settings.jsx
import { useState } from "react";
import { testConnection, updateThresholds } from "../services/api";
import "../styles/settings.css";

const Settings = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [thresholds, setThresholds] = useState({
    vibration: 0.7,
    temperature: 75,
    current: 12,
  });

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const isConnected = await testConnection();
      setConnectionStatus(isConnected ? "connected" : "disconnected");
    } catch (error) {
      setConnectionStatus("error");
    } finally {
      setTesting(false);
    }
  };

  const handleThresholdChange = (field, value) => {
    setThresholds((prev) => ({
      ...prev,
      [field]: parseFloat(value),
    }));
  };

  const handleSaveThresholds = async () => {
    try {
      await updateThresholds(thresholds);
      alert("Thresholds updated successfully!");
    } catch (error) {
      alert("Failed to update thresholds");
    }
  };

  return (
    <div className="settings">
      <h1>System Settings</h1>

      {/* Connection Status */}
      <div className="settings-section">
        <h2>Azure Connection</h2>
        <div className="connection-card">
          <div className="connection-info">
            <p>Test connection to Azure IoT Hub and Stream Analytics</p>
            {connectionStatus && (
              <div className={`status-indicator ${connectionStatus}`}>
                <span className="status-dot"></span>
                <span className="status-text">
                  {connectionStatus === "connected"
                    ? "Connected"
                    : connectionStatus === "disconnected"
                    ? "Disconnected"
                    : "Connection Error"}
                </span>
              </div>
            )}
          </div>
          <button
            className="btn-test"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>
      </div>

      {/* Threshold Configuration */}
      <div className="settings-section">
        <h2>Alert Thresholds</h2>
        <div className="threshold-card">
          <p className="section-description">
            Configure alert thresholds for predictive maintenance
          </p>

          <div className="threshold-inputs">
            <div className="input-group">
              <label>Vibration RMS Threshold</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.vibration}
                onChange={(e) =>
                  handleThresholdChange("vibration", e.target.value)
                }
              />
              <span className="input-unit">g</span>
            </div>

            <div className="input-group">
              <label>Temperature Threshold</label>
              <input
                type="number"
                value={thresholds.temperature}
                onChange={(e) =>
                  handleThresholdChange("temperature", e.target.value)
                }
              />
              <span className="input-unit">°C</span>
            </div>

            <div className="input-group">
              <label>Current Threshold</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.current}
                onChange={(e) =>
                  handleThresholdChange("current", e.target.value)
                }
              />
              <span className="input-unit">A</span>
            </div>
          </div>

          <button className="btn-save" onClick={handleSaveThresholds}>
            Save Thresholds
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="settings-section">
        <h2>System Information</h2>
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Model Version:</span>
            <span className="info-value">v2.1.0</span>
          </div>
          <div className="info-row">
            <span className="info-label">Last Training:</span>
            <span className="info-value">January 15, 2026</span>
          </div>
          <div className="info-row">
            <span className="info-label">Machine Monitored:</span>
            <span className="info-value">Production Machine 01</span>
          </div>
          <div className="info-row">
            <span className="info-label">Data Refresh Rate:</span>
            <span className="info-value">2 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;