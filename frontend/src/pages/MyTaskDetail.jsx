import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Close, PlayCircleOutlined } from "@mui/icons-material";
import { iconMap } from "../componenets/CustomIcons.jsx";
import PrintLabel from "./PrintLabel.jsx";

const MyTaskDetail = ({ task, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showPrintLabel, setShowPrintLabel] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};

  const handleStartTask = async () => {
    if (!task?.id) return;

    setStarting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Update task in parent component or refresh
        onClose();

        // Optionally trigger a refresh
        window.dispatchEvent(
          new CustomEvent("taskUpdated", { detail: { taskId: task.id } }),
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to start task");
      }
    } catch (error) {
      console.error("Error starting task:", error);
      alert("Error starting task");
    } finally {
      setStarting(false);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("zh-hk", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (task?.id) {
      fetchTaskItems();
    }
  }, [task?.id]);

  const fetchTaskItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/items/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        console.log(task);
      }
    } catch (error) {
      console.error("Error fetching task items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="absolute inset-0 h-[80%] bg-black/30" onClick={onClose} />

      {/* Bottom Sheet */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 h-[80%] rounded-t-3xl bg-white"
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
            {/* Task Name */}
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                {task.task_name}
              </h1>
              <p className="text-sm text-gray-500">{task.id}</p>
            </div>

            {/* Status Badge */}
            <div>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: task.state?.bg_color,
                  color: task.state?.text_color,
                }}
              >
                {iconMap[task.state?.icon] &&
                  React.createElement(iconMap[task.state.icon], {
                    className: "h-8 w-8",
                  })}{" "}
                &nbsp;
                {task.state?.state_name}
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">描述</h3>
                <p className="leading-relaxed text-gray-900">
                  {task.description}
                </p>
              </div>
            )}

            {/* Dates Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Start Date */}
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  開始日期
                </h3>
                <p className="font-medium text-gray-900">
                  {formatDate(task.start_date)}
                </p>
              </div>

              {/* Due Date */}
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-500">
                  截止日期
                </h3>
                <p className="font-medium text-gray-900">
                  {formatDate(task.due_date)}
                </p>
              </div>

              {/* Estimated Hours */}
              {task.estimated_hour > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-500">
                    預計工時
                  </h3>
                  <p className="font-medium text-gray-900">
                    {task.estimated_hour} 小時
                  </p>
                </div>
              )}

              {/* Completed At */}
              {task.state?.state_name === "completed" && task.completed_at && (
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-500">
                    完成時間
                  </h3>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(task.completed_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Work Order Info */}
            {task.work_order && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-500">
                  所屬工單
                </h3>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium text-gray-900">
                    {task.work_order.work_order_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {task.work_order.id}
                  </p>
                </div>
              </div>
            )}

            {/* Project Info */}
            {task.work_order?.project && (
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-medium text-gray-500">
                  所屬項目
                </h3>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="font-medium text-gray-900">
                    {task.work_order.project.project_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {task.work_order.project.id}
                  </p>
                </div>
              </div>
            )}

            {/* Task Items */}
            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-medium text-gray-500">
                任務物品
                {items.length > 0 && (
                  <span className="ml-2 text-gray-900">
                    ({items.length} 項)
                  </span>
                )}
              </h3>

              {loading ? (
                <div className="py-4 text-center">
                  <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.number_of_item} × {item.item_quantity}{" "}
                          {item.item_material_unit} {item.item_material_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">暫無物品</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 border-t pt-4">
              {/* Print Label Button */}
              <button
                onClick={() => setShowPrintLabel(true)}
                className="bg-blue w-full rounded-lg px-4 py-3 font-medium text-white shadow-md transition-all duration-300 hover:bg-blue-700 hover:shadow-lg"
              >
                <div className="flex items-center justify-center">打印標籤</div>
              </button>

              {/* Start Task Button */}
              {task?.state?.state_name === "assigned_worker" &&
                task?.assignee_id === user.id && (
                  <button
                    onClick={handleStartTask}
                    disabled={starting}
                    className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white shadow-md transition-all duration-300 hover:bg-green-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {starting ? (
                      <div className="flex items-center justify-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        開始中...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <PlayCircleOutlined className="mr-2 h-5 w-5" />
                        開始任務
                      </div>
                    )}
                  </button>
                )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Label Modal */}
      {showPrintLabel && task && (
        <PrintLabel task={task} onClose={() => setShowPrintLabel(false)} />
      )}
    </motion.div>
  );
};

export default MyTaskDetail;
