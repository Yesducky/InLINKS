import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrowserMultiFormatReader } from "@zxing/library";
import LoadingSpinner from "./LoadingSpinner.jsx";
import {
  Save,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  QrCodeScanner,
  Close,
} from "@mui/icons-material";
import api from "../services/api.js";

const AddMaterial = ({ open, onClose, onSuccess }) => {
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // QR Scanner refs
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  const [material, setMaterial] = useState({
    material_type_id: "",
    factory_lot_number: "",
    total_quantity: "",
    carton_count: "",
    items_per_carton: "",
    item_quantity: "", // Individual item quantity (material type unit)
  });

  // Modal animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants = {
    hidden: { y: "100%" },
    visible: {
      y: "0%",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      y: "100%",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
  };

  // Fetch material types on component mount
  useEffect(() => {
    if (!open) return;

    const fetchMaterialTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const response = await api.getMaterialTypes();

        if (response.ok) {
          const data = await response.json();
          setMaterialTypes(data || []);
        } else {
          setMessage({ type: "error", text: "無法載入物料類型" });
        }
      } catch (error) {
        console.error("Error fetching material types:", error);
        setMessage({ type: "error", text: "網絡錯誤，請重試" });
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchMaterialTypes();
  }, [open]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMaterial((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear message when user types
    if (message.text) setMessage({ type: "", text: "" });
    // Clear camera error when user types in the factory lot number field
    if (name === "factory_lot_number" && cameraError) setCameraError("");
  };

  // Calculate total quantity from cartons
  const calculateTotalFromCartons = () => {
    const cartonCount = parseInt(material.carton_count) || 0;
    const itemsPerCarton = parseInt(material.items_per_carton) || 0;
    return cartonCount * itemsPerCarton;
  };

  // Check if quantities match
  const checkQuantitiesMatch = () => {
    const total = parseFloat(material.total_quantity) || 0;
    const cartons = parseInt(material.carton_count) || 0;
    const itemsPerCarton = parseInt(material.items_per_carton) || 0;
    const itemQuantity = parseFloat(material.item_quantity) || 0;

    if (
      total === 0 ||
      cartons === 0 ||
      itemsPerCarton === 0 ||
      itemQuantity === 0
    ) {
      return { match: null, message: "" };
    }

    const calculatedTotal = cartons * itemsPerCarton * itemQuantity;
    const match = total === calculatedTotal;
    const materialUnit = materialTypes.find(
      (type) => type.id === material.material_type_id,
    )?.material_unit;
    return {
      match,
      message: match
        ? `數量匹配: ${total} ${materialUnit}`
        : `數量不匹配: 總數量 ${total} ${materialUnit} ≠ 箱數 ${cartons} × 每箱 ${itemsPerCarton} × 每件 ${itemQuantity} ${materialUnit} = ${calculatedTotal} ${materialUnit}`,
    };
  };

  // Get the final total quantity to submit
  const getFinalQuantity = () => {
    const totalQuantity = parseFloat(material.total_quantity) || 0;
    const calculatedFromCartons = calculateTotalFromCartons();

    // If both total and carton info are provided, use total quantity
    if (totalQuantity > 0) {
      return totalQuantity;
    }

    // Otherwise use calculated from cartons
    return calculatedFromCartons;
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    // Check required fields
    if (
      !material.material_type_id ||
      !material.factory_lot_number ||
      !material.total_quantity ||
      !material.carton_count ||
      !material.items_per_carton
    ) {
      return false;
    }

    // Check if at least one quantity is provided
    const total = parseFloat(material.total_quantity) || 0;
    const cartons = parseInt(material.carton_count) || 0;
    const itemsPerCarton = parseInt(material.items_per_carton) || 0;
    const itemQuantity = parseFloat(material.item_quantity) || 0;

    // Must have either total quantity OR both carton info
    const hasValidQuantity =
      total > 0 || (cartons > 0 && itemsPerCarton > 0 && itemQuantity > 0);
    if (!hasValidQuantity) {
      return false;
    }

    // If all three fields are filled, they must match
    if (total > 0 && cartons > 0 && itemsPerCarton > 0) {
      const calculatedTotal = cartons * itemsPerCarton * itemQuantity;
      return total === calculatedTotal;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    // Validation
    const finalQuantity = getFinalQuantity();
    if (finalQuantity <= 0) {
      setMessage({
        type: "error",
        text: "請輸入總數量，或同時輸入箱數和每箱件數",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        material_type_id: material.material_type_id,
        factory_lot_number: material.factory_lot_number,
        total_quantity: finalQuantity,
        carton_count: parseInt(material.carton_count) || null,
        items_per_carton: parseInt(material.items_per_carton) || null,
        item_quantity: parseFloat(material.item_quantity) || null, // Individual item quantity
      };
      const response = await api.postAddLot(body);

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "批次添加成功！" });
        if (onSuccess) onSuccess();
        // Reset form after successful submission
        setTimeout(() => {
          handleReset();
          onClose(); // Close modal after successful submission
        }, 500);
      } else {
        setMessage({ type: "error", text: data.message || "添加失敗" });
      }
    } catch (error) {
      console.error("Error adding lot:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMaterial({
      material_type_id: "",
      factory_lot_number: "",
      total_quantity: "",
      carton_count: "",
      items_per_carton: "",
      item_quantity: "", // Individual item quantity (material type unit)
    });
    setMessage({ type: "", text: "" });
    setCameraError("");
  };

  // QR/Barcode scanning functions
  const startScanning = () => {
    setCameraError("");
    setIsScanning(true);
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.reset();
    }
    setIsScanning(false);
  };

  // Effect to initialize scanner when modal opens
  useEffect(() => {
    if (isScanning && videoRef.current) {
      const initScanner = async () => {
        try {
          const codeReader = new BrowserMultiFormatReader();
          qrScannerRef.current = codeReader;

          // Start decoding from video device
          await codeReader.decodeFromVideoDevice(
            undefined, // Use default camera
            videoRef.current,
            (result, err) => {
              if (result) {
                setMaterial((prev) => ({
                  ...prev,
                  factory_lot_number: result.getText(),
                }));
                setIsScanning(false);
              }
              if (err && err.name !== "NotFoundException") {
                console.error("Scanner error:", err);
              }
            },
          );
        } catch (error) {
          console.error("Failed to start scanner:", error);
          setCameraError("無法啟動相機。請檢查權限設置。");
          setIsScanning(false);
        }
      };

      initScanner();
    }

    // Cleanup function
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.reset();
      }
    };
  }, [isScanning]);

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop - Full screen coverage */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Bottom Sheet */}
      <motion.div
        className="absolute right-0 bottom-0 left-0 h-[80%] rounded-t-3xl bg-white"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking on sheet
      >
        {/* Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="h-1 w-12 rounded-full bg-gray-300"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-gray-100"
        >
          <Close className="h-5 w-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="h-full overflow-y-auto px-6 pt-8 pb-6">
          <div className="space-y-6">
            <h2 className="mb-4 text-xl font-bold text-gray-800">新增物料</h2>

            {/* Show loading spinner when initially loading material types */}
            {isLoadingTypes && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner
                  variant="circular"
                  size={30}
                  message="載入物料類型中..."
                />
              </div>
            )}

            {/* Show backdrop loading during form submission */}
            {isSubmitting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
                <LoadingSpinner
                  variant="circular"
                  size={40}
                  message="添加物料中..."
                />
              </div>
            )}

            {!isLoadingTypes && (
              <>
                {/* Message Display */}
                {message.text && (
                  <div
                    className={`rounded-xl p-4 ${
                      message.type === "success"
                        ? "border border-green-200 bg-green-50 text-green-700"
                        : "border border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    <div className="flex items-center">
                      {message.type === "success" ? (
                        <CheckCircle className="mr-2 h-5 w-5" />
                      ) : (
                        <ErrorIcon className="mr-2 h-5 w-5" />
                      )}
                      {message.text}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Material Type */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      物料類型 *
                    </label>
                    <select
                      name="material_type_id"
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={material.material_type_id}
                      onChange={handleInputChange}
                      disabled={isLoadingTypes}
                    >
                      <option value="">選擇物料類型</option>
                      {materialTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.material_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Factory Lot Number */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      工廠批次號 *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        name="factory_lot_number"
                        required
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="輸入工廠批次號"
                        value={material.factory_lot_number}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        onClick={isScanning ? stopScanning : startScanning}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                          isScanning
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-blue text-white hover:bg-blue-600"
                        }`}
                        disabled={isSubmitting}
                        title={isScanning ? "停止掃描" : "掃描QR碼"}
                      >
                        {isScanning ? (
                          <Close className="h-5 w-5" />
                        ) : (
                          <QrCodeScanner className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {/* Camera Error Display */}
                    {cameraError && (
                      <div className="mt-2 flex items-center text-sm text-red-600">
                        <ErrorIcon className="mr-1 h-4 w-4" />
                        {cameraError}
                      </div>
                    )}
                  </div>

                  {/* Quantity Inputs */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      數量設置 *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Total Quantity */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          總數量
                          {material.material_type_id &&
                            materialTypes.find(
                              (type) => type.id === material.material_type_id,
                            )?.material_unit &&
                            ` (${
                              materialTypes.find(
                                (type) => type.id === material.material_type_id,
                              )?.material_unit
                            })`}
                        </label>
                        <input
                          type="number"
                          name="total_quantity"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="輸入總數量"
                          value={material.total_quantity}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Carton Count */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          箱數
                        </label>
                        <input
                          type="number"
                          name="carton_count"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="輸入箱數"
                          value={material.carton_count}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Items Per Carton */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          每箱件數
                        </label>
                        <input
                          type="number"
                          name="items_per_carton"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="輸入每箱件數"
                          value={material.items_per_carton}
                          onChange={handleInputChange}
                        />
                      </div>

                      {/* Item Quantity */}
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          單項數量
                          {material.material_type_id &&
                            materialTypes.find(
                              (type) => type.id === material.material_type_id,
                            )?.material_unit &&
                            ` (${
                              materialTypes.find(
                                (type) => type.id === material.material_type_id,
                              )?.material_unit
                            })`}
                        </label>
                        <input
                          type="number"
                          name="item_quantity"
                          step="0.01"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="輸入每個物料項目的數量"
                          value={material.item_quantity}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    {/* Quantity Match Display */}
                    <div className="mt-2 text-sm">
                      <span
                        className={`rounded-lg px-3 py-1 transition-opacity ${
                          checkQuantitiesMatch().match !== null
                            ? "visible"
                            : "invisible"
                        } ${
                          checkQuantitiesMatch().match
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {checkQuantitiesMatch().message}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex w-1/3 items-center justify-center gap-2 rounded-xl bg-gray-500 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-gray-600"
                      disabled={isSubmitting}
                    >
                      <Refresh className="h-4 w-4" />
                      重置
                    </button>
                    <button
                      type="submit"
                      className="bg-blue flex w-2/3 items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        isSubmitting || isLoadingTypes || !isFormValid()
                      }
                    >
                      {isSubmitting ? (
                        <LoadingSpinner variant="dots" message="" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSubmitting ? "添加中..." : "添加物料"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <motion.div
          className="bg-opacity-75 fixed inset-0 z-60 flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="relative mx-4 w-full max-w-md">
            <motion.div
              className="rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  掃描QR碼/條碼
                </h3>
                <button
                  onClick={stopScanning}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition-colors duration-200 hover:bg-gray-300"
                >
                  <Close className="h-4 w-4" />
                </button>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gray-100">
                <video
                  ref={videoRef}
                  className="h-64 w-full object-cover"
                  playsInline
                />
                <div className="absolute inset-0 border-2 border-dashed border-blue-500 opacity-50"></div>
              </div>

              <p className="mt-4 text-center text-sm text-gray-600">
                將QR碼或條碼對準相機進行掃描
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AddMaterial;
