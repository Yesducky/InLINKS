import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "rc-input";
import {
  Close,
  Search,
  Delete,
  ViewList,
  ViewModule,
  Category,
  AddShoppingCart,
  RemoveShoppingCart,
} from "@mui/icons-material";
import { ItemIcon, LotIcon } from "./CustomIcons.jsx";
import LoadingSpinner from "./LoadingSpinner";

const TaskItemsModal = ({ isOpen, onClose, task, onItemsUpdated }) => {
  const [items, setItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [mode, setMode] = useState("view"); // "view", "add"
  const [selectedMaterialType, setSelectedMaterialType] = useState(null);
  const [quantityMode, setQuantityMode] = useState("total"); // "items" or "total"
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [selectedLots, setSelectedLots] = useState({});
  const [lotCounts, setLotCounts] = useState({}); // For tracking count and quantity per lot
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  useEffect(() => {
    if (isOpen && task) {
      fetchTaskItems();
      fetchMaterialTypes();
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (mode === "add") {
      fetchAvailableItems();
    }
  }, [mode, selectedMaterialType]);

  const fetchTaskItems = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setItems(data.items);
        setError("");
      } else {
        console.log("Failed to fetch task items:", response.statusText);
        setError("Failed to fetch task items");
      }
    } catch (err) {
      setError("Network error loading items");
      console.error("Error fetching task items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    setIsLoadingAvailable(true);
    try {
      const token = localStorage.getItem("token");
      const url = `/api/tasks/${task.id}/items/available${selectedMaterialType ? `?material_type_id=${selectedMaterialType}` : ""}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Available Items:", data);
        setAvailableItems(data.material_types);
      } else {
        setError("Failed to fetch available items");
      }
    } catch (err) {
      setError("Network error loading available items");
      console.error("Error fetching available items:", err);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/material_types", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Material Types:", data);
        setMaterialTypes(data);
      }
    } catch (err) {
      console.error("Error fetching material types:", err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "used":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "available":
        return "可用";
      case "assigned":
        return "已分配";
      case "used":
        return "已使用";
      default:
        return status;
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("確定要將此物料從任務中移除嗎？")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/tasks/${task.id}/items/${itemId}/remove`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        setItems(items.filter((item) => item.id !== itemId));
        if (onItemsUpdated) onItemsUpdated();
      } else {
        setError("Failed to remove item from task");
      }
    } catch (err) {
      setError("Network error removing item");
      console.error("Error removing item:", err);
    }
  };

  const handleAssignItems = async () => {
    if (!selectedMaterialType) {
      alert("請選擇物料類型");
      return;
    }

    const assignments = [];
    let totalSelected = 0;

    if (quantityMode === "items") {
      // Items mode: send count and quantity for each lot
      Object.entries(lotCounts).forEach(([lotId, data]) => {
        const count = parseInt(data.count) || 0;
        const itemQuantity = parseFloat(data.quantity) || 0;
        if (count > 0 && itemQuantity > 0) {
          assignments.push({
            lot_id: lotId,
            material_type_id: selectedMaterialType,
            count: count,
            quantity: itemQuantity,
          });
          totalSelected += count * itemQuantity;
        }
      });
    } else {
      // Total mode: send total quantity for each lot
      if (!requestedQuantity || requestedQuantity <= 0) {
        alert("請輸入有效數量");
        return;
      }

      Object.entries(selectedLots).forEach(([lotId, quantity]) => {
        if (quantity > 0) {
          assignments.push({
            lot_id: lotId,
            material_type_id: selectedMaterialType,
            quantity: quantity,
          });
          totalSelected += quantity;
        }
      });
    }

    if (assignments.length === 0) {
      alert("請至少選擇一個批次並指定數量");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tasks/${task.id}/items/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignments }),
      });

      if (response.ok) {
        setMode("view");
        setSelectedMaterialType(null);
        setRequestedQuantity("");
        setSelectedLots({});
        fetchTaskItems();
        if (onItemsUpdated) onItemsUpdated();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to assign items");
      }
    } catch (err) {
      setError("Network error assigning items");
      console.error("Error assigning items:", err);
    }
  };

  const toggleLotSelection = (lotId, maxQuantity) => {
    setSelectedLots((prev) => {
      const newSelection = { ...prev };
      if (newSelection[lotId] !== undefined) {
        delete newSelection[lotId];
        // Also clear lotCounts when deselecting
        setLotCounts((prevCounts) => {
          const newCounts = { ...prevCounts };
          delete newCounts[lotId];
          return newCounts;
        });
      } else {
        // For items mode, just mark as selected with 0 quantity initially
        // User will specify count and quantity via the input fields
        if (quantityMode === "items") {
          newSelection[lotId] = 0;
          // Initialize lotCounts with 0 count and first available quantity
          const materialType = availableItems.find(
            (mt) => mt.material_type_id === selectedMaterialType,
          );
          if (materialType) {
            const lot = materialType.lots.find((l) => l.lot_id === lotId);
            if (lot && lot.items.length > 0) {
              const firstQuantity = lot.items[0].quantity;
              setLotCounts((prevCounts) => ({
                ...prevCounts,
                [lotId]: { count: 0, quantity: firstQuantity },
              }));
            }
          }
        } else {
          // For total mode, use the original behavior
          newSelection[lotId] = Math.min(
            maxQuantity,
            requestedQuantity || maxQuantity,
          );
        }
      }
      return newSelection;
    });
  };

  const updateLotQuantity = (lotId, quantity) => {
    const numQuantity = parseFloat(quantity) || 0;
    setSelectedLots((prev) => ({
      ...prev,
      [lotId]: Math.max(0, Math.min(numQuantity, getLotMaxQuantity(lotId))),
    }));
  };

  const getLotMaxQuantity = (lotId) => {
    const materialType = availableItems.find(
      (mt) => mt.material_type_id === selectedMaterialType,
    );
    if (!materialType) return 0;
    const lot = materialType.lots.find((l) => l.lot_id === lotId);
    return lot ? lot.total_quantity : 0;
  };

  const getTotalSelectedQuantity = () => {
    return Object.values(selectedLots).reduce((sum, qty) => sum + qty, 0);
  };

  // Filter and sort logic
  const filterAndSort = (itemsList) => {
    let filtered = itemsList;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.material_type_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (item.lot_info?.factory_lot_number || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Material type filter
    if (materialTypeFilter) {
      filtered = filtered.filter(
        (item) => item.material_type_id === materialTypeFilter,
      );
    }

    return filtered;
  };

  const paginate = (itemsList) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return itemsList.slice(startIndex, endIndex);
  };

  const processedItems = paginate(filterAndSort(items));
  const totalPages = Math.ceil(items.length / itemsPerPage);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6 py-20 backdrop-blur-xs"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="h-full w-full rounded-2xl bg-white shadow-xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-[7%] items-center justify-between border-b border-gray-200 px-6 py-2">
              <div>
                <p className="text-sm text-gray-600">
                  {mode === "view"
                    ? `已分配 ${items.length} 個物料`
                    : selectedMaterialType
                      ? `選擇物料類型: ${materialTypes.find((mt) => mt.id === selectedMaterialType)?.material_name || ""}`
                      : "選擇物料類型"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <Close className="h-5 w-5" />
              </button>
            </div>

            <div className="h-[85%] p-3">
              {mode === "view" ? (
                <>
                  {/* Filters and Search */}
                  <div className="h-[20%] space-y-4 p-3">
                    <div className="flex flex-wrap gap-4">
                      <div className="min-w-[200px] flex-1">
                        <div className="relative">
                          <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="搜索物料 ID 或類型..."
                            className="w-full rounded-xl border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      <select
                        value={materialTypeFilter}
                        onChange={(e) => setMaterialTypeFilter(e.target.value)}
                        className="rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">所有物料類型</option>
                        {materialTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.material_name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() =>
                          setViewMode(viewMode === "list" ? "grid" : "list")
                        }
                        className="mr-0 ml-auto flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-600 shadow-sm hover:bg-gray-50"
                      >
                        {viewMode === "list" ? (
                          <ViewModule className="h-4 w-4" />
                        ) : (
                          <ViewList className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="h-[80%] overflow-y-auto p-3">
                    {isLoading ? (
                      <div className="flex h-64 items-center justify-center">
                        <LoadingSpinner
                          variant="circular"
                          size={30}
                          message="載入中"
                        />
                      </div>
                    ) : error ? (
                      <div className="flex h-64 items-center justify-center text-red-500">
                        {error}
                      </div>
                    ) : processedItems.length === 0 ? (
                      <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                        <Category className="h-12 w-12 text-gray-400" />
                        <p className="mt-2">
                          {searchTerm ? "沒有符合條件的物料" : "暫無物料資料"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {viewMode === "list" ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    物料 ID
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    物料類型
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    數量
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    批次
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    狀態
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    操作
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {processedItems.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                                          <ItemIcon className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <span className="font-medium">
                                          {item.id}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {item.material_type_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {item.quantity} {item.material_unit}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {item.lot_info?.lot_id || "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}
                                      >
                                        {getStatusText(item.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() =>
                                          handleRemoveItem(item.id)
                                        }
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Delete className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {processedItems.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                                      <ItemIcon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium">{item.id}</h4>
                                      <p className="text-xs text-gray-500">
                                        {item.material_type_name}
                                      </p>
                                    </div>
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}
                                  >
                                    {getStatusText(item.status)}
                                  </span>
                                </div>

                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700">
                                    {item.quantity} {item.material_unit}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    批次: {item.lot_info?.lot_id || "N/A"}
                                  </p>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <RemoveShoppingCart className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                              顯示 {(page - 1) * itemsPerPage + 1} -{" "}
                              {Math.min(page * itemsPerPage, items.length)} /{" "}
                              {items.length} 個物料
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
                              >
                                上一頁
                              </button>
                              <span className="flex items-center px-3 text-sm">
                                {page} / {totalPages}
                              </span>
                              <button
                                onClick={() =>
                                  setPage(Math.min(totalPages, page + 1))
                                }
                                disabled={page === totalPages}
                                className="rounded-xl border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
                              >
                                下一頁
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Add Mode - Material Type Selection */}
                  {!selectedMaterialType ? (
                    <div className="h-full p-6">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {availableItems.map((materialType) => (
                          <div
                            key={materialType.material_type_id}
                            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md"
                            onClick={() =>
                              setSelectedMaterialType(
                                materialType.material_type_id,
                              )
                            }
                          >
                            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                              <Category className="text-blue h-8 w-8" />
                            </div>
                            <h4 className="font-medium">
                              {materialType.material_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {materialType.total_quantity}{" "}
                              {materialType.material_unit}
                            </p>
                            <p className="text-xs text-gray-400">
                              {materialType.lots.length} 個批次
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full p-3">
                      <div className="mb-2">
                        <div className="flex justify-center">
                          <div className="relative inline-flex rounded-xl bg-gray-100 p-1">
                            <motion.div
                              className="bg-blue absolute inset-0 rounded-lg"
                              layoutId="activeTab"
                              initial={false}
                              animate={{
                                x: quantityMode === "items" ? 0 : "100%",
                                width: "50%",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                              }}
                            />
                            <button
                              onClick={() => setQuantityMode("items")}
                              className={`relative z-10 rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                quantityMode === "items"
                                  ? "text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-lg">📦</span>
                                按件數
                              </span>
                            </button>
                            <button
                              onClick={() => setQuantityMode("total")}
                              className={`relative z-10 rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                quantityMode === "total"
                                  ? "text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-lg">📏</span>
                                按總量
                              </span>
                            </button>
                          </div>
                        </div>

                        <motion.div
                          key={quantityMode}
                          initial={{
                            opacity: 0,
                            x: quantityMode === "items" ? 15 : -15,
                          }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 mb-3"
                        >
                          {quantityMode === "total" && (
                            <>
                              <label className="mb-2 block text-sm font-medium text-gray-700">
                                需求{quantityMode === "items" ? "件數" : "總量"}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={requestedQuantity}
                                  onChange={(e) =>
                                    setRequestedQuantity(e.target.value)
                                  }
                                  placeholder={
                                    quantityMode === "items"
                                      ? "例如：5 (件)"
                                      : `例如：10 ${materialTypes.find((mt) => mt.id === selectedMaterialType)?.material_unit}`
                                  }
                                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                  min="0"
                                  step={quantityMode === "items" ? "1" : "0.01"}
                                />
                                <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                  {quantityMode === "items"
                                    ? "件"
                                    : materialTypes.find(
                                        (mt) => mt.id === selectedMaterialType,
                                      )?.material_unit || ""}
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </div>

                      <div className="mb-4 flex h-[calc(100%-16rem)] flex-col">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">
                          選擇批次
                        </h4>
                        {isLoadingAvailable ? (
                          <div className="flex h-32 items-center justify-center">
                            <LoadingSpinner
                              variant="circular"
                              size={24}
                              message="載入中"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 space-y-3 overflow-y-auto">
                            {availableItems
                              .find(
                                (mt) =>
                                  mt.material_type_id === selectedMaterialType,
                              )
                              ?.lots.map((lot) => (
                                <div
                                  key={lot.lot_id}
                                  className={`w-full cursor-pointer rounded-xl border px-4 py-1 transition-all duration-200 ${
                                    selectedLots[lot.lot_id] !== undefined
                                      ? "border-blue bg-blue-50 shadow-md"
                                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                  }`}
                                  onClick={(e) => {
                                    // Only toggle selection if not clicking on input
                                    if (e.target.tagName !== "INPUT") {
                                      toggleLotSelection(
                                        lot.lot_id,
                                        lot.total_quantity,
                                      );
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className={`flex items-center`}>
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-100">
                                          <LotIcon className="h-4 w-4 text-fuchsia-600" />
                                        </div>
                                        &nbsp;
                                        <span className="text-xs font-medium">
                                          {lot.lot_id}
                                        </span>
                                      </div>
                                      <div className="mt-1 space-y-1">
                                        {(() => {
                                          // Group items by quantity
                                          const quantityGroups =
                                            lot.items.reduce((groups, item) => {
                                              const qty = item.quantity;
                                              if (!groups[qty]) {
                                                groups[qty] = {
                                                  count: 0,
                                                  quantity: qty,
                                                };
                                              }
                                              groups[qty].count++;
                                              return groups;
                                            }, {});

                                          // Convert to array and sort by quantity
                                          const sortedGroups = Object.values(
                                            quantityGroups,
                                          ).sort(
                                            (a, b) => b.quantity - a.quantity,
                                          );

                                          return sortedGroups.map(
                                            (group, index) => (
                                              <div
                                                key={`${group.quantity}-${index}`}
                                                className="text-xs text-gray-600"
                                              >
                                                {group.count} × {group.quantity}
                                                {
                                                  availableItems.find(
                                                    (mt) =>
                                                      mt.material_type_id ===
                                                      selectedMaterialType,
                                                  )?.material_unit
                                                }
                                              </div>
                                            ),
                                          );
                                        })()}
                                      </div>
                                      <div className="mt-1 flex items-center gap-2">
                                        <motion.span
                                          className={`text-xs ${
                                            selectedLots[lot.lot_id] &&
                                            (selectedLots[lot.lot_id] || 0) > 0
                                              ? "text-red-600"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          可用:{" "}
                                          {selectedLots[lot.lot_id] &&
                                          (selectedLots[lot.lot_id] || 0) > 0
                                            ? (
                                                lot.total_quantity -
                                                (selectedLots[lot.lot_id] || 0)
                                              ).toFixed(2)
                                            : lot.total_quantity.toFixed(
                                                2,
                                              )}{" "}
                                          {
                                            availableItems.find(
                                              (mt) =>
                                                mt.material_type_id ===
                                                selectedMaterialType,
                                            )?.material_unit
                                          }
                                        </motion.span>
                                      </div>
                                    </div>
                                    {selectedLots[lot.lot_id] !== undefined && (
                                      <div className="ml-4 flex-shrink-0">
                                        {quantityMode === "items" ? (
                                          // Two separate fields for "按件數" mode: count input + quantity dropdown
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              key={"lot-count-" + lot.lot_id}
                                              value={
                                                (lotCounts[lot.lot_id] || {})
                                                  .count || ""
                                              }
                                              onChange={(e) => {
                                                const selectedQuantity =
                                                  (lotCounts[lot.lot_id] || {})
                                                    .quantity || 0;
                                                let count =
                                                  parseInt(e.target.value) || 0;

                                                // Calculate max available items for this quantity
                                                const itemsWithQuantity =
                                                  lot.items.filter(
                                                    (item) =>
                                                      item.quantity ===
                                                      selectedQuantity,
                                                  );
                                                const maxCount =
                                                  itemsWithQuantity.length;

                                                // Validate against max available
                                                if (count > maxCount) {
                                                  count = maxCount;
                                                }

                                                setLotCounts((prev) => ({
                                                  ...prev,
                                                  [lot.lot_id]: {
                                                    count,
                                                    quantity: selectedQuantity,
                                                  },
                                                }));
                                                updateLotQuantity(
                                                  lot.lot_id,
                                                  count * selectedQuantity,
                                                );
                                              }}
                                              className="w-16 rounded border border-gray-300 px-2 py-2 text-center text-sm"
                                              min="0"
                                              max={(() => {
                                                const selectedQuantity =
                                                  (lotCounts[lot.lot_id] || {})
                                                    .quantity || 0;
                                                const itemsWithQuantity =
                                                  lot.items.filter(
                                                    (item) =>
                                                      item.quantity ===
                                                      selectedQuantity,
                                                  );
                                                return itemsWithQuantity.length;
                                              })()}
                                              placeholder="件"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.target.select();
                                              }}
                                            />
                                            <select
                                              key={"lot-quantity-" + lot.lot_id}
                                              value={
                                                (lotCounts[lot.lot_id] || {})
                                                  .quantity || 0
                                              }
                                              onChange={(e) => {
                                                const quantity =
                                                  parseFloat(e.target.value) ||
                                                  0;
                                                const count =
                                                  (lotCounts[lot.lot_id] || {})
                                                    .count || 0;
                                                setLotCounts((prev) => ({
                                                  ...prev,
                                                  [lot.lot_id]: {
                                                    count,
                                                    quantity,
                                                  },
                                                }));
                                                updateLotQuantity(
                                                  lot.lot_id,
                                                  count * quantity,
                                                );
                                              }}
                                              className="w-20 rounded border border-gray-300 px-2 py-2 text-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                              }}
                                            >
                                              <option value={0}>選擇</option>
                                              {(() => {
                                                const uniqueQuantities = [
                                                  ...new Set(
                                                    lot.items.map(
                                                      (item) => item.quantity,
                                                    ),
                                                  ),
                                                ].sort((a, b) => a - b); // Sort from small to large
                                                const unit =
                                                  availableItems.find(
                                                    (mt) =>
                                                      mt.material_type_id ===
                                                      selectedMaterialType,
                                                  )?.material_unit || "";
                                                return uniqueQuantities.map(
                                                  (qty) => (
                                                    <option
                                                      key={qty}
                                                      value={qty}
                                                    >
                                                      {qty}
                                                      {unit}
                                                    </option>
                                                  ),
                                                );
                                              })()}
                                            </select>
                                          </div>
                                        ) : (
                                          // Number input for "按總量" mode
                                          <Input
                                            type="number"
                                            key={"lot-input-" + lot.lot_id}
                                            value={
                                              selectedLots[lot.lot_id] === 0
                                                ? ""
                                                : selectedLots[lot.lot_id] || ""
                                            }
                                            onChange={(e) => {
                                              updateLotQuantity(
                                                lot.lot_id,
                                                e.target.value,
                                              );
                                            }}
                                            className="w-24 rounded border border-gray-300 px-3 py-2 text-right text-sm"
                                            max={lot.total_quantity}
                                            step="0.01"
                                            placeholder="數量"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.target.select();
                                            }}
                                            onFocus={(e) => {
                                              e.target.select();
                                            }}
                                            onKeyDown={(e) => {
                                              if (
                                                e.key === "Backspace" ||
                                                e.key === "Delete"
                                              ) {
                                                e.stopPropagation();
                                              }
                                            }}
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">已選擇總量:</span>
                          <span className="text-blue text-lg font-bold">
                            {getTotalSelectedQuantity()}{" "}
                            {
                              availableItems.find(
                                (mt) =>
                                  mt.material_type_id === selectedMaterialType,
                              )?.material_unit
                            }
                          </span>
                        </div>
                        {quantityMode === "total" && (
                          <div className="mt-1 text-sm text-gray-600">
                            需求: {requestedQuantity || 0}{" "}
                            {
                              availableItems.find(
                                (mt) =>
                                  mt.material_type_id === selectedMaterialType,
                              )?.material_unit
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex h-[8%] items-center justify-end border-t border-gray-200 px-6 py-4">
              {mode === "view" ? (
                <button
                  onClick={() => setMode("add")}
                  className="bg-blue flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <AddShoppingCart className="h-4 w-4" />
                  添加物料
                </button>
              ) : (
                <div className="flex w-full justify-end gap-2">
                  {selectedMaterialType && (
                    <button
                      onClick={() => setSelectedMaterialType(null)}
                      className="bg-blue hover:bg-lightblue mr-auto ml-0 self-start rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                    >
                      ←
                    </button>
                  )}
                  <button
                    onClick={handleAssignItems}
                    disabled={
                      Object.keys(selectedLots).length === 0 ||
                      getTotalSelectedQuantity() <= 0 ||
                      (quantityMode === "total" &&
                        parseFloat(requestedQuantity || 0) !==
                          getTotalSelectedQuantity())
                    }
                    className="mr-3 ml-auto rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    確認分配 (
                    {quantityMode === "total"
                      ? requestedQuantity || 0
                      : getTotalSelectedQuantity()}{" "}
                    {availableItems.find(
                      (mt) => mt.material_type_id === selectedMaterialType,
                    )?.material_unit || ""}
                    )
                  </button>
                  <button
                    onClick={() => {
                      setMode("view");
                      setSelectedMaterialType(null);
                      setRequestedQuantity("");
                      setSelectedLots({});
                    }}
                    className="mr-0 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskItemsModal;
