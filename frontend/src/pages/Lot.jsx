import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import {
  Search,
  ViewList,
  ViewModule,
  Inventory2,
  Warning,
  CheckCircle,
  Archive,
  AssignmentTurnedIn,
} from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import BackButton from "../componenets/BackButton.jsx";

const Lot = () => {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const [lot, setLot] = useState(null);
  const [cartons, setCartons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");

  // Updated animation variants for fade in/fade out - matching LotOverview
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
    fetchLotDetails();
  }, [lotId]);

  const fetchLotDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch lot details
      const lotResponse = await fetch(`/api/lots/${lotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!lotResponse.ok) {
        setError("批次不存在或無法訪問");
        setIsLoading(false);
        return;
      }

      const lotData = await lotResponse.json();
      setLot(lotData);

      // Fetch cartons for this lot using the new API endpoint
      await fetchCartons();
    } catch (err) {
      setError("網絡錯誤，無法載入批次詳情");
      console.error("Error fetching lot details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCartons = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/cartons/lot/${lotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCartons(data.cartons || []);
      } else {
        console.error("Failed to fetch cartons");
        setCartons([]);
      }
    } catch (err) {
      console.error("Error fetching cartons:", err);
      setCartons([]);
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
    if (totalItems === 0) return "bg-gray-100 text-gray-800";
    const ratio = availableItems / totalItems;
    if (ratio === 1) return "bg-green-100 text-green-800";
    if (ratio > 0.5) return "bg-yellow-100 text-yellow-800";
    if (ratio > 0) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusIcon = (availableItems, totalItems) => {
    if (totalItems === 0) return <Inventory2 className="h-4 w-4" />;
    const ratio = availableItems / totalItems;
    if (ratio === 1) return <CheckCircle className="h-4 w-4" />;
    if (ratio > 0) return <Warning className="h-4 w-4" />;
    return <Inventory2 className="h-4 w-4" />;
  };

  const getStatusText = (availableItems, totalItems) => {
    if (totalItems === 0) return "空箱";
    const ratio = availableItems / totalItems;
    if (ratio === 1) return "完全可用";
    if (ratio > 0.5) return "部分使用";
    if (ratio > 0) return "大部分使用";
    return "完全使用";
  };

  // Filter cartons based on search term
  const filteredCartons = cartons.filter((carton) =>
    carton.id.toLowerCase().includes(searchTerm.toLowerCase()),
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
        <Header title="批次詳情" />
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
        <Header title="批次詳情" />
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-red-600">{error}</div>
        </div>
        <BackButton
          to={cartonId ? `/lot/${lotId || ""}` : "/inventory_overview"}
        />
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
      <Header title={`${lot?.id} 批次詳情 `} />

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-8 flex items-start justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="flex-1">
              <p className="text-gray-600">查看和管理批次</p>
            </div>
            <div className="flex-shrink-0">
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
                {/*{viewMode === "list" ? "網格檢視" : "列表檢視"}*/}
              </button>
            </div>
          </motion.div>

          {/* Lot Info Card */}
          {lot && (
            <motion.div
              className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {lot.id}
                  </h3>
                  <p className="text-gray-600">
                    工廠批次號： <br />
                    {lot.factory_lot_number}
                    <br />
                    物料：{lot.material_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-800">
                      {lot.carton_count}
                    </div>
                    <div className="text-xs text-gray-500">箱數</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-800">
                      {lot.total_quantity}{" "}
                      <span className={`text-xs`}>{lot.material_unit}</span>
                    </div>
                    <div className="text-xs text-gray-500">總數量</div>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="border-gray mt-4 grid grid-cols-4 gap-4 border-t border-b py-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {lot.available_quantity} {lot.material_unit}
                  </div>
                  <div className="text-sm text-gray-500">可用數量</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600">
                    {lot.assigned_quantity} {lot.material_unit}
                  </div>
                  <div className="text-sm text-gray-500">已分配</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {lot.used_quantity} {lot.material_unit}
                  </div>
                  <div className="text-sm text-gray-500">已使用</div>
                </div>
              </div>
              <div className="flex pt-4">
                <div className="mr-2 text-sm text-gray-500">創建時間: </div>
                <div className="text-sm text-gray-700">
                  {formatDate(lot.created_at)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <motion.div
            className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索箱子 ID..."
                className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Cartons List/Grid */}
          <motion.div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                箱子列表 ({filteredCartons.length})
              </h3>
            </div>

            {filteredCartons.length === 0 ? (
              <div className="p-8 text-center">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {searchTerm ? "沒有符合條件的箱子" : "此批次暫無箱子"}
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        箱子 ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        可用數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        已分配數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        已使用數量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        總數量
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
                    {filteredCartons.map((carton, index) => (
                      <motion.tr
                        key={carton.id}
                        className="cursor-pointer hover:bg-gray-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        onClick={() =>
                          navigate(`/item_overview?carton_id=${carton.id}`)
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                              <Archive className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {carton.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            {carton.available_quantity || 0}{" "}
                            {lot?.material_unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                            <AssignmentTurnedIn className="h-3 w-3" />
                            {carton.assigned_quantity || 0} {lot?.material_unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                            <Inventory2 className="h-3 w-3" />
                            {carton.used_quantity || 0} {lot?.material_unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold whitespace-nowrap text-gray-900">
                          {carton.total_quantity} {lot?.material_unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                              carton.available_items,
                              carton.total_items,
                            )}`}
                          >
                            {getStatusIcon(
                              carton.available_items,
                              carton.total_items,
                            )}
                            {getStatusText(
                              carton.available_items,
                              carton.total_items,
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                          {formatDate(carton.created_at)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCartons.map((carton, index) => (
                  <motion.div
                    key={carton.id}
                    className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    onClick={() =>
                      navigate(`/item_overview?carton_id=${carton.id}`)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                          <Archive className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {carton.id}
                          </h4>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          carton.available_items,
                          carton.total_items,
                        )}`}
                      >
                        {getStatusIcon(
                          carton.available_items,
                          carton.total_items,
                        )}
                        {getStatusText(
                          carton.available_items,
                          carton.total_items,
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          {carton.available_quantity || 0}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">可用</div>
                      </div>

                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                          <AssignmentTurnedIn className="h-3 w-3" />
                          {carton.assigned_quantity || 0}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">已分配</div>
                      </div>

                      <div className="text-center">
                        <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                          <Inventory2 className="h-3 w-3" />
                          {carton.used_quantity || 0}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">已使用</div>
                      </div>
                    </div>

                    <div className="text-md mt-4 flex justify-between gap-4 font-medium text-gray-900">
                      <div>總數：</div>
                      <div>{carton.total_items} 件</div>
                      <div>
                        {carton.total_quantity} {lot?.material_unit}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Back Button */}
      <BackButton
        to={
          lot?.material_type_id
            ? `/lot_overview/${lot.material_type_id}`
            : "/lot_overview"
        }
      />
    </motion.div>
  );
};

export default Lot;
