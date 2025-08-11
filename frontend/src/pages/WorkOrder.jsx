import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import { Search, ViewList, ViewModule, Edit } from "@mui/icons-material";
import EditWorkOrderModal from "../componenets/EditWorkOrderModal.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import ProcessLog from "../componenets/ProcessLog";
import LogButton from "../componenets/LogButton.jsx";
import {
  WorkOrderIcon,
  PendingIcon,
  ActiveIcon,
  CompletedIcon,
} from "../componenets/CustomIcons.jsx";
import { iconMap } from "../componenets/CustomIcons.jsx";
import AddButton from "../componenets/AddButton.jsx";
import EditTaskModal from "../componenets/EditTaskModal.jsx";
import api from "../services/api.js";
import { backgroundVariants } from "../utils/styles.js";

const WorkOrder = () => {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [workOrderInfo, setWorkOrderInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });

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
    fetchWorkOrderTasks();
    fetchWorkOrderInfo();
  }, [workOrderId]);

  const fetchWorkOrderTasks = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.getTasksByWorkOrderId(workOrderId);

      if (response.ok) {
        const tasksData = await response.json();

        // Ensure tasksData is always an array
        const tasks = Array.isArray(tasksData) ? tasksData : [];
        setTasks(tasks);

        // Calculate stats
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter(
          (task) => task.state?.state_name === "in_progress",
        ).length;
        const completedTasks = tasks.filter(
          (task) => task.state?.state_name === "completed",
        ).length;
        const pendingTasks = tasks.filter(
          (task) =>
            task.state?.state_name === "pending" ||
            task.state?.state_name === "assigned_worker",
        ).length;

        setStats({
          totalTasks,
          activeTasks,
          completedTasks,
          pendingTasks,
        });
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkOrderInfo = async () => {
    try {
      const response = await api.getWorkOrder(workOrderId);

      if (response.ok) {
        const workOrderData = await response.json();
        console.log("Work Order Data:", workOrderData);
        setWorkOrderInfo(workOrderData);
      }
    } catch (err) {
      console.error("Error fetching work order info:", err);
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

  // Filter tasks based on search term and status
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignee?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (selectedStatus !== "all") {
      matchesStatus = task.state?.state_name === selectedStatus;
    }

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        // initial="initial"
        // animate="in"
        // exit="out"
        // variants={pageVariants}
        // transition={pageTransition}
        style={backgroundVariants.projects}
      >
        <Header title={`工單 #${workOrderId}`} />
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
        // initial="initial"
        // animate="in"
        // exit="out"
        // variants={pageVariants}
        // transition={pageTransition}
        style={backgroundVariants.projects}
      >
        <Header title={`工單 #${workOrderId}`} />
        <FetchDataFail
          error={error}
          onRetry={fetchWorkOrderTasks}
          className="h-64"
        />
      </motion.div>
    );
  }

  return (
    <PermissionGate
      resource="work_order"
      action="read"
      header={`工單 #${workOrderId}`}
      style={backgroundVariants.projects}
    >
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        // initial="initial"
        // animate="in"
        // exit="out"
        // variants={pageVariants}
        // transition={pageTransition}
        style={backgroundVariants.projects}
      >
        <Header title={`工單 #${workOrderId}`} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Work Order Info Card - Complete Information */}
            {workOrderInfo && (
              <motion.div
                className="glassmorphism mb-8 rounded-2xl border border-gray-100 p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <WorkOrderIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {workOrderInfo.work_order_name || `工單 #${workOrderId}`}
                    </h3>
                    <p className="text-gray-600">
                      {workOrderInfo.description || "無描述"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
                  {/*<div>*/}
                  {/*  <div className="text-sm font-medium text-gray-500">*/}
                  {/*    工單ID*/}
                  {/*  </div>*/}
                  {/*  <div className="text-lg font-semibold text-gray-900">*/}
                  {/*    #{workOrderInfo.id}*/}
                  {/*  </div>*/}
                  {/*</div>*/}
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      所屬項目
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrderInfo?.parent_project?.name || "未設定"} (
                      {workOrderInfo?.parent_project?.id || "未設定"})
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      指派給
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrderInfo.assignee?.name || "未指派"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      狀態
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                        style={{
                          backgroundColor: workOrderInfo.state?.bg_color,
                          color: workOrderInfo.state?.text_color,
                        }}
                      >
                        {iconMap[workOrderInfo.state?.icon] &&
                          React.createElement(
                            iconMap[workOrderInfo.state.icon],
                            {
                              className: "h-4 w-4",
                            },
                          )}
                        &nbsp;
                        {workOrderInfo.state?.state_name}
                      </span>
                    </div>
                  </div>

                  {/*<div>*/}
                  {/*  <div className="text-sm font-medium text-gray-500">*/}
                  {/*    工作流程*/}
                  {/*  </div>*/}
                  {/*  <div className="text-lg font-semibold text-gray-900">*/}
                  {/*    {workOrderInfo.workflow_type?.name || "未設定"}*/}
                  {/*  </div>*/}
                  {/*</div>*/}
                  {/*<div>*/}
                  {/*  <div className="text-sm font-medium text-gray-500">*/}
                  {/*    批次號*/}
                  {/*  </div>*/}
                  {/*  <div className="text-lg font-semibold text-gray-900">*/}
                  {/*    {workOrderInfo.lot?.lot_name ||*/}
                  {/*      workOrderInfo.lot_id ||*/}
                  {/*      "未設定"}*/}
                  {/*  </div>*/}
                  {/*</div>*/}

                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      預估工時
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrderInfo.estimated_hour
                        ? `${workOrderInfo.estimated_hour}h`
                        : "未設定"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      開始日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrderInfo.start_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      截止日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrderInfo.due_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      創建時間
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrderInfo.created_at)}
                    </div>
                  </div>
                  <div className={`flex justify-between`}>
                    <LogButton setShowLogModal={setShowLogModal} />
                    <PermissionGate
                      resource="work_order"
                      action="write"
                      show={false}
                    >
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="glassmorphism flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        編輯
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Statistics Cards */}
            <motion.div
              className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                className={`glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "all" ? "ring-2 ring-blue-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedStatus("all")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <WorkOrderIcon className="text-blue h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">總任務</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.totalTasks}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "active" ? "ring-2 ring-green-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                onClick={() => setSelectedStatus("active")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <ActiveIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">進行中</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.activeTasks}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "pending" ? "ring-2 ring-yellow-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                onClick={() => setSelectedStatus("pending")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <PendingIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">待開始</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.pendingTasks}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "completed" ? "ring-2 ring-red-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                onClick={() => setSelectedStatus("completed")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <CompletedIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.completedTasks}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
              className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索任務 ID、名稱或描述..."
                  className="glassmorphism w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>

            {/* Tasks List/Grid */}
            <motion.div
              className="glassmorphism overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  任務清單 ({filteredTasks.length})
                </h3>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "grid" : "list")
                  }
                  className="glassmorphism flex w-fit items-center gap-2 rounded-xl border border-gray-100 px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                >
                  {viewMode === "list" ? (
                    <ViewModule className="h-5 w-5" />
                  ) : (
                    <ViewList className="h-5 w-5" />
                  )}
                </button>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <WorkOrderIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    {searchTerm || selectedStatus !== "all"
                      ? "沒有符合條件的任務"
                      : "暫無任務資料"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          任務 ID
                        </th>
                        <th className="min-w-[100px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          任務名稱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          指派給
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          描述
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          狀態
                        </th>
                        <th className="min-w-[100px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          預估工時
                        </th>
                        <th className="min-w-[100px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          開始日期
                        </th>
                        <th className="min-w-[100px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          截止日期
                        </th>
                      </tr>
                    </thead>
                    <tbody className="glassmorphism divide-y divide-gray-200">
                      {filteredTasks.map((task, index) => (
                        <motion.tr
                          key={task.id}
                          className="cursor-pointer hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() => navigate(`/task/${task.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                                <WorkOrderIcon className="text-purple h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {task.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {task.task_name}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {task.assignee?.name || "未"}
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                            {task.description || "無描述"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold`}
                              style={{
                                backgroundColor: task.state?.bg_color,
                                color: task.state?.text_color,
                              }}
                            >
                              {iconMap[task.state?.icon] &&
                                React.createElement(iconMap[task.state.icon], {
                                  className: "h-4 w-4",
                                })}
                              &nbsp;
                              {task.state?.state_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {task.estimated_hour
                              ? `${task.estimated_hour}h`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(task.start_date)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(task.due_date)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      onClick={() => navigate(`/task/${task.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex aspect-square h-10 w-10 items-center justify-center rounded-full text-xs font-semibold`}
                            style={{
                              backgroundColor: task.state?.bg_color,
                              color: task.state?.text_color,
                            }}
                          >
                            {iconMap[task.state?.icon] &&
                              React.createElement(iconMap[task.state.icon], {
                                className: "h-5 w-5",
                              })}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {task.task_name}
                            </h4>
                            <p className="text-sm text-gray-500">#{task.id}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="line-clamp-2 text-sm text-gray-600">
                          {task.description || "無描述"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {task.assignee?.name || "未指派"}
                          </div>
                          <div className="text-xs text-gray-500">指派給</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {task.estimated_hour
                              ? `${task.estimated_hour}h`
                              : "未設定"}
                          </div>
                          <div className="text-xs text-gray-500">預估工時</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(task.start_date)}
                          </div>
                          <div className="text-xs text-gray-500">開始日期</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(task.due_date)}
                          </div>
                          <div className="text-xs text-gray-500">截止日期</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
      <ProcessLog
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        entityType="work_order"
        entityId={workOrderId}
      />
      <EditWorkOrderModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        workOrder={workOrderInfo}
        onSave={(updatedWorkOrder) => {
          setWorkOrderInfo(updatedWorkOrder);
          fetchWorkOrderTasks();
          fetchWorkOrderInfo();
        }}
      />
      <EditTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        workOrderId={workOrderId}
        onSave={() => {
          fetchWorkOrderTasks();
          fetchWorkOrderInfo();
        }}
      />

      <PermissionGate resource="task" action="create" show={false}>
        <AddButton action={() => setShowAddModal(true)} />
      </PermissionGate>
    </PermissionGate>
  );
};

export default WorkOrder;
