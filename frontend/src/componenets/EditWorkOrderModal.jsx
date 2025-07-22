import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Close } from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner";

const EditWorkOrderModal = ({
  isOpen,
  onClose,
  workOrder,
  onSave,
  projectId,
}) => {
  const [formData, setFormData] = useState({
    work_order_name: "",
    description: "",
    assignee: {
      id: "",
      name: "",
    },
    workflow_type: {
      id: "",
      name: "",
    },
    lot_id: "",
    estimated_hour: "",
    state: "pending",
    start_date: "",
    due_date: "",
    parent_project_id: projectId || "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (workOrder) {
        setFormData({
          work_order_name: workOrder.work_order_name || "",
          description: workOrder.description || "",
          assignee: workOrder.assignee || "",
          workflow_type: workOrder.workflow_type || "",
          lot_id: workOrder.lot_id || "",
          estimated_hour: workOrder.estimated_hour || "",
          state: workOrder.state || "",
          start_date: workOrder.start_date
            ? new Date(workOrder.start_date)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
          due_date: workOrder.due_date
            ? new Date(workOrder.due_date)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
        });
      } else {
        // New work order defaults
        setFormData({
          work_order_name: "",
          description: "",
          assignee_id: "",
          workflow_type_id: "",
          lot_id: "",
          estimated_hour: "",
          state: "pending",
          start_date: "",
          due_date: "",
          parent_project_id: projectId,
        });
      }
    }
  }, [isOpen, workOrder]);

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
      const url = workOrder
        ? `/api/work_orders/${workOrder.id}`
        : "/api/work_orders";
      const method = workOrder ? "PUT" : "POST";

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
        onSave(result);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to save work order");
      }
    } catch (err) {
      setError("Network error saving work order");
      console.error("Error saving work order:", err);
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
                {workOrder ? "編輯工單" : "新增工單"}
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
                      htmlFor="work_order_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      工單名稱 *
                    </label>
                    <input
                      type="text"
                      id="work_order_name"
                      name="work_order_name"
                      value={formData.work_order_name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入工單名稱"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      工單描述
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入工單描述"
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
                        <option value="active">進行中</option>
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
                        htmlFor="workflow_type_id"
                        className="block text-sm font-medium text-gray-700"
                      >
                        工作流程類型
                      </label>
                      <input
                        type="text"
                        id="workflow_type_id"
                        name="workflow_type_id"
                        value={formData.workflow_type?.id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="輸入工作流程類型ID"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lot_id"
                      className="block text-sm font-medium text-gray-700"
                    >
                      批次號
                    </label>
                    <input
                      type="text"
                      id="lot_id"
                      name="lot_id"
                      value={formData.lot_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入批次號ID"
                    />
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
                        : workOrder
                          ? "更新工單"
                          : "創建工單"}
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

export default EditWorkOrderModal;
