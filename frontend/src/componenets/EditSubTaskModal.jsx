import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Close } from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner";

const EditSubTaskModal = ({
  isOpen,
  onClose,
  subTask,
  onSave,
  taskId,
}) => {
  const [formData, setFormData] = useState({
    subtask_name: "",
    description: "",
    assignee: {
      id: "",
      name: "",
    },
    state: "pending",
    start_date: "",
    due_date: "",
    completed_at: "",
    estimated_hour: "",
    task_id: taskId || "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (subTask) {
        setFormData({
          subtask_name: subTask.subtask_name || "",
          description: subTask.description || "",
          assignee: subTask.assignee || "",
          state: subTask.state || "pending",
          start_date: subTask.start_date
            ? new Date(subTask.start_date)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
          due_date: subTask.due_date
            ? new Date(subTask.due_date)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
          completed_at: subTask.completed_at
            ? new Date(subTask.completed_at)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
          estimated_hour: subTask.estimated_hour || "",
          task_id: subTask.task_id || taskId,
        });
      } else {
        // New subtask defaults
        setFormData({
          subtask_name: "",
          description: "",
          assignee_id: "",
          state: "pending",
          start_date: "",
          due_date: "",
          completed_at: "",
          estimated_hour: "",
          task_id: taskId,
        });
      }
    }
  }, [isOpen, subTask, taskId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = subTask
        ? `/api/subtasks/${subTask.id}`
        : "/api/subtasks";
      const method = subTask ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        onSave(result.id);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to save subtask");
      }
    } catch (err) {
      setError("Network error saving subtask");
      console.error("Error saving subtask:", err);
    } finally {
      setSaving(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {subTask ? "編輯子任務" : "新增子任務"}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Close className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <LoadingSpinner
                    variant="circular"
                    size={30}
                    message="載入中"
                  />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="subtask_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      子任務名稱 *
                    </label>
                    <input
                      type="text"
                      id="subtask_name"
                      name="subtask_name"
                      value={formData.subtask_name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入子任務名稱"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      子任務描述
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入子任務描述"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="estimated_hour"
                        className="block text-sm font-medium text-gray-700"
                      >
                        預估工時 (小時)
                      </label>
                      <input
                        type="number"
                        id="estimated_hour"
                        name="estimated_hour"
                        value={formData.estimated_hour}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="輸入預估工時"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="state"
                        className="block text-sm font-medium text-gray-700"
                      >
                        狀態
                      </label>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="pending">待開始</option>
                        <option value="design">設計階段</option>
                        <option value="pulling_cable">拉線階段</option>
                        <option value="terminated">終端階段</option>
                        <option value="completed">已完成</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="start_date"
                        className="block text-sm font-medium text-gray-700"
                      >
                        開始日期
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="due_date"
                        className="block text-sm font-medium text-gray-700"
                      >
                        截止日期
                      </label>
                      <input
                        type="date"
                        id="due_date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {formData.state === "completed" && (
                    <div>
                      <label
                        htmlFor="completed_at"
                        className="block text-sm font-medium text-gray-700"
                      >
                        完成日期
                      </label>
                      <input
                        type="date"
                        id="completed_at"
                        name="completed_at"
                        value={formData.completed_at}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="assignee_id"
                        className="block text-sm font-medium text-gray-700"
                      >
                        指派給
                      </label>
                      <input
                        type="text"
                        id="assignee_id"
                        name="assignee_id"
                        value={formData.assignee?.id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="輸入指派員工ID"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="task_id"
                        className="block text-sm font-medium text-gray-700"
                      >
                        任務ID
                      </label>
                      <input
                        type="text"
                        id="task_id"
                        name="task_id"
                        value={formData.task_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="輸入任務ID"
                        readOnly={!!taskId}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving
                        ? "保存中..."
                        : subTask
                          ? "更新子任務"
                          : "創建子任務"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditSubTaskModal;