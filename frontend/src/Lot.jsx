import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import Header from "./componenets/Header.jsx";
import BackButton from "./componenets/BackButton.jsx";
import {
  Inventory,
  Search,
  ViewList,
  ViewModule,
  Category,
  LocalShipping,
  Inventory2,
  Warning,
  CheckCircle,
} from "@mui/icons-material";

const Lot = () => {
  const { materialTypeId } = useParams();
  const [lots, setLots] = useState([]);
  const [materialType, setMaterialType] = useState(null);
  const [totalLots, setTotalLots] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Updated animation variants for fade in/fade out
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    fetchLots();
  }, [materialTypeId]);

  const fetchLots = async () => {
    try {
      const token = localStorage.getItem("token");
      let url = "/api/lots";

      if (materialTypeId) {
        url = `/api/lots/material_type/${materialTypeId}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();

        if (materialTypeId) {
          // Response for specific material type
          setLots(data.lots || []);
          setMaterialType(data.material_type || null);
          setTotalLots(data.total_lots || 0);
        } else {
          // Response for all lots
          setLots(data || []);
          setTotalLots(data.length || 0);
          setMaterialType(null);
        }
      } else {
        setError("Failed to load lots data");
      }
    } catch (err) {
      setError("Network error loading lots");
      console.error("Error fetching lots:", err);
    } finally {
      setIsLoading(false);
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
    console.log(ratio);
    if (ratio === 1) return "完全可用";
    if (ratio > 0.5) return "部分使用";
    if (ratio > 0) return "大部分使用";
    return "完全使用";
  };

  // Filter lots based on search term
  const filteredLots = lots.filter(
    (lot) =>
      lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.factory_lot_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
        <Header
          title={materialType ? `${materialType.name} 批次` : "批次管理"}
        />
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
        <Header
          title={materialType ? `${materialType.name} 批次` : "批次管理"}
        />
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
      <Header title={materialType ? `${materialType.name} 批次` : "批次管理"} />

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
              <h1 className="text-2xl font-bold text-gray-800">
                {materialType ? `${materialType.name} 批次` : "批次管理"}
              </h1>
              <p className="text-gray-600">
                {materialType
                  ? `查看 ${materialType.name} (${materialType.unit}) 的所有批次`
                  : "查看和管理所有物料批次"}
              </p>
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

          {/* Material Type Info Card (if specific material type) */}
          {materialType && (
            <motion.div
              className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                  <Category className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {materialType.name}
                  </h3>
                  <p className="text-gray-600">
                    物料類型 ID: {materialType.id}
                    <br />
                    單位: {materialType.unit}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-gray-800">
                    {totalLots}
                  </div>
                  <div className="text-sm text-gray-500">總批次數</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search Bar */}
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
                placeholder="搜索批次 ID 或工廠批次號..."
                className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Lots List/Grid */}
          <motion.div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                批次列表 ({filteredLots.length})
              </h3>
            </div>

            {filteredLots.length === 0 ? (
              <div className="p-8 text-center">
                <Inventory className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {searchTerm ? "沒有符合條件的批次" : "暫無批次資料"}
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        批次 ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        工廠批次號
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        總數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        可用數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        箱數
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
                    {filteredLots.map((lot, index) => (
                      <motion.tr
                        key={lot.id}
                        className="hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <LocalShipping className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {lot.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {lot.factory_lot_number}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                          {lot.total_quantity}{" "}
                          {lot.material_unit || materialType?.unit || ""}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {lot.available_quantity}{" "}
                          {lot.material_unit || materialType?.unit || ""}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {lot.carton_count} 箱
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {formatDate(lot.created_at)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredLots.map((lot, index) => (
                  <motion.div
                    key={lot.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <LocalShipping className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {lot.id}
                          </h4>
                          <p className="text-sm text-gray-500">
                            工廠批次: {lot.factory_lot_number}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          lot.available_items,
                          lot.total_items,
                        )}`}
                      >
                        {getStatusIcon(lot.available_items, lot.total_items)}
                        {getStatusText(lot.available_items, lot.total_items)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lot.total_quantity}{" "}
                          {lot.material_unit || materialType?.unit || ""}
                        </div>
                        <div className="text-xs text-gray-500">總數量</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lot.available_quantity}{" "}
                          {lot.material_unit || materialType?.unit || ""}
                        </div>
                        <div className="text-xs text-gray-500">可用數量</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lot.carton_count} 箱
                        </div>
                        <div className="text-xs text-gray-500">箱數</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lot.total_items} 件
                        </div>
                        <div className="text-xs text-gray-500">總件數</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      {formatDate(lot.created_at)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Back Button */}
      <BackButton to="/inventory_overview" />
    </motion.div>
  );
};

export default Lot;
