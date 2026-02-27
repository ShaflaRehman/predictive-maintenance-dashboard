// pages/Analytics.jsx
import { useState, useEffect } from "react";
import {
  HistoryTable,
  FaultTypeChart,
  DateRangePicker,
  FaultTimeline,
  ConfidenceChart,
} from "../components/analytics-components";
import { Loading } from "../components/Loading";
import { getFaultHistory, getFaultStats } from "../services/api";
import "../styles/analytics.css";

const Analytics = () => {
  const [faultHistory, setFaultHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [faultStats, setFaultStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [faultTypeFilter, setFaultTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [history, stats] = await Promise.all([
          getFaultHistory(dateRange.startDate, dateRange.endDate),
          getFaultStats(),
        ]);

        setFaultHistory(history);
        setFilteredHistory(history);
        setFaultStats(stats);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  // Filter and sort logic
  useEffect(() => {
    let filtered = [...faultHistory];

    // Filter by fault type
    if (faultTypeFilter !== 'all') {
      filtered = filtered.filter(f => f.faultType === faultTypeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.timestamp) - new Date(b.timestamp);
      }
      if (sortBy === 'confidence-desc') {
        return b.confidence - a.confidence;
      }
      if (sortBy === 'confidence-asc') {
        return a.confidence - b.confidence;
      }
      return 0;
    });

    setFilteredHistory(filtered);
  }, [faultHistory, faultTypeFilter, sortBy]);

  const handleDateChange = (start, end) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Bearing', 'Fault Type', 'Confidence', 'Severity', 'Status'];
    const rows = filteredHistory.map(f => [
      f.timestamp,
      f.bearing,
      f.faultType,
      f.confidence,
      f.severity,
      f.resolved ? 'Resolved' : 'Active'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fault-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>Fault Analytics & History</h1>
        <div className="header-actions">
          <DateRangePicker onChange={handleDateChange} />
          <button className="btn-export" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-container">
        <div className="filter-group">
          <label>Fault Type:</label>
          <select 
            value={faultTypeFilter} 
            onChange={(e) => setFaultTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="Outer Race">Outer Race</option>
            <option value="Inner Race">Inner Race</option>
            <option value="Ball Fault">Ball Fault</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="confidence-desc">Confidence (High to Low)</option>
            <option value="confidence-asc">Confidence (Low to High)</option>
          </select>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Fault Statistics */}
        <div className="stats-card">
          <h3>Fault Type Distribution</h3>
          <FaultTypeChart data={faultStats} />
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">🔧</div>
            <div className="summary-content">
              <h4>Total Faults</h4>
              <p className="summary-value">
                {faultHistory.length}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <h4>Active Faults</h4>
              <p className="summary-value">
                {faultHistory.filter((f) => !f.resolved).length}
              </p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">✓</div>
            <div className="summary-content">
              <h4>Resolved</h4>
              <p className="summary-value">
                {faultHistory.filter((f) => f.resolved).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAULT TIMELINE */}
      <FaultTimeline data={faultHistory} />

      {/* CONFIDENCE OVER TIME */}
      <ConfidenceChart data={faultHistory} />

      {/* FAULT HISTORY TABLE */}
      <HistoryTable data={filteredHistory} />
    </div>
  );
};

export default Analytics;