import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Header from "../componenets/Header.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  Close,
  Camera,
  Error as CameraOff,
  QrCodeScanner,
} from "@mui/icons-material";

const Scan = () => {
  const [scannedData, setScannedData] = useState("");
  const [taskData, setTaskData] = useState(null);
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4,
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setCameraError("");
      setScanning(true);
      setScannedData("");
      setTaskData(null);
      setItemData(null);

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      // Get camera devices using navigator.mediaDevices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      if (videoInputDevices.length === 0) {
        throw new Error("No camera found");
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDeviceId },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play();
      }

      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanResult(result.getText());
          }
          if (error && error.name !== "NotFoundException") {
            console.error(error);
          }
        },
      );
    } catch (error) {
      console.error("Error starting camera:", error);
      setCameraError(error.message || "無法啟動相機");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanning(false);
  };

  const handleScanResult = async (data) => {
    if (data && data !== scannedData) {
      setScannedData(data);
      stopScanning();
      await parseAndFetchData(data);
    }
  };

  const parseAndFetchData = async (data) => {
    try {
      setLoading(true);
      setError("");

      // Parse data format: "task-id-item-id"
      const parts = data.split("-");
      if (parts.length < 2) {
        throw new Error("無效的掃描格式");
      }

      const taskId = "TSK" + parts[0];
      const itemId = "ITM" + parts[1];

      const token = localStorage.getItem("token");

      // Fetch task data
      const taskResponse = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (taskResponse.ok) {
        const taskResult = await taskResponse.json();
        setTaskData(taskResult);
      } else {
        throw new Error(`任務 ${taskId} 不存在`);
      }

      // Fetch item data
      const itemResponse = await fetch(`/api/items/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (itemResponse.ok) {
        const itemResult = await itemResponse.json();
        console.log(itemResult);
        setItemData(itemResult);
      } else {
        throw new Error(`物品 ${itemId} 不存在`);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message || "獲取數據失敗");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("zh-hk", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const resetScan = () => {
    setScannedData("");
    setTaskData(null);
    setItemData(null);
    setError("");
  };

  return (
    <motion.div
      className="min-h-screen w-full bg-gray-100"
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Header title="掃描驗證" />

      <div className="p-4">
        {/* Camera Section */}
        <motion.div
          className="mb-4 rounded-lg bg-white p-4 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">掃描器</h2>
            {scanning && (
              <button
                onClick={stopScanning}
                className="flex items-center space-x-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                <CameraOff className="h-4 w-4" />
                <span>停止掃描</span>
              </button>
            )}
          </div>

          {cameraError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-center">
              <p className="text-sm text-red-700">{cameraError}</p>
            </div>
          )}

          {!scanning && !scannedData && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <QrCodeScanner className="h-16 w-16 text-gray-400" />
              <p className="text-sm text-gray-500">
                點擊下方按鈕開始掃描 QR/條碼
              </p>
              <button
                onClick={startScanning}
                className="bg-blue flex items-center space-x-2 rounded-lg px-4 py-2 font-medium text-white hover:bg-blue-600"
              >
                <Camera className="h-5 w-5" />
                <span>開始掃描</span>
              </button>
            </div>
          )}

          {scanning && (
            <div className="relative">
              <video
                ref={videoRef}
                className="h-64 w-full rounded-lg bg-black object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-32 w-32 rounded-lg border-2 border-white/50"></div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Scan Results */}
        {scannedData && (
          <motion.div
            className="space-y-4"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Scanned Data */}
            <div className="rounded-lg bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">掃描結果</h3>
                <button
                  onClick={resetScan}
                  className="flex items-center space-x-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Close className="h-4 w-4" />
                  <span>重新掃描</span>
                </button>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-mono text-sm text-gray-700">{scannedData}</p>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="rounded-lg bg-white p-8 text-center shadow-lg">
                <LoadingSpinner
                  variant="circular"
                  size={30}
                  message="載入數據中..."
                />
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="rounded-lg bg-red-50 p-6 text-center shadow-lg">
                <FetchDataFail
                  error={error}
                  onRetry={() => parseAndFetchData(scannedData)}
                />
              </div>
            )}

            {/* Task Data */}
            {taskData && !loading && !error && (
              <motion.div
                className="rounded-lg bg-white p-4 shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  任務信息
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">任務名稱</span>
                    <p className="font-medium">{taskData.task_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">任務編號</span>
                    <p className="font-mono text-sm">{taskData.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">狀態</span>
                    <p className="font-medium">{taskData.state?.state_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">開始日期</span>
                    <p className="font-medium">
                      {formatDate(taskData.start_date)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">截止日期</span>
                    <p className="font-medium">
                      {formatDate(taskData.due_date)}
                    </p>
                  </div>
                  {taskData.description && (
                    <div>
                      <span className="text-sm text-gray-500">描述</span>
                      <p className="text-sm text-gray-700">
                        {taskData.description}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Item Data */}
            {itemData && !loading && !error && (
              <motion.div
                className="rounded-lg bg-white p-4 shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  物品信息
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-500">物品編號</span>
                    <p className="font-mono text-sm">{itemData.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">材料類型</span>
                    <p className="font-medium">{itemData.material_type_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">數量</span>
                    <p className="font-medium">
                      {itemData.quantity} {itemData.material_type_unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">打印次數</span>
                    <p className="font-medium">
                      {itemData.label_count || 0} 次
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">狀態</span>
                    <p className="font-medium">
                      {itemData.status === "available"
                        ? "可用"
                        : itemData.status === "assigned"
                          ? "已分配"
                          : itemData.status === "used"
                            ? "已使用"
                            : itemData.status}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Scan;
