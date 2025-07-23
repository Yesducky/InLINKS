import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import "./App.css";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Settings from "./pages/Settings.jsx";
import AddMaterial from "./pages/AddMaterial.jsx";
import InventoryOverview from "./pages/InventoryOverview.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import LotOverview from "./pages/LotOverview.jsx";
import ItemOverview from "./pages/ItemOverview.jsx";
import Lot from "./pages/Lot.jsx";
import Item from "./pages/Item.jsx";
import ProjectManagement from "./pages/ProjectManagement.jsx";
import Project from "./pages/Project.jsx";
import WorkOrder from "./pages/WorkOrder.jsx";
import Task from "./pages/Task.jsx";
import SubTask from "./pages/SubTask.jsx";

import BackButton from "./componenets/BackButton.jsx";

const ProtectedRoute = ({ children, user }) => {
  return user ? children : <Navigate to="/login" replace />;
};

// Global BackButton component
const GlobalBackButton = () => {
  const location = useLocation();
  const shouldShowBackButton = !["/login", "/dashboard"].includes(
    location.pathname,
  );

  if (!shouldShowBackButton) return null;

  // Determine back navigation based on current route
  const getBackTo = () => {
    const path = location.pathname;
    if (
      path === "/settings" ||
      path === "/add_material" ||
      path === "/user_management" ||
      path === "/inventory_overview" ||
      path === "/project_management"
    ) {
      return "/dashboard";
    }
    if (path === "/lot_overview" || path.startsWith("/lot_overview/")) {
      return "/inventory_overview";
    }
    // For dynamic routes like /lot/:id or /item/:id, use browser back
    return undefined;
  };

  return <BackButton to={getBackTo()} />;
};

// Animated Routes wrapper
const AnimatedRoutes = ({ user, handleLogin, handleLogout }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute user={user}>
              <Settings onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add_material"
          element={
            <ProtectedRoute user={user}>
              <AddMaterial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user_management"
          element={
            <ProtectedRoute user={user}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory_overview"
          element={
            <ProtectedRoute user={user}>
              <InventoryOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lot_overview"
          element={
            <ProtectedRoute user={user}>
              <LotOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lot_overview/:materialTypeId"
          element={
            <ProtectedRoute user={user}>
              <LotOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lot/:lotId"
          element={
            <ProtectedRoute user={user}>
              <Lot />
            </ProtectedRoute>
          }
        />
        <Route
          path="/item_overview"
          element={
            <ProtectedRoute user={user}>
              <ItemOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/item/:itemId"
          element={
            <ProtectedRoute user={user}>
              <Item />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project_management"
          element={
            <ProtectedRoute user={user}>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <ProtectedRoute user={user}>
              <Project />
            </ProtectedRoute>
          }
        />

        <Route
          path="/work_order/:workOrderId"
          element={
            <ProtectedRoute user={user}>
              <WorkOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/task/:taskId"
          element={
            <ProtectedRoute user={user}>
              <Task />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subtask/:subTaskId"
          element={
            <ProtectedRoute user={user}>
              <SubTask />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <Router>
      <AnimatedRoutes
        user={user}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
      <GlobalBackButton />
    </Router>
  );
}

export default App;
