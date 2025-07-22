import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, User, Activity, AlertCircle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import FetchDataFail from "./FetchDataFail";

const ProcessLog = ({ isOpen, onClose, entityType, entityId }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && entityId) {
      fetchLogs();
    }
  }, [isOpen, entityId]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("token");

      // Build query parameters based on entity type
      const params = new URLSearchParams();
      switch (entityType) {
        case "project":
          params.append("project_id", entityId);
          break;
        case "workorder":
          params.append("work_order_id", entityId);
          break;
        case "task":
          params.append("task_id", entityId);
          break;
        case "subtask":
          params.append("subtask_id", entityId);
          break;
      }

      const response = await fetch(
        `/api/get_process_logs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const logsData = await response.json();
        setLogs(Array.isArray(logsData) ? logsData : []);
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError("Network error loading logs");
      console.error("Error fetching logs:", err);
    } finally {
      setIsLoading(false);
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
      second: "2-digit",
    });
  };

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case "create":
      case "created":
        return <Activity className="h-4 w-4 text-green-500" />;
      case "update":
      case "updated":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "delete":
      case "deleted":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case "create":
      case "created":
        return "bg-green-100 text-green-800";
      case "update":
      case "updated":
        return "bg-blue-100 text-blue-800";
      case "delete":
      case "deleted":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionText = (action) => {
    switch (action?.toLowerCase()) {
      case "create":
      case "created":
        return "創建";
      case "update":
      case "updated":
        return "更新";
      case "delete":
      case "deleted":
        return "刪除";
      default:
        return action || "操作";
    }
  };

  const getEntityTitle = () => {
    const titles = {
      project: "項目",
      workorder: "工單",
      task: "任務",
      subtask: "子任務",
    };
    return titles[entityType] || "記錄";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative h-4/5 max-h-[1000px] w-[90%] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {getEntityTitle()} #{entityId} - 日誌
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-full flex-col">
              {isLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <LoadingSpinner
                    variant="circular"
                    size={30}
                    message="載入記錄中..."
                  />
                </div>
              ) : error ? (
                <div className="flex flex-1 items-center justify-center">
                  <FetchDataFail
                    error={error}
                    onRetry={fetchLogs}
                    className="h-64"
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pb-30">
                  {logs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500">
                      <Activity className="mb-2 h-12 w-12" />
                      <p>暫無操作記錄</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flow-root">
                        <ul className="-mb-8">
                          {logs.map((log, index) => (
                            <li key={log.id || index}>
                              <div className="relative pb-8">
                                {index !== logs.length - 1 && (
                                  <span
                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                  />
                                )}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span
                                      className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${getActionColor(log.action)}`}
                                    >
                                      {getActionIcon(log.action)}
                                    </span>
                                  </div>
                                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                      <p className="text-sm text-gray-900">
                                        <span className="font-medium">
                                          {log.user?.name || "系統"}
                                        </span>
                                        <span className="mx-1">
                                          {getActionText(log.action)}了
                                        </span>
                                        <span className="font-medium">
                                          {getEntityTitle()}
                                        </span>
                                        {log.field_name && (
                                          <span className="text-gray-600">
                                            {" "}
                                            (字段: {log.field_name})
                                          </span>
                                        )}
                                      </p>
                                      {log.old_value && log.new_value && (
                                        <div className="mt-1 text-sm text-gray-600">
                                          <span className="text-red-600 line-through">
                                            {log.old_value}
                                          </span>
                                          <span className="mx-2">→</span>
                                          <span className="text-green-600">
                                            {log.new_value}
                                          </span>
                                        </div>
                                      )}
                                      {log.description && (
                                        <p className="mt-1 text-sm text-gray-600">
                                          {log.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                      <time dateTime={log.created_at}>
                                        {formatDate(log.created_at)}
                                      </time>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProcessLog;
