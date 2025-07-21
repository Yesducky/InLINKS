import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  User,
  Activity,
  AlertCircle,
  Package,
  Archive,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import FetchDataFail from "./FetchDataFail";

const StockLog = ({ isOpen, onClose, entityType, entityId }) => {
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
        case "item":
          params.append("item_id", entityId);
          break;
        case "lot":
          params.append("lot_id", entityId);
          break;
        case "carton":
          params.append("carton_id", entityId);
          break;
      }

      const response = await fetch(`/api/get_stock_logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

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

  const getActionIcon = (description) => {
    const desc = description?.toLowerCase() || "";
    if (
      desc.includes("create") ||
      desc.includes("created") ||
      desc.includes("新增")
    ) {
      return <Activity className="h-4 w-4 text-green-500" />;
    } else if (
      desc.includes("update") ||
      desc.includes("updated") ||
      desc.includes("更新")
    ) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    } else if (
      desc.includes("delete") ||
      desc.includes("deleted") ||
      desc.includes("刪除")
    ) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (
      desc.includes("assign") ||
      desc.includes("assigned") ||
      desc.includes("分配")
    ) {
      return <Package className="h-4 w-4 text-purple-500" />;
    } else if (
      desc.includes("move") ||
      desc.includes("moved") ||
      desc.includes("移動")
    ) {
      return <Archive className="h-4 w-4 text-orange-500" />;
    } else {
      return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (description) => {
    const desc = description?.toLowerCase() || "";
    if (
      desc.includes("create") ||
      desc.includes("created") ||
      desc.includes("新增")
    ) {
      return "bg-green-100 text-green-800";
    } else if (
      desc.includes("update") ||
      desc.includes("updated") ||
      desc.includes("更新")
    ) {
      return "bg-blue-100 text-blue-800";
    } else if (
      desc.includes("delete") ||
      desc.includes("deleted") ||
      desc.includes("刪除")
    ) {
      return "bg-red-100 text-red-800";
    } else if (
      desc.includes("assign") ||
      desc.includes("assigned") ||
      desc.includes("分配")
    ) {
      return "bg-purple-100 text-purple-800";
    } else if (
      desc.includes("move") ||
      desc.includes("moved") ||
      desc.includes("移動")
    ) {
      return "bg-orange-100 text-orange-800";
    } else {
      return "bg-gray-100 text-gray-800";
    }
  };

  const getEntityTitle = () => {
    const titles = {
      item: "物品",
      lot: "批次",
      carton: "紙箱",
    };
    return titles[entityType] || "庫存";
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case "item":
        return <Package className="h-5 w-5" />;
      case "lot":
        return <Archive className="h-5 w-5" />;
      case "carton":
        return <Archive className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
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
              <div className="flex items-center space-x-2">
                {getEntityIcon()}
                <h2 className="text-lg font-semibold text-gray-800">
                  {getEntityTitle()} #{entityId} - 庫存日誌
                </h2>
              </div>
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
                    message="載入庫存記錄中..."
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
                <div className="flex-1 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500">
                      <Activity className="mb-2 h-12 w-12" />
                      <p>暫無庫存記錄</p>
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
                                  <div className="">
                                    <span
                                      className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${getActionColor(log.description)}`}
                                    >
                                      {getActionIcon(log.description)}
                                    </span>
                                  </div>
                                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                      <p className="text-sm text-gray-900">
                                        <span className="font-medium">
                                          {log.user_id || "系統"}
                                        </span>
                                        <span className="mx-1">執行了</span>
                                        <span className="font-medium">
                                          {log.description || "庫存操作"}
                                        </span>
                                      </p>

                                      {/* Display related entities */}
                                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                        {log.item_id && (
                                          <span className="text-blue rounded bg-blue-100 px-2 py-1">
                                            物品: {log.item_id}
                                          </span>
                                        )}
                                        {log.lot_id && (
                                          <span className="rounded bg-fuchsia-100 px-2 py-1 text-fuchsia-800">
                                            批次: {log.lot_id}
                                          </span>
                                        )}
                                        {log.carton_id && (
                                          <span className="rounded bg-violet-100 px-2 py-1 text-violet-800">
                                            紙箱: {log.carton_id}
                                          </span>
                                        )}
                                        {log.task_id && (
                                          <span className="rounded bg-orange-100 px-2 py-1 text-orange-800">
                                            任務: {log.task_id}
                                          </span>
                                        )}
                                      </div>
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

export default StockLog;
