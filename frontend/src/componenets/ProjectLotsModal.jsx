import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Close,
  Search,
  Add,
  Delete,
  CheckCircle,
  Warning,
  Inventory2,
  ViewList,
  ViewModule,
  Category,
} from "@mui/icons-material";
import { LotIcon } from "./CustomIcons.jsx";
import LoadingSpinner from "./LoadingSpinner";
import api from "../services/api.js";

const ProjectLotsModal = ({ isOpen, onClose, project, onLotsUpdated }) => {
  const [lots, setLots] = useState([]);
  const [allLots, setAllLots] = useState([]); // For add mode - unassigned lots
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAllLots, setIsLoadingAllLots] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [materialTypeFilter, setMaterialTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [mode, setMode] = useState("view"); // "view", "add"
  const [selectedLots, setSelectedLots] = useState([]);
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
    if (isOpen && project) {
      fetchProjectLots();
      fetchMaterialTypes();
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (mode === "add") {
      fetchUnassignedLots();
    }
  }, [mode]);

  const fetchProjectLots = async () => {
    setIsLoading(true);
    try {
      const response = await api.getLotsByProjectId(project.id);
      if (response.ok) {
        const data = await response.json();
        setLots(data);
      } else {
        setError("Failed to fetch project lots");
      }
    } catch (err) {
      setError("Network error loading lots");
      console.error("Error fetching project lots:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnassignedLots = async () => {
    setIsLoadingAllLots(true);
    try {
      const response = await api.getUnassignedLots();

      if (response.ok) {
        const data = await response.json();
        setAllLots(data);
      } else {
        setError("Failed to fetch unassigned lots");
      }
    } catch (err) {
      setError("Network error loading unassigned lots");
      console.error("Error fetching unassigned lots:", err);
    } finally {
      setIsLoadingAllLots(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const response = await api.getMaterialTypes();
      if (response.ok) {
        const data = await response.json();
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

  const getStatusColor = (availableItems, totalItems) => {
    const ratio = availableItems / totalItems;
    if (ratio === 1) return "bg-green-100 text-green-800";
    if (ratio > 0.5) return "bg-yellow-100 text-yellow-800";
    if (ratio > 0) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusIcon = (availableItems, totalItems) => {
    const ratio = availableItems / totalItems;
    if (ratio === 1) return <CheckCircle className="h-4 w-4" />;
    if (ratio > 0) return <Warning className="h-4 w-4" />;
    return <Inventory2 className="h-4 w-4" />;
  };

  const getStatusText = (availableItems, totalItems) => {
    const ratio = availableItems / totalItems;
    if (ratio === 1) return "完全可用";
    if (ratio > 0.5) return "部分使用";
    if (ratio > 0) return "大部分使用";
    return "完全使用";
  };

  const handleRemoveLot = async (lotId) => {
    if (!window.confirm("確定要將此批次從項目中移除嗎？")) return;

    try {
      const response = await api.removeLotFromProject(lotId, project.id);

      if (response.ok) {
        setLots(lots.filter((lot) => lot.id !== lotId));
        if (onLotsUpdated) onLotsUpdated();
      } else {
        setError("Failed to remove lot from project");
      }
    } catch (err) {
      setError("Network error removing lot");
      console.error("Error removing lot:", err);
    }
  };

  const handleAddLots = async () => {
    if (selectedLots.length === 0) {
      alert("請選擇至少一個批次");
      return;
    }

    try {
      const promises = selectedLots.map((lotId) =>
        api.assignLotToProject(lotId, project.id),
      );

      const results = await Promise.all(promises);
      const success = results.every((res) => res.ok);

      if (success) {
        setMode("view");
        setSelectedLots([]);
        fetchProjectLots();
        if (onLotsUpdated) onLotsUpdated();
      } else {
        setError("Failed to add some lots to project");
      }
    } catch (err) {
      setError("Network error adding lots");
      console.error("Error adding lots:", err);
    }
  };

  const toggleLotSelection = (lotId) => {
    setSelectedLots((prev) =>
      prev.includes(lotId)
        ? prev.filter((id) => id !== lotId)
        : [...prev, lotId],
    );
  };

  // Filter and sort logic
  const filterAndSort = (items) => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (lot) =>
          lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lot.factory_lot_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Material type filter
    if (materialTypeFilter) {
      filtered = filtered.filter(
        (lot) => lot.material_type.id === materialTypeFilter,
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "created_at":
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case "total_quantity":
          aVal = Number(a.total_quantity);
          bVal = Number(b.total_quantity);
          break;
        case "available_quantity":
          aVal = Number(a.available_quantity);
          bVal = Number(b.available_quantity);
          break;
        case "material_type":
          aVal = a.material_type.material_name.toLowerCase();
          bVal = b.material_type.material_name.toLowerCase();
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  };

  const paginate = (items) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const displayLots = mode === "view" ? lots : allLots;
  const processedLots = paginate(filterAndSort(displayLots));
  const totalPages = Math.ceil(displayLots.length / itemsPerPage);

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
                    ? `已關聯 ${lots.length} 個批次`
                    : `可添加 ${allLots.length} 個批次`}
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
              {/* Filters and Search */}
              <div className="h-[20%] space-y-4 p-3">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[200px] flex-1">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索批次 ID 或工廠批次號..."
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

                  {/*<select*/}
                  {/*  value={`${sortBy}_${sortOrder}`}*/}
                  {/*  onChange={(e) => {*/}
                  {/*    const [newSortBy, newSortOrder] =*/}
                  {/*      e.target.value.split("_");*/}
                  {/*    setSortBy(newSortBy);*/}
                  {/*    setSortOrder(newSortOrder);*/}
                  {/*    setPage(1); // Reset to first page when sorting changes*/}
                  {/*  }}*/}
                  {/*  className="rounded-xl border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"*/}
                  {/*>*/}
                  {/*  <option value="created_at_desc">創建時間 (新→舊)</option>*/}
                  {/*  <option value="created_at_asc">創建時間 (舊→新)</option>*/}
                  {/*  <option value="total_quantity_desc">總數量 (多→少)</option>*/}
                  {/*  <option value="total_quantity_asc">總數量 (少→多)</option>*/}
                  {/*  <option value="available_quantity_desc">*/}
                  {/*    可用數量 (多→少)*/}
                  {/*  </option>*/}
                  {/*  <option value="available_quantity_asc">*/}
                  {/*    可用數量 (少→多)*/}
                  {/*  </option>*/}
                  {/*  <option value="material_type_asc">物料類型 (A→Z)</option>*/}
                  {/*  <option value="material_type_desc">物料類型 (Z→A)</option>*/}
                  {/*</select>*/}

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
              <div className={`h-[80%] overflow-y-auto p-3`}>
                {isLoading || (mode === "add" && isLoadingAllLots) ? (
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
                ) : processedLots.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                    <Category className="h-12 w-12 text-gray-400" />
                    <p className="mt-2">
                      {searchTerm ? "沒有符合條件的批次" : "暫無批次資料"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {viewMode === "list" ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              {mode === "add" && (
                                <th className="w-12 px-4 py-3 text-left">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selectedLots.length === allLots.length &&
                                      allLots.length > 0
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedLots(
                                          allLots.map((l) => l.id),
                                        );
                                      } else {
                                        setSelectedLots([]);
                                      }
                                    }}
                                  />
                                </th>
                              )}
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                批次 ID
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                工廠批次號
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                物料類型
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                可用/總數量
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                狀態
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                創建時間
                              </th>
                              {mode === "view" && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                  操作
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {processedLots.map((lot) => (
                              <tr key={lot.id} className="hover:bg-gray-50">
                                {mode === "add" && (
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedLots.includes(lot.id)}
                                      onChange={() =>
                                        toggleLotSelection(lot.id)
                                      }
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-100">
                                      <LotIcon className="h-4 w-4 text-fuchsia-600" />
                                    </div>
                                    <span className="font-medium">
                                      {lot.id}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {lot.factory_lot_number}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {lot.material_type.material_name}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {lot.available_quantity}
                                    </span>
                                    <span className="text-gray-500">
                                      /{lot.total_quantity} {lot.material_unit}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                      lot.available_items,
                                      lot.total_items,
                                    )}`}
                                  >
                                    {getStatusIcon(
                                      lot.available_items,
                                      lot.total_items,
                                    )}
                                    {getStatusText(
                                      lot.available_items,
                                      lot.total_items,
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {formatDate(lot.created_at)}
                                </td>
                                {mode === "view" && (
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => handleRemoveLot(lot.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Delete className="h-4 w-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {processedLots.map((lot) => (
                          <div
                            key={lot.id}
                            className={`relative rounded-xl border border-gray-200 bg-gray-50 p-4 ${
                              mode === "add" && selectedLots.includes(lot.id)
                                ? "ring-2 ring-blue-500"
                                : ""
                            } cursor-pointer`}
                            onClick={() => {
                              if (mode === "add") toggleLotSelection(lot.id);
                            }}
                          >
                            {/* Checkbox is hidden, but selection is toggled by clicking the card */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-100">
                                  <LotIcon className="h-5 w-5 text-fuchsia-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{lot.id}</h4>
                                  <p className="text-xs text-gray-500">
                                    {lot.factory_lot_number}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                  lot.available_items,
                                  lot.total_items,
                                )}`}
                              >
                                {getStatusIcon(
                                  lot.available_items,
                                  lot.total_items,
                                )}
                              </span>
                            </div>

                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">
                                {lot.material_type.material_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {lot.available_quantity}/{lot.total_quantity}{" "}
                                {lot.material_unit}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {formatDate(lot.created_at)}
                              </span>
                              {mode === "view" && (
                                <button
                                  onClick={() => handleRemoveLot(lot.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Delete className="h-4 w-4" />
                                </button>
                              )}
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
                          {Math.min(page * itemsPerPage, displayLots.length)} /{" "}
                          {displayLots.length} 個批次
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
            </div>
            <div className="flex h-[8%] items-center justify-end border-t border-gray-200 px-6 py-4">
              {mode === "view" ? (
                <button
                  onClick={() => setMode("add")}
                  className="bg-blue flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Add className="h-4 w-4" />
                  添加批次
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddLots}
                    disabled={selectedLots.length === 0}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    確認添加 ({selectedLots.length})
                  </button>
                  <button
                    onClick={() => {
                      setMode("view");
                      setSelectedLots([]);
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
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

export default ProjectLotsModal;
