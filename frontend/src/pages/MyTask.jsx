import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import { Search } from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import TaskSettingsModal from "../componenets/TaskSettingsModal.jsx";
import { iconMap, SettingIcon } from "../componenets/CustomIcons.jsx";

const MyTask = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter, setStatusFilter] = useState([]);
  const [processStates, setProcessStates] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("全部任务");

  const user = JSON.parse(localStorage.getItem("user")) || {};

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  };

  useEffect(() => {
    fetchTasks();
    fetchStatusTypes();

    // Add CSS for hiding scrollbar
    const style = document.createElement("style");
    style.textContent = `
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/tasks/by_user/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const tasksData = await response.json();
        const tasks = Array.isArray(tasksData) ? tasksData : [];
        setTasks(tasks);
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError("Network error loading tasks");
      console.error("Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatusTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/process_state_types/by_type/task", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const states = await response.json();
        setProcessStates(states);
        setStatusFilter(states.map((s) => s.state_name));
      }
    } catch (err) {
      console.error("Error fetching status types:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("zh-hk", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch =
        task.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (selectedStatus !== "全部任务") {
        matchesStatus = task.state?.state_name === selectedStatus;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a[sortBy] || 0);
      const dateB = new Date(b[sortBy] || 0);

      if (sortOrder === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title="我的任務" />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中..." />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title="我的任務" />
        <FetchDataFail error={error} onRetry={fetchTasks} className="h-64" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen w-full"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Header title="我的任務" />

      {/* Search Bar - Taobao Style */}
      <div className="sticky top-0 z-10 bg-white px-4 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任務 ID、名稱或描述..."
            className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="">
        {/* Status Tabs - Horizontal Scroll */}
        <div className="flex w-full items-center px-4">
          <div className="w-[85%] overflow-hidden">
            <div className="scrollbar-hide flex space-x-2 overflow-x-auto py-1">
              <button
                onClick={() => setSelectedStatus("全部任务")}
                className={`flex-shrink-0 rounded px-4 py-2 text-sm font-medium transition-colors ${
                  selectedStatus === "全部任务"
                    ? "bg-blue text-white"
                    : "bg-gray-200 text-black"
                }`}
              >
                全部任务
              </button>
              {processStates.map((state) => (
                <button
                  key={state.id}
                  onClick={() => setSelectedStatus(state.state_name)}
                  className={`flex-shrink-0 rounded px-4 py-2 text-sm font-medium transition-colors ${
                    selectedStatus === state.state_name
                      ? "bg-blue text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  {state.state_name}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Button */}
          <div className="w-[15%] pl-2">
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg"
            >
              <SettingIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Task Cards - Taobao Style */}
        <div className="mt-2 space-y-3 pb-4">
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500">暫無任務資料</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                className="cursor-pointer rounded-lg bg-white p-4 shadow-lg"
                onClick={() => navigate(`/my_tasks/${task.id}`)}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.task_name}
                    </h3>
                    <p className="text-sm text-gray-600">{task.id}</p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: task.state?.bg_color,
                      color: task.state?.text_color,
                    }}
                  >
                    {task.state?.state_name}
                  </span>
                </div>

                {task.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                    {task.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">開始日期</span>
                    <p className="font-medium">{formatDate(task.start_date)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">截止日期</span>
                    <p className="font-medium">{formatDate(task.due_date)}</p>
                  </div>
                </div>

                {task.work_order && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs text-gray-500">
                      所屬工作單: {task.work_order.work_order_name}
                    </p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <TaskSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    </motion.div>
  );
};

export default MyTask;
