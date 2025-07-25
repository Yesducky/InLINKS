import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Close } from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner";

const EditProjectModal = ({ isOpen, onClose, project, onSave }) => {
  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    person_in_charge: "",
    priority: "medium",
    state_id: "",
    start_date: "",
    due_date: "",
    lot_id: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stateOptions, setStateOptions] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchStateOptions();
      if (project) {
        setFormData({
          project_name: project.project_name || "",
          description: project.description || "",
          person_in_charge: project.person_in_charge || "",
          priority: project.priority || "medium",
          state_id: project.state_id || "",
          start_date: project.start_date
            ? new Date(project.start_date)
                .toLocaleDateString("zh-Hans-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  timeZone: "Asia/Hong_Kong",
                })
                .replace(/\//g, "-")
            : "",
          due_date: project.due_date
            ? new Date(project.due_date)
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
        // New project defaults - set first available state
        setFormData({
          project_name: "",
          description: "",
          person_in_charge: "",
          priority: "medium",
          state_id: "",
          start_date: "",
          due_date: "",
        });
      }
    }
  }, [isOpen, project]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchStateOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/process_state_types/by_type/project", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const states = await response.json();
        console.log(states);
        setStateOptions(states);

        // If creating new project and no state_id set, use first available
        if (!project && states.length > 0 && !formData.state_id) {
          setFormData((prev) => ({ ...prev, state_id: states[0].id }));
        }
      } else {
        console.error("Failed to fetch state options");
      }
    } catch (error) {
      console.error("Error fetching state options:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = project ? `/api/projects/${project.id}` : "/api/projects";
      const method = project ? "PUT" : "POST";

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
        setError(errorData.message || "Failed to save project");
      }
    } catch (err) {
      setError("Network error saving project");
      console.error("Error saving project:", err);
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
                {project ? "編輯項目" : "新增項目"}
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
                      htmlFor="project_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      項目名稱 *
                    </label>
                    <input
                      type="text"
                      id="project_name"
                      name="project_name"
                      value={formData.project_name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入項目名稱"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      項目描述
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      placeholder="輸入項目描述"
                    />
                  </div>

                  {/*<div>*/}
                  {/*  <label*/}
                  {/*    htmlFor="person_in_charge"*/}
                  {/*    className="block text-sm font-medium text-gray-700"*/}
                  {/*  >*/}
                  {/*    負責人*/}
                  {/*  </label>*/}
                  {/*  <select*/}
                  {/*    id="person_in_charge"*/}
                  {/*    name="person_in_charge"*/}
                  {/*    value={formData.person_in_charge}*/}
                  {/*    onChange={handleInputChange}*/}
                  {/*    className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"*/}
                  {/*  >*/}
                  {/*    <option value="">選擇負責人</option>*/}
                  {/*    {users.map((user) => (*/}
                  {/*      <option key={user.id} value={user.id}>*/}
                  {/*        {user.name}*/}
                  {/*      </option>*/}
                  {/*    ))}*/}
                  {/*  </select>*/}
                  {/*</div>*/}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700"
                      >
                        優先級
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="state_id"
                        className="block text-sm font-medium text-gray-700"
                      >
                        狀態
                      </label>
                      <select
                        id="state_id"
                        name="state_id"
                        value={formData.state_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">選擇狀態</option>
                        {stateOptions.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.state_name}
                          </option>
                        ))}
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
                      {saving ? "保存中..." : project ? "更新項目" : "創建項目"}
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

export default EditProjectModal;
