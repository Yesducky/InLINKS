import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import {
  Search,
  ViewList,
  ViewModule,
  CheckCircle,
  Assignment,
  Warning,
} from "@mui/icons-material";
import { CartonIcon, ItemIcon, UsedIcon } from "../componenets/CustomIcons.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import StockLog from "../componenets/StockLog.jsx";
import LogButton from "../componenets/LogButton.jsx";
import api from "../services/api.js";

const ItemOverview = () => {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const cartonId = searchParams.get("carton_id");

  const [items, setItems] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [cartonInfo, setCartonInfo] = useState(null);
  const [cartonStat, setCartonStat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(statusFilter);
  const [viewMode, setViewMode] = useState("grid");
  const [showLogModal, setShowLogModal] = useState(false);
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    assignedItems: 0,
    usedItems: 0,
  });

  const [visibleCount, setVisibleCount] = useState(10);

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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      if (cartonId) {
        // If carton_id is provided, fetch items from specific carton
        const [itemsResponse, materialTypesResponse, cartonResponse] =
          await Promise.all([
            api.getCartonItems(cartonId),
            api.getMaterialTypes(),
            api.getCarton(cartonId),
          ]);

        if (itemsResponse.ok && materialTypesResponse.ok) {
          const itemsData = await itemsResponse.json();
          const materialTypesData = await materialTypesResponse.json();

          // Set carton info if carton response is successful
          if (cartonResponse.ok) {
            const cartonData = await cartonResponse.json();
            setCartonInfo(cartonData);
          }

          // Ensure itemsData is always an array
          const items = Array.isArray(itemsData.items) ? itemsData.items : [];
          setItems(items);
          setMaterialTypes(materialTypesData || []);
          setCartonStat(itemsData.statistics || {});

          // Calculate stats for carton items
          const totalItems = items.length;
          const availableItems = items.filter(
            (item) => item.status === "available",
          ).length;
          const assignedItems = items.filter(
            (item) => item.status === "assigned",
          ).length;
          const usedItems = items.filter(
            (item) => item.status === "used",
          ).length;

          setStats({
            totalItems,
            availableItems,
            assignedItems,
            usedItems,
          });
        } else {
          setError(itemsResponse.status);
        }
      } else {
        // Original logic for all items
        const [itemsResponse, materialTypesResponse] = await Promise.all([
          api.getAllItems(),
          api.getMaterialTypes(),
        ]);

        if (itemsResponse.ok && materialTypesResponse.ok) {
          const itemsData = await itemsResponse.json();
          const materialTypesData = await materialTypesResponse.json();

          setItems(itemsData || []);
          setMaterialTypes(materialTypesData || []);

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
          });
        } else {
          setError("Failed to load data");
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching data:", err);
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
        return <ItemIcon className="h-4 w-4" />;
      default:
        return <ItemIcon className="h-4 w-4" />;
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
        return "未知";
    }
  };

  const getMaterialTypeName = (materialTypeId) => {
    const materialType = materialTypes.find(
      (type) => type.id === materialTypeId,
    );
    return materialType ? materialType.material_name : "未知物料";
  };

  const getMaterialTypeUnit = (materialTypeId) => {
    const materialType = materialTypes.find(
      (type) => type.id === materialTypeId,
    );
    return materialType ? materialType.material_unit : "";
  };

  const handleShowMore = () => setVisibleCount((prev) => prev + 10);

  // Filter items based on search term and status
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.material_name &&
        item.material_name.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    if (selectedStatus !== "all") {
      matchesStatus = item.status === selectedStatus;
    }

    return matchesSearch && matchesStatus;
  });
  const visibleItems = filteredItems.slice(0, visibleCount);

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
        <Header title="物料清單" />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中" />
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
        <Header title="物料清單" />
        <FetchDataFail error={error} onRetry={fetchItems} className="h-64" />
      </motion.div>
    );
  }

  return (
    <PermissionGate resource="items" action="read" header={`物料清單`}>
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title={cartonId ? `箱子詳情 - 物料清單` : "物料清單"} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Carton Info Card - only show when viewing specific carton */}
            {cartonId && cartonInfo && (
              <motion.div
                className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                      <CartonIcon className="h-6 w-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-800">
                        箱子 {cartonInfo.id}
                      </h3>
                      <p className="text-gray-600">
                        工廠批次號：
                        <br />
                        {cartonInfo.factory_lot_number || "未知"}
                        <br />
                        物料：{cartonInfo.material_type.name || "未知"}
                      </p>
                    </div>
                    <div className="mr-0 ml-auto text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-800">
                          {cartonStat.total_quantity ?? "-"}
                          <span className="ml-1 text-xs">
                            {cartonInfo.material_type.unit || "件"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">物料總數</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Status Summary */}
                <div className="border-gray mt-4 grid grid-cols-4 gap-4 border-t border-b py-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {cartonStat.available_quantity ?? "-"}{" "}
                      {getMaterialTypeUnit(cartonInfo.material_type_id)}
                    </div>
                    <div className="text-sm text-gray-500">可用數量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-yellow-600">
                      {cartonStat.assigned_quantity ?? "-"}{" "}
                      {getMaterialTypeUnit(cartonInfo.material_type_id)}
                    </div>
                    <div className="text-sm text-gray-500">���分配</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {cartonStat.used_quantity ?? "-"}{" "}
                      {getMaterialTypeUnit(cartonInfo.material_type_id)}
                    </div>
                    <div className="text-sm text-gray-500">已使用</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {cartonStat.total_items ?? "-"}
                    </div>
                    <div className="text-sm text-gray-500">物料件數</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex">
                    <div className="mr-2 text-sm text-gray-500">創建時間: </div>
                    <div className="text-sm text-gray-700">
                      {formatDate(cartonInfo.created_at)}
                    </div>
                  </div>
                  <LogButton setShowLogModal={setShowLogModal} />
                </div>
              </motion.div>
            )}

            {/* Statistics Cards */}
            <motion.div
              className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "all" ? "ring-lightblue ring-2" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedStatus("all")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <ItemIcon className="text-blue h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">總物件</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.totalItems}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "available" ? "ring-2 ring-green-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                onClick={() => setSelectedStatus("available")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">可用</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.availableItems}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "assigned" ? "ring-2 ring-yellow-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                onClick={() => setSelectedStatus("assigned")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <Assignment className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已分配</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.assignedItems}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "used" ? "ring-2 ring-red-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                onClick={() => setSelectedStatus("used")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <UsedIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已使用</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.usedItems}
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
                  placeholder="搜索物料 ID、批次 ID 或物料名稱..."
                  className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>

            {/* Items List/Grid */}
            <motion.div
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  物料清單 ({visibleItems.length})
                </h3>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "grid" : "list")
                  }
                  className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 whitespace-nowrap text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                >
                  {viewMode === "list" ? (
                    <ViewModule className="h-5 w-5" />
                  ) : (
                    <ViewList className="h-5 w-5" />
                  )}
                </button>
              </div>

              {visibleItems.length === 0 ? (
                <div className="p-8 text-center">
                  <ItemIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                          物料名稱
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
                      {visibleItems.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          className="cursor-pointer hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() => navigate(`/item/${item.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                <ItemIcon className="text-blue h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {getMaterialTypeName(item.material_type_id)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {item.quantity}{" "}
                            {getMaterialTypeUnit(item.material_type_id)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                                item.status,
                              )}`}
                            >
                              {getStatusIcon(item.status)}
                              {getStatusText(item.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(item.created_at)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleCount < filteredItems.length && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={handleShowMore}
                        className="bg-blue hover:bg-lightblue rounded-xl px-6 py-2 text-white"
                      >
                        顯示更多
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      onClick={() => navigate(`/item/${item.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <ItemIcon className="text-blue h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {item.parent_id &&
                              item.status === "assigned" &&
                              item.parent_id.startsWith("ITM")
                                ? item.parent_id + " 分配"
                                : item.id}
                            </h4>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                            item.status,
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getMaterialTypeName(item.material_type_id)}
                          </div>
                          <div className="text-xs text-gray-500">物料名稱</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.quantity}
                            {getMaterialTypeUnit(item.material_type_id)}
                          </div>
                          <div className="text-xs text-gray-500">數量</div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        建立時間：{formatDate(item.created_at)}
                      </div>
                    </motion.div>
                  ))}
                  {visibleCount < filteredItems.length && (
                    <div className="col-span-full flex justify-center py-4">
                      <button
                        onClick={handleShowMore}
                        className="bg-blue hover:bg-lightblue rounded-xl px-6 py-2 text-white"
                      >
                        顯示更多
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <StockLog
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        entityType={"carton"}
        entityId={cartonId || null}
      />
    </PermissionGate>
  );
};

export default ItemOverview;
