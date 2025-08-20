import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Close, Print } from "@mui/icons-material";
import PrintLabelDetail from "./PrintLabelDetail.jsx";
import ScanLabel from "./ScanLabel.jsx";
import api from "../services/api.js";
import { QrCodeIcon } from "../componenets/CustomIcons.jsx";

const PrintLabel = ({ task, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPrinted, setShowPrinted] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPrintDetail, setShowPrintDetail] = useState(false);
  const [showScanLabel, setShowScanLabel] = useState(false);

  useEffect(() => {
    if (task?.id) {
      fetchTaskItems();
    }
  }, [task?.id]);

  const fetchTaskItems = async () => {
    try {
      setLoading(true);
      const response = await api.getItemsByTaskId(task.id);

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        //if item are all printed set showPrinted to true
        if (data.items && data.items.length > 0) {
          const allPrinted = data.items.every(
            (item) => (item.label_count || 0) > 0,
          );
          setShowPrinted(allPrinted);
        }
      }
    } catch (error) {
      console.error("Error fetching task items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
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
    //window confirm
    if (
      !window.confirm(
        `確定要生成 ${filteredItems.length} 個物品的合併標籤 PDF 嗎？ ${showPrinted ? "（包括已打印的物品）" : "（僅未打印的物品）"}`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Use new bulk API to generate single PDF with filtered items
      const response = await api.printAllLabelsByTaskId(task.id, showPrinted);

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

  const handleScanSuccess = () => {
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
                標籤狀態
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
              <div className="flex items-center space-x-2">
                <label className="flex cursor-pointer items-center">
                  <span className="mr-2 text-sm text-gray-500">未打印</span>
                  <input
                    type="checkbox"
                    checked={showPrinted}
                    onChange={toggleShowPrinted}
                    className="sr-only"
                  />
                  <div
                    className={`border-blue flex h-5 w-10 items-center rounded-full border-2 duration-300 ease-in-out ${showPrinted ? "bg-blue-200" : ""}`}
                  >
                    <div
                      className={`bg-blue h-4 w-4 transform rounded-full border-1 border-blue-200 shadow-md duration-300 ease-in-out ${showPrinted ? "translate-x-5" : ""}`}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-500">全部</span>
                </label>
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
                    <div className="grid grid-cols-8 gap-4 text-xs">
                      <div className={`col-span-2`}>
                        <span className="text-gray-500">類型</span>
                        <p className="font-medium">{item.material_type_name}</p>
                      </div>
                      <div className={`col-span-2`}>
                        <span className="text-gray-500">編號</span>
                        <p className="font-medium">{item.id}</p>
                      </div>
                      <div className={`col-span-2`}>
                        <span className="text-gray-500">數量</span>
                        <p className="font-medium">
                          {item.quantity}&nbsp;
                          {item.material_unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">打印</span>
                        <p
                          className={`text-center font-medium ${(item.label_count || 0) === 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          ⬤
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">掃描</span>{" "}
                        <p
                          className={`text-center font-medium ${
                            (item?.scan || 0) === 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {/*{(item.label_count || 0) === 0*/}
                          {/*  ? "未打印"*/}
                          {/*  : `已打印 (${item.label_count})`}*/}⬤
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

      <div className="fixed bottom-3 left-3 flex items-center gap-2">
        <button
          onClick={handlePrintAll}
          disabled={loading || filteredItems.length === 0}
          className="bg-blue rounded-full px-4 py-4 text-sm font-medium text-white shadow-2xl transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          <Print fontSize="large" />
        </button>
      </div>
      <div className="fixed right-3 bottom-3 flex items-center gap-2">
        <button
          onClick={() => setShowScanLabel(true)}
          className="flex w-fit rounded-full bg-gray-900 px-4 py-4 text-sm font-medium text-white shadow-2xl transition-colors hover:bg-gray-800"
        >
          <QrCodeIcon className={`w-10`} />
        </button>
      </div>

      {/* Print Label Detail Modal */}
      <AnimatePresence>
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
        {showScanLabel && (
          <ScanLabel
            taskId={task.id}
            onClose={() => setShowScanLabel(false)}
            onScanSuccess={handleScanSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PrintLabel;
