// layouts/MainLayout.jsx
import { Link, useLocation } from "react-router-dom";
import "../styles/layout.css";

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="nav-brand">
          <h2>⚙️ Predictive Maintenance</h2>
        </div>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive("/")}`}>
            Dashboard
          </Link>
          <Link to="/analytics" className={`nav-link ${isActive("/analytics")}`}>
            Analytics
          </Link>
          <Link to="/settings" className={`nav-link ${isActive("/settings")}`}>
            Settings
          </Link>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default MainLayout;