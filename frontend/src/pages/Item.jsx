import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import { Inventory2, CheckCircle, Warning, History } from "@mui/icons-material";
import PermissionGate from "../componenets/PermissionGate.jsx";
import StockLog from "../componenets/StockLog.jsx";
import { motion } from "framer-motion";
import api from "../services/api.js"; // Import the api module
import { backgroundVariants } from "../utils/styles.js";

const statusOptions = [
  {
    value: "available",
    label: "可用",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  { value: "assigned", label: "已分配", icon: <Warning className="h-4 w-4" /> },
  { value: "used", label: "已使用", icon: <Inventory2 className="h-4 w-4" /> },
];

const Item = () => {
  const { itemId } = useParams();
  const [item, setItem] = useState(null);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ quantity: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [userType, setUserType] = useState("");
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
    fetchItem();
    // Get user type from localStorage or API
    const userStr = localStorage.getItem("user");
    let type = "";
    try {
      if (userStr) {
        const userObj = JSON.parse(userStr);
        type = userObj.user_type_id;
      }
    } catch (e) {
      type = "";
    }
    setUserType(type);
  }, [itemId]);

  const fetchItem = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [itemRes, materialTypesRes] = await Promise.all([
        api.getItem(itemId),
        api.getMaterialTypes(),
      ]);

      const itemData = await itemRes.json();
      const materialTypesData = await materialTypesRes.json();
      setItem(itemData);
      setMaterialTypes(materialTypesData || []);
      setForm({
        quantity: itemData.quantity,
        status: itemData.status,
        child_item_ids: Array.isArray(itemData.child_item_ids)
          ? itemData.child_item_ids.join(", ")
          : itemData.child_item_ids || "",
        task_ids: Array.isArray(itemData.task_ids)
          ? itemData.task_ids.join(", ")
          : itemData.task_ids || "",
        log_ids: Array.isArray(itemData.log_ids)
          ? itemData.log_ids.join(", ")
          : itemData.log_ids || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Prepare update body
      const updateBody = {
        quantity: form.quantity,
        status: form.status,
        child_item_ids: form.child_item_ids,
        task_ids: form.task_ids,
        log_ids: form.log_ids,
      };

      const res = await api.putItem(itemId, updateBody);
      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message);
      }

      setEditMode(false);
      fetchItem();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getMaterialTypeName = (materialTypeId) => {
    const type = materialTypes.find((t) => t.id === materialTypeId);
    return type ? type.material_name : "未知物料";
  };
  const getMaterialTypeUnit = (materialTypeId) => {
    const type = materialTypes.find((t) => t.id === materialTypeId);
    return type ? type.material_unit : "";
  };

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full"
        // initial="initial"
        // animate="in"
        // exit="out"
        // variants={pageVariants}
        // transition={pageTransition}
        style={backgroundVariants.inventory}
      >
        <Header title="物料資訊" />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中" />
        </div>
      </motion.div>
    );
  }
  if (error) {
    return (
      <div
        className="flex min-h-screen w-full flex-col"
        style={backgroundVariants.inventory}
      >
        <Header title="物料資訊" />
        <FetchDataFail
          error={error}
          onRetry={fetchItem}
          className="flex flex-1 items-center justify-center"
        />
      </div>
    );
  }

  return (
    <div
      className="item-container flex min-h-screen flex-col"
      style={backgroundVariants.inventory}
    >
      <Header title={`物料 ${item.id} `} />
      <div className="mt-2">
        <div className="glassmorphism px-8 py-6 shadow-lg">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Inventory2 className="text-blue h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                物料 ID: {item.id}
              </h3>
              <div className="text-sm text-gray-500">
                工廠批次號: {item.factory_lot_number}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm text-gray-500">物料類型</div>
              <div className="text-base font-medium text-gray-900">
                {getMaterialTypeName(item.material_type_id)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">數量</div>
              {editMode ? (
                <input
                  type="number"
                  name="quantity"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={form.quantity}
                  onChange={handleChange}
                  min={0}
                />
              ) : (
                <div className="text-base font-medium text-gray-900">
                  {item.quantity} {getMaterialTypeUnit(item.material_type_id)}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">狀態</div>
              {editMode ? (
                <select
                  name="status"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={form.status}
                  onChange={handleChange}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    item.status === "available"
                      ? "bg-green-100 text-green-800"
                      : item.status === "assigned"
                        ? "bg-yellow-100 text-yellow-800"
                        : item.status === "used"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {statusOptions.find((opt) => opt.value === item.status)?.icon}
                  {
                    statusOptions.find((opt) => opt.value === item.status)
                      ?.label
                  }
                </span>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">建立時間</div>
              {editMode && userType === "UT001" ? (
                <input
                  type="text"
                  name="created_at"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={form.created_at || item.created_at}
                  onChange={handleChange}
                />
              ) : (
                <div className="text-base text-gray-900">
                  {new Date(item.created_at).toLocaleString("zh-TW")}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">父箱子/箱子 ID</div>
              {editMode && userType === "UT001" ? (
                <input
                  type="text"
                  name="parent_id"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={form.parent_id || item.parent_id}
                  onChange={handleChange}
                />
              ) : (
                <div className="text-base text-gray-900">{item.parent_id}</div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">子物料 ID</div>
              {editMode && userType === "UT001" ? (
                <input
                  type="text"
                  name="child_item_ids"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={
                    form.child_item_ids ||
                    (Array.isArray(item.child_item_ids)
                      ? item.child_item_ids.join(", ")
                      : item.child_item_ids)
                  }
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      child_item_ids: e.target.value,
                    }))
                  }
                />
              ) : (
                <div className="text-base text-gray-900">
                  {Array.isArray(item.child_item_ids)
                    ? item.child_item_ids.join(", ")
                    : item.child_item_ids}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">任務 ID</div>
              {editMode && userType === "UT001" ? (
                <input
                  type="text"
                  name="task_ids"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={
                    form.task_ids ||
                    (Array.isArray(item.task_ids)
                      ? item.task_ids.join(", ")
                      : item.task_ids)
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, task_ids: e.target.value }))
                  }
                />
              ) : (
                <div className="text-base text-gray-900">
                  {Array.isArray(item.task_ids)
                    ? item.task_ids.join(", ")
                    : item.task_ids}
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-sm text-gray-500">日誌 ID</div>
              {editMode && userType === "UT001" ? (
                <input
                  type="text"
                  name="log_ids"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  value={
                    form.log_ids ||
                    (Array.isArray(item.log_ids)
                      ? item.log_ids.join(", ")
                      : item.log_ids)
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, log_ids: e.target.value }))
                  }
                />
              ) : (
                <div className="text-base text-gray-900">
                  {Array.isArray(item.log_ids)
                    ? item.log_ids.join(", ")
                    : item.log_ids}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 whitespace-nowrap text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
            >
              <History className="h-5 w-5" />
              查看日誌
            </button>
            {editMode ? (
              <div className={`mr-0 ml-auto w-fit`}>
                <button
                  className="bg-lightblue mr-4 rounded-xl px-6 py-2 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  儲存
                </button>
                <button
                  className="rounded-xl bg-gray-200 px-6 py-2 font-semibold text-gray-700 shadow hover:bg-gray-300"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  取消
                </button>
              </div>
            ) : (
              <PermissionGate resource="items" action="write" show={false}>
                <button
                  className="bg-blue hover:bg-lightblue mr-0 ml-auto rounded-xl px-6 py-2 font-semibold text-white shadow"
                  onClick={() => setEditMode(true)}
                >
                  編輯
                </button>
              </PermissionGate>
            )}
          </div>
          {error && <div className="mt-4 text-red-600">{error}</div>}
        </div>
      </div>

      <StockLog
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        entityType="item"
        entityId={itemId}
      />
    </div>
  );
};

export default Item;
