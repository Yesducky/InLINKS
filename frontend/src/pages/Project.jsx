import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import {
  Assignment,
  Search,
  ViewList,
  ViewModule,
  CheckCircle,
  HourglassEmpty,
  HourglassFull,
  ListAlt,
} from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import ProcessLog from "../componenets/ProcessLog";

const Project = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showLogModal, setShowLogModal] = useState(false);

  const [stats, setStats] = useState({
    totalWorkOrders: 0,
    activeWorkOrders: 0,
    completedWorkOrders: 0,
    pendingWorkOrders: 0,
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
    fetchProjectWorkOrders();
    fetchProjectInfo();
  }, [projectId]);

  const fetchProjectWorkOrders = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/projects/${projectId}/work_orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const workOrdersData = await response.json();

        // Ensure workOrdersData is always an array
        const workOrders = Array.isArray(workOrdersData) ? workOrdersData : [];
        setWorkOrders(workOrders);

        // Calculate stats
        const totalWorkOrders = workOrders.length;
        const activeWorkOrders = workOrders.filter(
          (wo) => wo.status === "active",
        ).length;
        const completedWorkOrders = workOrders.filter(
          (wo) => wo.status === "completed",
        ).length;
        const pendingWorkOrders = workOrders.filter(
          (wo) => wo.status === "pending",
        ).length;

        setStats({
          totalWorkOrders,
          activeWorkOrders,
          completedWorkOrders,
          pendingWorkOrders,
        });
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError("Network error loading work orders");
      console.error("Error fetching work orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        console.log("Project Data:", projectData);
        setProjectInfo(projectData);
      }
    } catch (err) {
      console.error("Error fetching project info:", err);
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
      default:
        return "未知";
    }
  };

  // Filter work orders based on search term and status
  const filteredWorkOrders = workOrders.filter((workOrder) => {
    const matchesSearch =
      workOrder.id
        ?.toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      workOrder.work_order_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      workOrder.lot_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workOrder.assignee?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (selectedStatus !== "all") {
      matchesStatus = workOrder.state === selectedStatus;
    }

    return matchesSearch && matchesStatus;
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
        <Header title={`項目 #${projectId}`} />
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
        <Header title={`項目 #${projectId}`} />
        <FetchDataFail
          error={error}
          onRetry={fetchProjectWorkOrders}
          className="h-64"
        />
      </motion.div>
    );
  }

  return (
    <PermissionGate
      resource="project"
      action="read"
      header={`項目 #${projectId}`}
    >
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={`項目 #${projectId}`} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Project Info Card - Complete Information */}
            {projectInfo && (
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
                    <h3 className="text-lg font-semibold text-gray-800">
                      {projectInfo.project_name || `項目 #${projectId}`}
                    </h3>
                    <p className="text-gray-600">
                      {projectInfo.description || "無描述"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      項目ID
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      #{projectInfo.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      負責人
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {projectInfo.person_in_charge_name || "未指派"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      優先級
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          projectInfo.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : projectInfo.priority === "medium"
                              ? "bg-orange-100 text-orange-800"
                              : projectInfo.priority === "low"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {projectInfo.priority === "high"
                          ? "高"
                          : projectInfo.priority === "medium"
                            ? "中"
                            : projectInfo.priority === "low"
                              ? "低"
                              : "未知"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      狀態
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          projectInfo.state === "active"
                            ? "bg-green-100 text-green-800"
                            : projectInfo.state === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : projectInfo.state === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {projectInfo.state === "active"
                          ? "進行中"
                          : projectInfo.state === "completed"
                            ? "已完成"
                            : projectInfo.state === "pending"
                              ? "待開始"
                              : "未知"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      開始日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(projectInfo.start_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      結束日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(projectInfo.due_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      創建時間
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(projectInfo.created_at)}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => setShowLogModal(true)}
                      className="text-blue mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium hover:bg-blue-200"
                    >
                      <Assignment className="h-5 w-5" />
                      查看日誌
                    </button>
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
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "all" ? "ring-2 ring-blue-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedStatus("all")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Assignment className="text-blue h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">總工單</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.totalWorkOrders}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "active" ? "ring-2 ring-green-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                onClick={() => setSelectedStatus("active")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">進行中</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.activeWorkOrders}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "pending" ? "ring-2 ring-yellow-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                onClick={() => setSelectedStatus("pending")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <HourglassEmpty className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">待開始</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.pendingWorkOrders}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "completed" ? "ring-2 ring-blue-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                onClick={() => setSelectedStatus("completed")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <HourglassFull className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.completedWorkOrders}
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
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索工單 ID、名稱或批次號..."
                  className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>

            {/* Work Orders List/Grid */}
            <motion.div
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  工單清單 ({filteredWorkOrders.length})
                </h3>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "grid" : "list")
                  }
                  className="flex w-fit items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                >
                  {viewMode === "list" ? (
                    <ViewModule className="h-5 w-5" />
                  ) : (
                    <ViewList className="h-5 w-5" />
                  )}
                </button>
              </div>

              {filteredWorkOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <ListAlt className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    {searchTerm || selectedStatus !== "all"
                      ? "沒有符合條件的工單"
                      : "暫無工單資料"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          工單 ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          工單名稱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          指派給
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          批次號
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          工作流程
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          狀態
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          預估工時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          開始日期
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          截止日期
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          創建時間
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredWorkOrders.map((workOrder, index) => (
                        <motion.tr
                          key={workOrder.id}
                          className="cursor-pointer hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() => navigate(`/workorder/${workOrder.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                                <ListAlt className="text-purple h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {workOrder.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {workOrder.work_order_name}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {workOrder.assignee?.name || "未指派"}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {workOrder.lot?.lot_name ||
                              workOrder.lot_id ||
                              "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {workOrder.workflow_type?.name ||
                              workOrder.workflow_type_id ||
                              "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                workOrder.state,
                              )}`}
                            >
                              {getStatusIcon(workOrder.state)}
                              {getStatusText(workOrder.state)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {workOrder.estimated_hour
                              ? `${workOrder.estimated_hour}h`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(workOrder.start_date)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(workOrder.due_date)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(workOrder.created_at)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorkOrders.map((workOrder, index) => (
                    <motion.div
                      key={workOrder.id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      onClick={() => navigate(`/workorder/${workOrder.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex aspect-square h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${getStatusColor(
                              workOrder.state,
                            )}`}
                          >
                            {getStatusIcon(workOrder.state)}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {workOrder.work_order_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {workOrder.workflow_type}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {workOrder.assignee?.name || "未指派"}
                          </div>
                          <div className="text-xs text-gray-500">指派給</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {workOrder.lot?.lot_name ||
                              workOrder.lot_id ||
                              "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">批次號</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(workOrder.start_date)}
                          </div>
                          <div className="text-xs text-gray-500">開始日期</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(workOrder.due_date)}
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
        entityType="project"
        entityId={projectId}
      />
    </PermissionGate>
  );
};

export default Project;
