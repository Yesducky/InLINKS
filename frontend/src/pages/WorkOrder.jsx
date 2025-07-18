import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import ProcessLog from "../componenets/ProcessLog.jsx";
import {
  Assignment,
  Person,
  Schedule,
  HourglassEmpty,
  CheckCircle,
  HourglassFull,
  ListAlt,
  Category,
  ArrowBack,
  Timeline,
  Task as TaskIcon,
  PriorityHigh,
  Info,
} from "@mui/icons-material";

const WorkOrder = () => {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogModal, setShowLogModal] = useState(false);

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
    fetchWorkOrderDetails();
    fetchWorkOrderTasks();
  }, [workOrderId]);

  const fetchWorkOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/work_orders/${workOrderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const workOrderData = await response.json();
        setWorkOrder(workOrderData);
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError("Network error loading work order details");
      console.error("Error fetching work order:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkOrderTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = `/api/work_orders/${workOrderId}/tasks`;
      let tasksData = [];
      try {
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          tasksData = Array.isArray(data) ? data : data.tasks || [];
        }
      } catch (e) {
        // fallback: no tasks
      }

      setTasks(tasksData);
    } catch (err) {
      console.error("Error fetching work order tasks:", err);
      setTasks([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <HourglassFull className="h-4 w-4" />;
      case "pending":
        return <HourglassEmpty className="h-4 w-4" />;
      case "cancelled":
        return <PriorityHigh className="h-4 w-4" />;
      default:
        return <ListAlt className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "進行中";
      case "completed":
        return "已完成";
      case "pending":
        return "待開始";
      case "cancelled":
        return "已取消";
      default:
        return "未知";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return "未知";
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "done":
        return "bg-green-100 text-green-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskStatusText = (status) => {
    switch (status) {
      case "todo":
        return "待辦";
      case "in_progress":
        return "進行中";
      case "done":
        return "已完成";
      case "blocked":
        return "阻塞";
      default:
        return status;
    }
  };

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
        <Header title={`工單 #${workOrderId}`} />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中" />
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
        <Header title={`工單 #${workOrderId} - 詳細資訊`} />
        <FetchDataFail
          error={error}
          onRetry={fetchWorkOrderDetails}
          className="h-64"
        />
      </motion.div>
    );
  }

  return (
    <PermissionGate
      resource="project"
      action="read"
      header={`工單 #${workOrderId} - 詳細資訊`}
    >
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={`工單 #${workOrderId}`} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Back Button */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50"
              >
                <ArrowBack className="h-4 w-4" />
                返回
              </button>
            </motion.div>

            {/* Work Order Basic Info */}
            {workOrder && (
              <motion.div
                className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <Assignment className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {workOrder.work_order_name || `工單 #${workOrderId}`}
                    </h3>
                    <p className="text-gray-600">
                      {workOrder.description || "無描述"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <ListAlt className="h-4 w-4" />
                      工單ID
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      #{workOrder.id}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Person className="h-4 w-4" />
                      指派給
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrder.assignee?.name || "未指派"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Category className="h-4 w-4" />
                      批次號
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrder.lot?.lot_name || workOrder.lot_id || "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Timeline className="h-4 w-4" />
                      工作流程
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrder.workflow_type?.name ||
                        workOrder.workflow_type_id ||
                        "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Info className="h-4 w-4" />
                      狀態
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                          workOrder.state,
                        )}`}
                      >
                        {getStatusIcon(workOrder.state)}
                        {getStatusText(workOrder.state)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <PriorityHigh className="h-4 w-4" />
                      優先級
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                          workOrder.priority,
                        )}`}
                      >
                        {getPriorityText(workOrder.priority)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <HourglassEmpty className="h-4 w-4" />
                      預估工時
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {workOrder.estimated_hour
                        ? `${workOrder.estimated_hour}h`
                        : "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Schedule className="h-4 w-4" />
                      開始日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrder.start_date)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Schedule className="h-4 w-4" />
                      截止日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrder.due_date)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                      <Schedule className="h-4 w-4" />
                      創建時間
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(workOrder.created_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    更新時間：{formatDate(workOrder.updated_at)}
                  </div>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                  >
                    <Assignment className="h-5 w-5" />
                    查看日誌
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tasks Section */}
            <motion.div
              className="rounded-2xl border border-gray-100 bg-white shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <TaskIcon className="h-5 w-5" />
                  任務清單 ({tasks.length})
                </h3>
              </div>

              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <TaskIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">暫無任務資料</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      className="p-6 hover:bg-gray-50"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.2 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              {task.task_name}
                            </h4>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskStatusColor(
                                task.status,
                              )}`}
                            >
                              {getTaskStatusText(task.status)}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-2 text-sm text-gray-600">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <div className="text-sm font-medium text-gray-500">
                                指派給
                              </div>
                              <div className="text-sm text-gray-900">
                                {task.assignee?.name || "未指派"}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-500">
                                預估工時
                              </div>
                              <div className="text-sm text-gray-900">
                                {task.estimated_hours
                                  ? `${task.estimated_hours}h`
                                  : "N/A"}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-500">
                                開始日期
                              </div>
                              <div className="text-sm text-gray-900">
                                {formatDate(task.start_date)}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-medium text-gray-500">
                                截止日期
                              </div>
                              <div className="text-sm text-gray-900">
                                {formatDate(task.due_date)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-gray-500">
                            創建時間：{formatDate(task.created_at)} | 更新時間：
                            {formatDate(task.updated_at)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Process Log Section */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <ProcessLog entityType="work_order" entityId={workOrderId} />
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
    </PermissionGate>
  );
};

export default WorkOrder;
