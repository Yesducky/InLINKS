import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Close,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Update as UpdateIcon,
  Assignment as AssignmentIcon,
  Create as CreateIcon,
  AccessTime as AccessTimeIcon,
  ExpandMore,
  Inventory as InventoryIcon,
  Visibility as ViewStateIcon,
  QrCode as QrCodeIcon,
} from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner.jsx";
import ItemStateViewer from "./ItemStateViewer.jsx";
import api from "../services/api.js";

const BlockchainViewer = ({ itemId, open, onClose }) => {
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAccordion, setExpandedAccordion] = useState(null);
  const [stateViewerOpen, setStateViewerOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // Modal animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants = {
    hidden: { y: "100%" },
    visible: {
      y: "0%",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      y: "100%",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
  };

  useEffect(() => {
    if (itemId && open) {
      fetchBlockchainHistory();
    }
  }, [itemId, open]);

  const fetchBlockchainHistory = async () => {
    try {
      setLoading(true);
      const response = await api.getItemBlockchainHistory(itemId);

      if (response.ok) {
        const data = await response.json();
        setBlockchainData(data);
      } else {
        console.error("Failed to fetch blockchain data");
      }
    } catch (error) {
      console.error("Error fetching blockchain history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    const iconProps = { className: "h-5 w-5" };
    switch (type?.toUpperCase()) {
      case "CREATE":
        return <CreateIcon {...iconProps} style={{ color: "#10b981" }} />;
      case "UPDATE":
        return <UpdateIcon {...iconProps} style={{ color: "#3b82f6" }} />;
      case "SPLIT":
        return <TimelineIcon {...iconProps} style={{ color: "#f59e0b" }} />;
      case "ASSIGN":
        return <AssignmentIcon {...iconProps} style={{ color: "#8b5cf6" }} />;
      case "TRANSFER":
        return <CheckCircleIcon {...iconProps} style={{ color: "#ec4899" }} />;
      case "SCAN":
        return <QrCodeIcon {...iconProps} style={{ color: "#f97316" }} />;
      case "SCAN VERIFY":
        return <QrCodeIcon {...iconProps} style={{ color: "#ec4899" }} />;
      case "TASK_STATE_CHANGE":
        return <AssignmentIcon {...iconProps} style={{ color: "#6b7280 " }} />;
      default:
        return <AccessTimeIcon {...iconProps} style={{ color: "#6b7280" }} />;
    }
  };

  const formatTransactionData = (transaction) => {
    const changes = [];

    if (transaction.old_quantity !== transaction.new_quantity) {
      changes.push({
        label: "數量",
        old: transaction.old_quantity || 0,
        new: transaction.new_quantity,
        type: "quantity",
      });
    }

    if (
      transaction.old_state?.state_name !== transaction.new_state?.state_name
    ) {
      changes.push({
        label: "狀態",
        old: transaction.old_state?.state_name_chinese || "未設定",
        new: transaction.new_state?.state_name_chinese,
        type: "state",
      });
    }

    if (transaction.old_location !== transaction.new_location) {
      changes.push({
        label: "任務",
        old: transaction.old_location || "未設定",
        new: transaction.new_location || "未設定",
        type: "location",
      });
    }

    return changes;
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

  const handleViewState = (blockId) => {
    setSelectedBlockId(blockId);
    setStateViewerOpen(true);
  };

  const closeStateViewer = () => {
    setStateViewerOpen(false);
    setSelectedBlockId(null);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Bottom Sheet */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 h-[85%] rounded-t-3xl bg-white shadow-2xl"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="h-1 w-12 rounded-full bg-gray-300"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-gray-100"
        >
          <Close className="h-5 w-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="h-full overflow-y-auto px-6 pt-8 pb-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <TimelineIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  區塊鏈歷史記錄
                </h2>
                <p className="text-sm text-gray-500">物品 #{itemId}</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner
                  variant="circular"
                  size={40}
                  message="載入區塊鏈資料中..."
                  color={`#999999`}
                />
              </div>
            ) : !blockchainData || !blockchainData.blockchain_history ? (
              <div className="flex flex-col items-center justify-center py-12">
                <InventoryIcon className="h-16 w-16 text-gray-400" />
                <p className="mt-4 text-gray-500">暫無區塊鏈資料</p>
              </div>
            ) : (
              <>
                {/* Item Info & Current Status */}
                {blockchainData.item && (
                  <div className="glassmorphism rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="mb-3 font-semibold text-gray-800">
                      物品資訊
                    </h3>
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        {blockchainData.item.material_type}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {blockchainData.item.id}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                        style={{
                          backgroundColor:
                            blockchainData.item.current_state.bg_color,
                          color: blockchainData.item.current_state.text_color,
                        }}
                      >
                        {/*{iconMap[subTaskInfo.state?.icon] &&*/}
                        {/*  React.createElement(iconMap[subTaskInfo.state.icon], {*/}
                        {/*    className: "h-4 w-4",*/}
                        {/*  })}*/}
                        {/*&nbsp;*/}
                        {blockchainData.item.current_state.state_name_chinese}
                      </span>
                      {blockchainData.item.current_quantity && (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
                          數量: {blockchainData.item.current_quantity}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                <div className="glassmorphism rounded-xl border border-gray-100 shadow-sm">
                  <div className="rounded-t-xl border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <h3 className="font-semibold text-gray-800">
                      物品歷史 ({blockchainData.blockchain_history.length})
                    </h3>
                  </div>

                  <div className="space-y-0 p-4">
                    {blockchainData.blockchain_history.map(
                      (transaction, index) => {
                        const changes = formatTransactionData(transaction);
                        const isExpanded = expandedAccordion === index;
                        const isLast =
                          index ===
                          blockchainData.blockchain_history.length - 1;

                        return (
                          <div
                            key={transaction.id || index}
                            className="relative flex"
                          >
                            {/* Timeline Line and Circle */}
                            <div className="mr-4 flex flex-shrink-0 flex-col items-center">
                              {/* Circle with Icon */}
                              <div className="border-blue z-10 my-1 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white shadow-sm">
                                {getTransactionIcon(
                                  transaction.transaction_type,
                                )}
                              </div>
                              {/* Vertical Line - extends through expanded content */}
                              {!isLast && (
                                <div
                                  className={`my-0.5 w-0.5 bg-gray-300 ${isExpanded ? "min-h-[8rem] flex-1" : "h-13"}`}
                                ></div>
                              )}
                            </div>

                            {/* Transaction Content - constrained width */}
                            <div className="min-w-0 flex-1 pb-8">
                              <motion.div
                                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <button
                                  className="w-full rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50"
                                  onClick={() =>
                                    setExpandedAccordion(
                                      isExpanded ? null : index,
                                    )
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium text-gray-900">
                                        {transaction.transaction_type ||
                                          "未知操作"}
                                      </p>
                                      <p className="truncate text-sm text-gray-500">
                                        {formatDateTime(transaction.timestamp)}
                                      </p>
                                    </div>
                                    <motion.div
                                      animate={{
                                        rotate: isExpanded ? 180 : 0,
                                      }}
                                      transition={{ duration: 0.2 }}
                                      className="ml-2 flex-shrink-0"
                                    >
                                      <ExpandMore className="h-5 w-5 text-gray-400" />
                                    </motion.div>
                                  </div>
                                </button>
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="border-t border-gray-100 px-4 py-3">
                                        <div className="space-y-3">
                                          {transaction.transaction_hash && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 uppercase">
                                                交易哈希
                                              </p>
                                              <p className="mt-1 font-mono text-sm break-all text-gray-700">
                                                {transaction.transaction_hash}
                                              </p>
                                            </div>
                                          )}
                                          {transaction.user && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 uppercase">
                                                操作用戶
                                              </p>
                                              <p className="mt-1 text-sm text-gray-700">
                                                {transaction.user.username} (ID:{" "}
                                                {transaction.user.id})
                                              </p>
                                            </div>
                                          )}
                                          {changes.length > 0 && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-500 uppercase">
                                                變更記錄
                                              </p>
                                              <div className="mt-2 space-y-2">
                                                {changes.map((change, idx) => (
                                                  <div
                                                    key={idx}
                                                    className="rounded bg-gray-50 p-2"
                                                  >
                                                    <p className="text-sm font-medium text-gray-700">
                                                      {change.label}
                                                    </p>
                                                    <p className="text-sm break-all text-gray-600">
                                                      {change.old} →{" "}
                                                      {change.new}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* View State Button */}
                                          <div className="border-t border-gray-100 pt-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewState(
                                                  transaction.id ||
                                                    `block-${index}`,
                                                );
                                              }}
                                              className="flex w-full items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                                            >
                                              <ViewStateIcon className="h-4 w-4" />
                                              查看物品狀態
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Item State Viewer Modal */}
                <ItemStateViewer
                  transactionId={selectedBlockId}
                  itemId={itemId}
                  blockId={selectedBlockId}
                  open={stateViewerOpen}
                  onClose={closeStateViewer}
                />
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BlockchainViewer;
