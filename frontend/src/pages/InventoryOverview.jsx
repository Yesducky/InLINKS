import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import {
  Inventory,
  Search,
  ViewList,
  ViewModule,
  Inventory2,
  CheckCircle,
  Category,
  AssignmentTurnedIn,
} from "@mui/icons-material";
import { ItemIcon, LotIcon } from "../componenets/CustomIcons.jsx";
import api from "../services/api.js";
import {
  backgroundVariants,
  commonAnimationVariantsOne,
} from "../utils/styles.js";
import AddButton from "../componenets/AddButton.jsx";
import AddMaterial from "../componenets/AddMaterial.jsx";

const InventoryOverview = () => {
  const navigate = useNavigate();
  const [materialTypeQuantities, setMaterialTypeQuantities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "list" or "grid"
  const [stats, setStats] = useState({
    totalItems: 0,
    availableItems: 0,
    assignedItems: 0,
    usedItems: 0,
    totalLots: 0,
    materialTypes: 0,
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // Extract common animation variants from utils
  const { pageVariants, pageTransition, cardVariants } =
    commonAnimationVariantsOne;

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      // Fetch material type quantities and lots data
      const [materialTypeQuantitiesRes, lotsRes] = await Promise.all([
        api.getMaterialTypeQuantity(),
        api.getLots(),
      ]);

      if (materialTypeQuantitiesRes.ok && lotsRes.ok) {
        const materialTypeQuantitiesData =
          await materialTypeQuantitiesRes.json();
        const lotsData = await lotsRes.json();

        setMaterialTypeQuantities(
          materialTypeQuantitiesData.material_type_quantities || [],
        );

        // Calculate stats from material type quantities
        const totalItems =
          materialTypeQuantitiesData.material_type_quantities.reduce(
            (sum, type) => sum + type.total_items,
            0,
          );
        const availableItems =
          materialTypeQuantitiesData.material_type_quantities.reduce(
            (sum, type) => sum + type.available_items,
            0,
          );
        const assignedItems =
          materialTypeQuantitiesData.material_type_quantities.reduce(
            (sum, type) => sum + type.assigned_items,
            0,
          );
        const usedItems =
          materialTypeQuantitiesData.material_type_quantities.reduce(
            (sum, type) => sum + type.used_items,
            0,
          );

        setStats({
          totalItems,
          availableItems,
          assignedItems,
          usedItems,
          totalLots: lotsData.length,
          materialTypes: materialTypeQuantitiesData.total_material_types || 0,
        });
      } else {
        setError(materialTypeQuantitiesRes.status);
      }
    } catch (err) {
      setError(err);
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // Filter material types based on search and status
  const filteredMaterialTypes = materialTypeQuantities.filter(
    (materialType) => {
      const matchesSearch =
        materialType.material_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        materialType.material_type_id
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      let matchesStatus = true;

      return matchesSearch && matchesStatus;
    },
  );

  const handleAddMaterialSuccess = () => {
    fetchInventoryData();
  };

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={backgroundVariants.inventory}
      >
        <Header title={"庫存總覽"} />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中" />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen w-full"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={backgroundVariants.inventory}
      >
        <Header title={"庫存總覽"} />
        <FetchDataFail
          error={error}
          onRetry={fetchInventoryData}
          className="h-64"
        />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={backgroundVariants.inventory}
      >
        <Header title={"庫存總覽"} />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Statistics Cards */}
            <motion.div
              className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                className="glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onClick={() => navigate("/item_overview")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <ItemIcon className="text-blue h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">總物件</p>
                    <p className="text-xl font-bold text-gray-800">
                      {stats.totalItems}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                onClick={() => navigate("/item_overview?status=available")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-800" />
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
                className="glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                onClick={() => navigate("/item_overview?status=assigned")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                    <AssignmentTurnedIn className="h-5 w-5 text-yellow-800" />
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
                className="glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                onClick={() => navigate("/item_overview?status=used")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Inventory2 className="h-5 w-5 text-red-800" />
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
                className="glassmorphism cursor-pointer rounded-2xl border border-gray-100 p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.5 }}
                onClick={() => navigate("/lot_overview")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-100">
                    <LotIcon className="h-5 w-5 text-fuchsia-600" />
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
                className="glassmorphism rounded-2xl border border-gray-100 p-4 shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                    <Category className="h-5 w-5 text-cyan-600" />
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
                <Search className="absolute top-1/2 left-3 z-10 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索物料類型 ID 或名稱..."
                  className="glassmorphism w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>

            {/* Items List/Grid */}
            <motion.div
              className="glassmorphism overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  物料類型清單 ({filteredMaterialTypes.length})
                </h3>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "grid" : "list")
                  }
                  className="glassmorphism flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                >
                  {viewMode === "list" ? (
                    <ViewModule className="h-5 w-5" />
                  ) : (
                    <ViewList className="h-5 w-5" />
                  )}
                </button>
              </div>

              {filteredMaterialTypes.length === 0 ? (
                <div className="p-8 text-center">
                  <Inventory className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    {searchTerm !== "all"
                      ? "沒有符合條件的物料類型"
                      : "暫無物料類型資料"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          物料類型 ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          物料類型名稱
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
                      </tr>
                    </thead>
                    <tbody className="glassmorphism divide-y divide-gray-200">
                      {filteredMaterialTypes.map((materialType, index) => (
                        <motion.tr
                          key={materialType.material_type_id}
                          className="cursor-pointer transition-colors duration-200 hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() =>
                            navigate(
                              `/lot_overview/${materialType.material_type_id}`,
                            )
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100">
                                <Category
                                  className="text-cyan-600"
                                  sx={{ fontSize: 18 }}
                                />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {materialType.material_type_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {materialType.material_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              單位: {materialType.material_unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                              <CheckCircle className="h-3 w-3" />
                              {materialType.available_quantity}{" "}
                              {materialType.material_unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                              <AssignmentTurnedIn className="h-3 w-3" />
                              {materialType.assigned_quantity}{" "}
                              {materialType.material_unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                              <Inventory2 className="h-3 w-3" />
                              {materialType.used_quantity}{" "}
                              {materialType.material_unit}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold whitespace-nowrap text-gray-900">
                            {materialType.total_quantity}{" "}
                            {materialType.material_unit}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredMaterialTypes.map((materialType, index) => (
                    <motion.div
                      key={materialType.material_type_id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      onClick={() =>
                        navigate(
                          `/lot_overview/${materialType.material_type_id}`,
                        )
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                            <Category className="h-5 w-5 text-cyan-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {materialType.material_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {materialType.material_type_id}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {materialType.total_quantity}{" "}
                            {materialType.material_unit}
                          </div>
                          <div className="text-xs text-gray-500">總數量</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            {materialType.available_quantity}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">可用</div>
                        </div>

                        <div className="text-center">
                          <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                            <AssignmentTurnedIn className="h-3 w-3" />
                            {materialType.assigned_quantity}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            已分配
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                            <Inventory2 className="h-3 w-3" />
                            {materialType.used_quantity}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            已使用
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {showAddMaterial && (
          <AddMaterial
            open={showAddMaterial}
            onClose={() => setShowAddMaterial(false)}
            onSuccess={handleAddMaterialSuccess}
          />
        )}
      </AnimatePresence>
      <AddButton action={() => setShowAddMaterial(true)} />
    </>
  );
};

export default InventoryOverview;
