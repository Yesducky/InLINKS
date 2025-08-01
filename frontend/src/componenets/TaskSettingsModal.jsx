import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const TaskSettingsModal = ({
  isOpen,
  onClose,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  statusFilter,
  setStatusFilter,
}) => {
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -50 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: -50 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-[80%] rounded-2xl bg-white p-6 shadow-2xl"
            variants={modalVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                任務篩選器
              </h2>
            </div>

            {/* Sorting Options */}
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-800">
                  排序方式
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="sortBy"
                      value="start_date"
                      checked={sortBy === "start_date"}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-blue focus:text-lightblue h-4 w-4"
                    />
                    <span className="text-gray-700">按開始日期</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="sortBy"
                      value="due_date"
                      checked={sortBy === "due_date"}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-blue focus:text-lightblue h-4 w-4"
                    />
                    <span className="text-gray-700">按截止日期</span>
                  </label>
                </div>
              </div>
              {/* Sort Order */}
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-800">
                  排序順序
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="sortOrder"
                      value="asc"
                      checked={sortOrder === "asc"}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="text-blue focus:text-lightblue h-4 w-4"
                    />
                    <span className="text-gray-700">升序（由早到晚）</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="sortOrder"
                      value="desc"
                      checked={sortOrder === "desc"}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="text-blue focus:text-lightblue h-4 w-4"
                    />
                    <span className="text-gray-700">降序（由晚到早）</span>
                  </label>
                </div>
              </div>
              {/* Status Filter */}
              <div>
                <h3 className="mb-3 text-lg font-medium text-gray-800">
                  狀態篩選
                </h3>
                <div className="space-y-3">
                  {Array.isArray(statusFilter) && statusFilter.length > 0 ? (
                    statusFilter.map((status) => (
                      <label
                        key={status}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStatusFilter([...statusFilter, status]);
                            } else {
                              setStatusFilter(
                                statusFilter.filter((s) => s !== status),
                              );
                            }
                          }}
                          className="text-blue focus:text-lightblue h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-gray-700">{status}</span>
                      </label>
                    ))
                  ) : (
                    <span className="text-gray-500">無可用狀態</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskSettingsModal;
