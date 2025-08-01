import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import { Edit } from "@mui/icons-material";
import EditSubTaskModal from "../componenets/EditSubTaskModal.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import ProcessLog from "../componenets/ProcessLog";
import LogButton from "../componenets/LogButton.jsx";
import { SubTaskIcon } from "../componenets/CustomIcons.jsx";
import { iconMap } from "../componenets/CustomIcons.jsx";
import api from "../services/api.js";

const SubTask = () => {
  const { subTaskId } = useParams();
  const [subTaskInfo, setSubTaskInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  };

  useEffect(() => {
    fetchSubTaskInfo().then((r) => console.log(r));
  }, [subTaskId]);

  const fetchSubTaskInfo = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.getSubtask(subTaskId);

      if (response.ok) {
        const subTaskData = await response.json();
        console.log("SubTask Data:", subTaskData);
        setSubTaskInfo(subTaskData);
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError("Network error loading subtask");
      console.error("Error fetching subtask info:", err);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={`子任務 #${subTaskId}`} />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中..." />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={`子任務 #${subTaskId}`} />
        <FetchDataFail
          error={error}
          onRetry={fetchSubTaskInfo}
          className="h-64"
        />
      </motion.div>
    );
  }

  return (
    <PermissionGate
      resource="subtask"
      action="read"
      header={`子任務 #${subTaskId}`}
    >
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={`子任務 #${subTaskId}`} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* SubTask Info Card - Complete Information */}
            {subTaskInfo && (
              <motion.div
                className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <SubTaskIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {subTaskInfo.subtask_name || `子任務 #${subTaskId}`}
                    </h3>
                    <p className="text-gray-600">
                      {subTaskInfo.description || "無描述"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      子任務ID
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      #{subTaskInfo.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      所屬任務
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {subTaskInfo?.task?.name || "未設定"} (
                      {subTaskInfo?.task?.id || "未設定"})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      所屬工單
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {subTaskInfo?.task?.work_order?.work_order_name ||
                        "未設定"}{" "}
                      ({subTaskInfo?.task?.work_order?.id || "未設定"})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      指派給
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {subTaskInfo.assignee?.name || "未指派"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      狀態
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`}
                        style={{
                          backgroundColor: subTaskInfo.state?.bg_color,
                          color: subTaskInfo.state?.text_color,
                        }}
                      >
                        {iconMap[subTaskInfo.state?.icon] &&
                          React.createElement(iconMap[subTaskInfo.state.icon], {
                            className: "h-4 w-4",
                          })}
                        &nbsp;
                        {subTaskInfo.state?.state_name}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      預估工時
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {subTaskInfo.estimated_hour
                        ? `${subTaskInfo.estimated_hour}h`
                        : "未設定"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      開始日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(subTaskInfo.start_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      截止日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(subTaskInfo.due_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      完成日期
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(subTaskInfo.completed_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      創建時間
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatDate(subTaskInfo.created_at)}
                    </div>
                  </div>
                  <div className={`flex justify-between`}>
                    <LogButton setShowLogModal={setShowLogModal} />
                    <PermissionGate
                      resource="subtask"
                      action="write"
                      show={false}
                    >
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        編輯
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
      <ProcessLog
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        entityType="subtask"
        entityId={subTaskId}
      />
      <EditSubTaskModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        subTask={subTaskInfo}
        onSave={(updatedSubTask) => {
          setSubTaskInfo(updatedSubTask);
          fetchSubTaskInfo();
        }}
        taskId={subTaskInfo?.task?.id}
      />
    </PermissionGate>
  );
};

export default SubTask;
