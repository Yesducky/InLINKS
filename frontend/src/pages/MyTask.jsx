import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import { Search } from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import TaskSettingsModal from "../componenets/TaskSettingsModal.jsx";
import { iconMap } from "../componenets/CustomIcons.jsx";

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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    fetchTasks();
    fetchStatusTypes();
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
        console.log(states);
        setStatusFilter(states.map((s) => s.state_name));
      }
    } catch (err) {
      // Optionally handle error
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
      if (statusFilter.length > 0) {
        matchesStatus = statusFilter.includes(task.state?.state_name);
      }

      let matchesCompletedFilter = true;

      return matchesSearch && matchesStatus && matchesCompletedFilter;
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
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
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
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
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
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Header title="我的任務" />

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Statistics Cards */}

          {/* Search and Filter */}
          <motion.div
            className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <div className="flex w-full max-w-md items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索任務 ID、名稱或描述..."
                  className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <motion.button
                onClick={() => setShowSettings(true)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {React.createElement(iconMap["SettingIcon"], {
                  className: "h-5 w-5",
                })}
              </motion.button>
            </div>
          </motion.div>

          {/* Tasks List/Grid */}
          <motion.div
            className="border-blue bg-lightblue overflow-hidden rounded-2xl border shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <div className="bg-blue border-blue flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-xl font-semibold text-white">
                任務清單 ({filteredTasks.length})
              </h3>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center">
                <TaskIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p
                  className="mt-2 text-gray-500"
                  onClick={() => {
                    console.log(filteredTasks);
                  }}
                >
                  {searchTerm || statusFilter.length < 3
                    ? "沒有符合條件的任務"
                    : "暫無任務資料"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-blue-50 p-4 transition-shadow duration-200 hover:shadow-md"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    onClick={() => navigate(`/my_tasks/${task.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="bold text-2xl text-gray-900">
                            {task.task_name}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-lg font-medium text-gray-900">
                          {formatDate(task.start_date)}
                        </div>
                        <div className="text-md text-gray-500">開始日期</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-gray-900">
                          {formatDate(task.due_date)}
                        </div>
                        <div className="text-md text-gray-500">截止日期</div>
                      </div>
                    </div>

                    {task.state?.state_name === "completed" ? (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-lg font-medium text-gray-900">
                            {task.state === "completed" && task.completed_at
                              ? formatDate(task.completed_at)
                              : "未完成"}
                          </div>
                          <div className="text-md text-gray-500">完成日期</div>
                        </div>
                        <div>
                          <span
                            className={`inline-flex h-10 w-fit items-center justify-center rounded-full px-5 text-lg font-semibold`}
                            style={{
                              backgroundColor: task.state?.bg_color,
                              color: task.state?.text_color,
                            }}
                          >
                            {iconMap[task.state?.icon] &
                              React.createElement(iconMap[task.state.icon], {
                                className: "h-5 w-5",
                              })}
                            &nbsp;
                            {task.state?.state_name}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div>
                          <span
                            className="inline-flex h-10 w-full items-center justify-center rounded-full px-5 text-lg font-semibold"
                            style={{
                              backgroundColor: task.state?.bg_color,
                              color: task.state?.text_color,
                            }}
                          >
                            {iconMap[task.state?.icon] &&
                              React.createElement(iconMap[task.state.icon], {
                                className: "h-5 w-5",
                              })}
                            &nbsp;
                            {task.state?.state_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
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
