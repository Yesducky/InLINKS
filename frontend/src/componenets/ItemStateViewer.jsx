import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Close,
  Inventory2 as InventoryIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Numbers as NumbersIcon,
  Info as InfoIcon,
  DoneAll,
} from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner.jsx";
import api from "../services/api.js";

const ItemStateViewer = ({ transactionId, itemId, blockId, open, onClose }) => {
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
  };

  useEffect(() => {
    if (transactionId && itemId && open) {
      fetchItemState();
    }
  }, [transactionId, itemId, open]);

  const fetchItemState = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get item state at specific block
      const response = await api.getItemStateAtTransaction(
        itemId,
        transactionId,
      );

      if (response.ok) {
        const data = await response.json();
        console.log(data.state);
        setStateData(data.state);
      } else {
        setError("Failed to fetch item state");
      }
    } catch (error) {
      console.error("Error fetching item state:", error);
      setError("Error fetching item state");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200";
      case "assigned":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "used":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("zh-HK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              className="relative h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-gray-100"
              >
                <Close className="h-5 w-5 text-gray-600" />
              </button>

              {/* Content */}
              <div className="h-full p-6">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <InventoryIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      物品狀態快照
                    </h2>
                    <p className="text-sm text-gray-500">
                      區塊 #{stateData?.block_id} | 物品 #{stateData?.item_id}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex h-full w-full items-center justify-center pb-20">
                    <LoadingSpinner
                      variant="circular"
                      size={32}
                      message="載入狀態中..."
                      color={"#999999"}
                    />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <InfoIcon className="h-16 w-16 text-red-400" />
                    <p className="mt-4 text-red-500">{error}</p>
                  </div>
                ) : stateData ? (
                  <div className="space-y-4">
                    {/* Current State Card */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 font-semibold text-gray-800">
                        當前狀態
                      </h3>

                      <div className="space-y-3">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                            <DoneAll className="h-4 w-4" />
                            狀態
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium`}
                            style={{
                              backgroundColor: stateData.current_state.bg_color,
                              color: stateData.current_state.text_color,
                            }}
                          >
                            {/*{iconMap[subTaskInfo.state?.icon] &&*/}
                            {/*  React.createElement(iconMap[subTaskInfo.state.icon], {*/}
                            {/*    className: "h-4 w-4",*/}
                            {/*  })}*/}
                            {/*&nbsp;*/}
                            {stateData?.current_state?.state_name_chinese ||
                              "N/A"}
                          </span>
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                            <NumbersIcon className="h-4 w-4" />
                            數量
                          </span>
                          <span className="font-mono text-sm font-medium text-gray-800">
                            {stateData.quantity || 0}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                            <LocationIcon className="h-4 w-4" />
                            項目
                          </span>
                          <span className="text-sm text-gray-800">
                            {stateData.location || "未設定"}
                          </span>
                        </div>

                        {/* Last Update */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                            <ScheduleIcon className="h-4 w-4" />
                            時間
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(stateData.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Reference */}
                    {stateData.transaction && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <h3 className="mb-3 font-semibold text-blue-800">
                          相關交易
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-600">
                              交易ID
                            </span>
                            <span className="font-mono text-sm text-blue-800">
                              {stateData.transaction.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-600">
                              交易類型
                            </span>
                            <span className="text-sm text-blue-800">
                              {stateData.transaction.transaction_type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-600">
                              交易雜湊
                            </span>
                            <span className="max-w-[120px] font-mono text-xs break-all text-blue-700">
                              {stateData.transaction.transaction_hash}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Block Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <h3 className="mb-3 font-semibold text-gray-800">
                        區塊資訊
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            區塊ID
                          </span>
                          <span className="font-mono text-sm text-gray-800">
                            {stateData?.block?.id}
                          </span>
                        </div>
                        {stateData?.block && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">
                                區塊哈希
                              </span>
                              <span className="max-w-[120px] font-mono text-xs break-all text-gray-800">
                                #{stateData.block?.block_hash}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-600">
                                交易數量
                              </span>
                              <span className="text-sm text-gray-800">
                                {stateData.block?.transaction_count}
                              </span>
                            </div>
                            {stateData.block?.merkle_root && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">
                                  Merkle Root
                                </span>
                                <span className="max-w-[120px] font-mono text-xs break-all text-gray-800">
                                  {stateData.block.merkle_root}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <InventoryIcon className="h-16 w-16 text-gray-400" />
                    <p className="mt-4 text-gray-500">暫無狀態資料</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ItemStateViewer;
