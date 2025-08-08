import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../componenets/Header.jsx";
import { Search } from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import TaskSettingsModal from "../componenets/TaskSettingsModal.jsx";
import MyTaskDetail from "./MyTaskDetail.jsx";
import { iconMap, SettingIcon } from "../componenets/CustomIcons.jsx";
import api from "../services/api.js";
import bg_3 from "../assets/images/bg_3.png";

const MyTask = () => {
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4,
  };

  const searchBarVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: 0.1 },
  };

  const tabsVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, delay: 0.2 },
  };

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 2, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
  };

  const statusButtonVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    tap: { scale: 0.95 },
    hover: { scale: 1.05 },
  };

  const filterButtonVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    hover: { scale: 1.1, rotate: 90 },
    tap: { scale: 0.9 },
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

    // Listen for task updates from MyTaskDetail
    const handleTaskUpdate = () => {
      fetchTasks();
    };
    window.addEventListener("taskUpdated", handleTaskUpdate);

    return () => {
      document.head.removeChild(style);
      window.removeEventListener("taskUpdated", handleTaskUpdate);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.getTasksByUserId(user.id);

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
      const response = await api.getProcessStateTypesByProcessType("task");

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

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleStartTask = async (taskId, e) => {
    if (e) e.stopPropagation(); // Prevent triggering task detail modal

    try {
      const response = await api.startTask(taskId);

      if (response.ok) {
        await fetchTasks();

        alert("任務已開始！");
      } else {
        const error = await response.json();
        alert(error.error || "無法開始任務");
      }
    } catch (error) {
      console.error("Error starting task:", error);
      alert("開始任務時發生錯誤");
    }
  };

  const handlePrintAll = async (task, e) => {
    if (e) e.stopPropagation(); // Prevent triggering task detail modal

    try {
      // Use the bulk API to generate single PDF with all items
      const response = await api.printAllLabelsByTaskId(task.id, true);

      if (response.ok) {
        // Get the combined PDF blob
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${task.id}-all-labels.pdf`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        alert(`已生成任務 ${task.id} 的所有標籤 PDF`);
      } else {
        // Try to parse JSON error, but handle non-JSON responses gracefully
        try {
          const error = await response.json();
          alert(error.error || "生成PDF失敗");
        } catch (jsonError) {
          alert(`生成PDF失敗: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error printing all items:", error);
      alert("生成PDF時發生錯誤");
    }
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
        style={{
          backgroundImage: `url(${bg_3})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
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
        style={{
          backgroundImage: `url(${bg_3})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
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
      style={{
        backgroundImage: `url(${bg_3})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Header title="我的任務" />

      {/* Search Bar - Taobao Style */}
      <motion.div
        className="sticky top-0 z-10 px-4 pt-3"
        initial="initial"
        animate="animate"
        variants={searchBarVariants}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任務 ID、名稱或描述..."
            className="focus:border-blue w-full rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-sm transition-all duration-300 focus:shadow-md focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div className="">
        {/* Status Tabs - Horizontal Scroll */}
        <motion.div
          className="flex w-full items-center px-4 py-2"
          initial="initial"
          animate="animate"
          variants={tabsVariants}
        >
          <div className="w-[85%] overflow-hidden">
            <div className="scrollbar-hide flex space-x-2 overflow-x-auto py-1">
              <motion.button
                onClick={() => setSelectedStatus("全部任务")}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  selectedStatus === "全部任务"
                    ? "bg-blue text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                variants={statusButtonVariants}
                whileTap="tap"
                whileHover="hover"
                layout
              >
                全部任务
              </motion.button>
              {processStates.map((state, index) => (
                <motion.button
                  key={state.id}
                  onClick={() => setSelectedStatus(state.state_name)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    selectedStatus === state.state_name
                      ? "bg-blue text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  variants={statusButtonVariants}
                  initial="initial"
                  animate="animate"
                  whileTap="tap"
                  whileHover="hover"
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  {state.state_name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Filter Button */}
          <div className="w-[15%] pl-2">
            <motion.button
              onClick={() => setShowSettings(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 hover:shadow-xl"
              variants={filterButtonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <SettingIcon className="h-5 w-5 text-gray-600" />
            </motion.button>
          </div>
        </motion.div>

        {/* Task Cards - Taobao Style */}
        <motion.div
          className="mt-2 space-y-3 px-4 pb-4"
          variants={cardContainerVariants}
          initial="hidden"
          animate="visible"
          key={selectedStatus}
        >
          {filteredTasks.length === 0 ? (
            <motion.div
              className="rounded-lg bg-white p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-gray-500">暫無任務資料</p>
            </motion.div>
          ) : (
            filteredTasks.map((task, _) => (
              <motion.div
                key={task.id}
                className="cursor-pointer rounded-lg bg-white/75 p-4 shadow-lg backdrop-blur-xs transition-all duration-300 hover:shadow-xl"
                onClick={() => handleTaskClick(task)}
                variants={cardVariants}
                whileTap={{ scale: 0.99 }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.task_name}
                    </h3>
                    <p className="text-sm text-gray-600">{task.id}</p>
                  </div>
                  <span
                    className="flex rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: task.state?.bg_color,
                      color: task.state?.text_color,
                    }}
                  >
                    {iconMap[task.state?.icon] &&
                      React.createElement(iconMap[task.state.icon], {
                        className: "h-4 w-4",
                      })}{" "}
                    &nbsp;
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
                      所屬工單: {task.work_order.work_order_name}
                    </p>
                  </div>
                )}

                {/* Action Buttons - Start Task and Print All */}
                {task.state?.state_name === "assigned_worker" &&
                  task.assignee_id === user.id && (
                    <div className="mt-4 flex justify-end space-x-2">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTask(task.id);
                        }}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        開始任務
                      </motion.button>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintAll(task, e);
                        }}
                        className="bg-blue rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        打印全部
                      </motion.button>
                    </div>
                  )}
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

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

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showTaskDetail && selectedTask && (
          <MyTaskDetail
            task={selectedTask}
            onClose={() => {
              setShowTaskDetail(false);
              setSelectedTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MyTask;
