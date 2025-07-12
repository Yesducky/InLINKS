import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "./componenets/Header.jsx";
import BackButton from "./componenets/BackButton.jsx";
import {
  Inventory,
  Search,
  FilterList,
  ViewList,
  ViewModule,
  TrendingUp,
  TrendingDown,
  Inventory2,
  Warning,
  CheckCircle,
  Category,
} from "@mui/icons-material";

const InventoryOverview = () => {
  const [items, setItems] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [lots, setLots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    assignedItems: 0,
    usedItems: 0,
    totalLots: 0,
    materialTypes: 0,
  });

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 0, scale: 0.95 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -50, scale: 0.95 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch all data in parallel - using correct endpoints from stock_routes.py
      const [itemsRes, materialTypesRes, lotsRes] = await Promise.all([
        fetch("/api/items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/material_types", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/lots", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (itemsRes.ok && materialTypesRes.ok && lotsRes.ok) {
        const itemsData = await itemsRes.json();
        const materialTypesData = await materialTypesRes.json();
        const lotsData = await lotsRes.json();

        setItems(itemsData || []);
        setMaterialTypes(materialTypesData || []);
        setLots(lotsData || []);

        // Calculate stats
        const totalItems = itemsData.length;
        const availableItems = itemsData.filter(
          (item) => item.status === "available",
        ).length;
        const assignedItems = itemsData.filter(
          (item) => item.status === "assigned",
        ).length;
        const usedItems = itemsData.filter(
          (item) => item.status === "used",
        ).length;

        setStats({
          totalItems,
          availableItems,
          assignedItems,
          usedItems,
          totalLots: lotsData.length,
          materialTypes: materialTypesData.length,
        });
      } else {
        setError("Failed to load inventory data");
      }
    } catch (err) {
      setError("Network error loading inventory");
      console.error("Error fetching inventory data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaterialTypeName = (materialTypeId) => {
    const materialType = materialTypes.find(
      (type) => type.id === materialTypeId,
    );
    return materialType ? materialType.material_name : "Unknown";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "used":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4" />;
      case "assigned":
        return <Warning className="h-4 w-4" />;
      case "used":
        return <Inventory2 className="h-4 w-4" />;
      default:
        return <Inventory2 className="h-4 w-4" />;
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getMaterialTypeName(item.material_type_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || item.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

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
        <Header title={"庫存總覽"} />
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-gray-600">載入中...</div>
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
        <Header title={"庫存總覽"} />
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-red-600">{error}</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Header title={"庫存總覽"} />

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Page Header */}
          <motion.div
            className="mb-8 flex items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-800">庫存總覽</h1>
              <p className="text-gray-600">管理和監控所有庫存物料</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "grid" : "list")
                }
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
              >
                {viewMode === "list" ? (
                  <ViewModule className="h-5 w-5" />
                ) : (
                  <ViewList className="h-5 w-5" />
                )}
                {viewMode === "list" ? "網格檢視" : "列表檢視"}
              </button>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div
            className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Inventory className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">總物料</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.totalItems}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">可用</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.availableItems}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                  <Warning className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">已分配</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.assignedItems}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Inventory2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">已使用</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.usedItems}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">批次數</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.totalLots}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <Category className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">物料類型</p>
                  <p className="text-xl font-bold text-gray-800">
                    {stats.materialTypes}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索物料 ID 或名稱..."
                className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FilterList className="h-5 w-5 text-gray-400" />
                <select
                  className="rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">所有狀態</option>
                  <option value="available">可用</option>
                  <option value="assigned">已分配</option>
                  <option value="used">已使用</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Items List/Grid */}
          <motion.div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                物料清單 ({filteredItems.length})
              </h3>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <Inventory className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {searchTerm || selectedStatus !== "all"
                    ? "沒有符合條件的物料"
                    : "暫無物料資料"}
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        物料 ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        物料類型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        創建時間
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredItems.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        className="hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <Inventory2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {item.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {getMaterialTypeName(item.material_type_id)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}
                          >
                            {getStatusIcon(item.status)}
                            {item.status === "available"
                              ? "可用"
                              : item.status === "assigned"
                                ? "已分配"
                                : "已使用"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                "zh-TW",
                              )
                            : "N/A"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <Inventory2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {item.id}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {getMaterialTypeName(item.material_type_id)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(item.status)}`}
                      >
                        {getStatusIcon(item.status)}
                        {item.status === "available"
                          ? "可用"
                          : item.status === "assigned"
                            ? "已分配"
                            : "已使用"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                      <span>數量: {item.quantity}</span>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(
                              "zh-TW",
                            )
                          : "N/A"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Back Button */}
      <BackButton to="/dashboard" />
    </motion.div>
  );
};

export default InventoryOverview;
