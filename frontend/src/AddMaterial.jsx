import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BrowserMultiFormatReader } from "@zxing/library";
import Header from "./componenets/Header.jsx";
import BackButton from "./componenets/BackButton.jsx";
import {
  Save,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  QrCodeScanner,
  Close,
} from "@mui/icons-material";

const AddMaterial = () => {
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
  });

  // Animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 50,
      scale: 0.95,
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      x: -50,
      scale: 0.95,
    },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  // Fetch material types on component mount
  useEffect(() => {
    const fetchMaterialTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/material_types", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

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
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/stock/lots", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          material_type_id: material.material_type_id,
          factory_lot_number: material.factory_lot_number,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "批次添加成功！" });
        // Reset form after successful submission
        setTimeout(() => {
          handleReset();
        }, 1500);
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
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Header title={"新增物料"} />

      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <p className="text-gray-600">填寫物料信息以添加到庫存系統</p>
          </div>

          {/* Form Card */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
            {/* Message Display */}
            {message.text && (
              <div
                className={`border-b p-4 ${
                  message.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
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

            <form onSubmit={handleSubmit} className="space-y-6 p-8">
              {/* Material Type */}
              <div>
                <label
                  htmlFor="material_type_id"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  物料類型 *
                </label>
                <select
                  id="material_type_id"
                  name="material_type_id"
                  required
                  className="focus:ring-blue w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                  value={material.material_type_id}
                  onChange={handleInputChange}
                  disabled={isLoadingTypes}
                >
                  <option value="">
                    {isLoadingTypes ? "載入中..." : "選擇物料類型"}
                  </option>
                  {materialTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.material_name} ({type.material_unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Factory Lot Number */}
              <div>
                <label
                  htmlFor="factory_lot_number"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  工廠批次號 *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="factory_lot_number"
                    name="factory_lot_number"
                    required
                    className="focus:ring-blue w-full flex-1 rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2"
                    placeholder="輸入工廠批次號"
                    value={material.factory_lot_number}
                    onChange={handleInputChange}
                  />
                  <button
                    type="button"
                    onClick={isScanning ? stopScanning : startScanning}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                      isScanning
                        ? "bg-red text-white hover:bg-red-600"
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

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4 border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-400 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-gray-600"
                  disabled={isSubmitting}
                >
                  <Refresh className="h-5 w-5" />
                  重置
                </button>
                <button
                  type="submit"
                  className="bg-lightblue hover:bg-blue flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting || isLoadingTypes}
                >
                  <Save className="h-5 w-5" />
                  {isSubmitting ? "添加中..." : "添加物料"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <BackButton to="/dashboard" />

      {/* QR Scanner Modal */}
      {isScanning && (
        <motion.div
          className="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black"
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
                  <Close className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  className="h-64 w-full rounded-xl border border-gray-300 object-cover"
                  playsInline
                  muted
                  style={{ backgroundColor: "#f3f4f6" }}
                />

                {/* Scanner overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="border-blue h-48 w-48 rounded-lg border-2 bg-transparent">
                    <div className="border-blue absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4"></div>
                    <div className="border-blue absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4"></div>
                    <div className="border-blue absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4"></div>
                    <div className="border-blue absolute right-0 bottom-0 h-6 w-6 border-r-4 border-b-4"></div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-sm text-gray-600">
                將QR碼或條碼對準掃描框內
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AddMaterial;
