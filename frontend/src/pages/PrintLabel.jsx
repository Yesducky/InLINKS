import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Close } from "@mui/icons-material";
import PrintLabelDetail from "./PrintLabelDetail.jsx";

const PrintLabel = ({ task, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrinted, setShowPrinted] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPrintDetail, setShowPrintDetail] = useState(false);

  useEffect(() => {
    if (task?.id) {
      fetchTaskItems();
    }
  }, [task?.id]);

  const fetchTaskItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching task items:", error);
      setItems([]);
    } finally {
      setLoading(false);
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

  const toggleShowPrinted = () => {
    setShowPrinted(!showPrinted);
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowPrintDetail(true);
  };

  const handlePrintAll = async () => {
    if (filteredItems.length === 0) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Use new bulk API to generate single PDF with filtered items
      const response = await fetch(`/api/tasks/${task.id}/print-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          show_printed: showPrinted,
        }),
      });

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

        fetchTaskItems(); // Refresh to show updated counts
        alert(`已生成包含 ${filteredItems.length} 個物品的合併標籤 PDF`);
      } else {
        // Try to parse JSON error, but handle non-JSON responses gracefully
        try {
          const error = await response.json();
          alert(error.error || "生成PDF失敗");
        } catch (jsonError) {
          // If response is not JSON, use status text
          alert(`生成PDF失敗: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error printing all items:", error);
      alert("生成合併PDF時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSuccess = () => {
    // Refresh items after printing
    fetchTaskItems();
  };

  const filteredItems = showPrinted
    ? items
    : items.filter((item) => (item.label_count || 0) === 0);

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

  if (!task) return null;

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
        className="absolute right-0 bottom-0 left-0 h-[80%] rounded-t-3xl bg-white shadow-2xl"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
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
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                打印標籤
              </h1>
              <p className="text-sm text-gray-500">
                {task.task_name} - {task.id}
              </p>
            </div>

            {/* Toggle Printed Items and Print All */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">
                物品列表 ({filteredItems.length})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrintAll}
                  disabled={loading || filteredItems.length === 0}
                  className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  打印全部
                </button>
                <button
                  onClick={toggleShowPrinted}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    showPrinted
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {showPrinted ? "顯示全部" : "隱藏已打印"}
                </button>
              </div>
            </div>

            {/* Items List */}
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="space-y-2">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={index}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
                    onClick={() => handleItemClick(item)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="grid grid-cols-6 gap-4 text-xs">
                      <div className={`col-span-2`}>
                        <span className="text-gray-500">類型</span>
                        <p className="font-medium">{item.material_type_name}</p>
                      </div>
                      <div className={`col-span-2`}>
                        <span className="text-gray-500">編號</span>
                        <p className="font-medium">{item.id}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">數量</span>
                        <p className="font-medium">
                          {item.quantity}
                          {item.material_unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">狀態</span>
                        <p
                          className={`font-medium ${
                            (item.label_count || 0) === 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {(item.label_count || 0) === 0
                            ? "未打印"
                            : `已打印 (${item.label_count})`}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-8 text-center">
                <p className="text-gray-500">
                  {showPrinted ? "暫無物品" : "所有物品已打印"}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Print Label Detail Modal */}
      {showPrintDetail && selectedItem && (
        <PrintLabelDetail
          item={selectedItem}
          taskId={task.id}
          onClose={() => {
            setShowPrintDetail(false);
            setSelectedItem(null);
          }}
          onPrintSuccess={handlePrintSuccess}
        />
      )}
    </motion.div>
  );
};

export default PrintLabel;
