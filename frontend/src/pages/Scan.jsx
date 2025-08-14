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
  Timeline as BlockchainIcon,
} from "@mui/icons-material";
import api from "../services/api.js";
import BlockchainViewer from "../componenets/BlockchainViewer.jsx";
import { AnimatePresence } from "framer-motion";
import { backgroundVariants } from "../utils/styles.js";

const Scan = () => {
  const [scannedData, setScannedData] = useState("");
  const [debugInput, setDebugInput] = useState(""); // Add debug input state
  const [taskData, setTaskData] = useState(null);
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [showBlockchain, setShowBlockchain] = useState(false);
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
      console.log("Available devices:", devices);
      const videoInputDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      let selectedDeviceId;
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

      // Check if data contains hyphen to determine the mode
      const hasHyphen = data.includes("-");

      if (hasHyphen) {
        // Parse data format: "task-id-item-id"
        const parts = data.split("-");
        if (parts.length < 2) {
          throw new Error("無效的掃描格式");
        }

        const taskId = "TSK" + parts[0];
        const itemId = "ITM" + parts[1];

        // Fetch task data
        try {
          const taskResponse = await api.getTask(taskId);
          if (taskResponse.ok) {
            const taskResult = await taskResponse.json();
            setTaskData(taskResult);
          } else {
            // Set a special error state for task not found but continue processing
            setTaskData({ notFound: true, id: taskId });
          }
        } catch (taskError) {
          console.error("Task fetch error:", taskError);
          setTaskData({ notFound: true, id: taskId });
        }

        // Fetch item data (continue regardless of task result)
        const itemResponse = await api.getItem(itemId);

        if (itemResponse.ok) {
          const itemResult = await itemResponse.json();
          console.log(itemResult);
          setItemData(itemResult);
        } else {
          throw new Error(`物品 ${itemId} 不存在`);
        }
      } else {
        // No hyphen - only fetch item data, hide task
        const itemId = data.startsWith("ITM") ? data : "ITM" + data;

        // Clear task data to hide task-related UI
        setTaskData(null);

        // Fetch item data only
        const itemResponse = await api.getItem(itemId);

        if (itemResponse.ok) {
          const itemResult = await itemResponse.json();
          console.log(itemResult);
          setItemData(itemResult);
        } else {
          throw new Error(`物品 ${itemId} 不存在`);
        }
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
    setShowBlockchain(false);
  };

  const openBlockchainViewer = () => {
    if (itemData) {
      setShowBlockchain(true);
    }
  };

  const closeBlockchainViewer = () => {
    setShowBlockchain(false);
  };

  const handleDebugSubmit = async (e) => {
    e.preventDefault();
    if (debugInput.trim()) {
      setScannedData(debugInput.trim());
      await parseAndFetchData(debugInput.trim());
      setDebugInput("");
    }
  };

  return (
    <motion.div
      className="min-h-screen w-full bg-gray-100"
      // initial="initial"
      // animate="in"
      // exit="out"
      // variants={pageVariants}
      // transition={pageTransition}
      style={backgroundVariants.scan}
    >
      <Header title="掃描驗證" />

      <div className="h-full p-4">
        {/* Camera Section */}
        <motion.div
          className={`glassmorphism ${scannedData ? "hidden" : "visible"} mb-4 rounded-lg p-4 shadow-lg`}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {cameraError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-center">
              <p className="text-sm text-red-700">{cameraError}</p>
            </div>
          )}

          {!scanning && !scannedData && (
            <div className="flex h-150 w-full flex-col items-center justify-center space-y-4 py-8">
              <QrCodeScanner className="text-gray-400" sx={{ fontSize: 150 }} />{" "}
              <p className="text-sm text-gray-500">
                點擊下方按鈕開始掃描 QR/條碼
              </p>
              <button
                onClick={startScanning}
                className="bg-blue mb-0 flex items-center space-x-2 rounded-lg px-4 py-2 font-medium text-white hover:bg-blue-600"
              >
                <Camera className="h-5 w-5" />
                <span>開始掃描</span>
              </button>
            </div>
          )}

          {scanning && (
            <div className={`h-150 w-full`}>
              <div className="relative">
                <video
                  ref={videoRef}
                  className="aspect-square w-full rounded-lg bg-black object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-lg border-2 border-white/50"></div>
                </div>
              </div>
              <button
                onClick={stopScanning}
                className="mt-5 mr-0 mb-0 ml-auto flex items-center space-x-1 rounded-full bg-red-100 px-6 py-3 text-sm font-medium text-red-700 hover:bg-red-200"
              >
                <CameraOff className="h-4 w-4" />
                <span>停止掃描</span>
              </button>
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
            <div className="glassmorphism rounded-lg p-4 shadow-lg">
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
              <div className="glassmorphism rounded-lg p-8 text-center shadow-lg">
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
                className="glassmorphism rounded-lg p-4 shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  任務信息
                </h3>
                {taskData.notFound ? (
                  <div className="rounded-lg bg-yellow-50 p-4 text-center">
                    <p className="text-sm text-yellow-700">
                      沒有該任務 ({taskData.id})
                    </p>
                  </div>
                ) : (
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
                      <p className="font-medium">
                        {taskData.state?.state_name}
                      </p>
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
                )}
              </motion.div>
            )}

            {/* Item Data */}
            {itemData && !loading && !error && (
              <motion.div
                className="glassmorphism rounded-lg p-4 shadow-lg"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    物品信息
                  </h3>
                  <button
                    onClick={openBlockchainViewer}
                    className="flex items-center space-x-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-200"
                  >
                    <BlockchainIcon className="h-4 w-4" />
                    <span>區塊鏈</span>
                  </button>
                </div>
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

        {/* Blockchain Viewer Modal */}
        <AnimatePresence>
          {showBlockchain && itemData && (
            <BlockchainViewer
              itemId={itemData.id}
              open={showBlockchain}
              onClose={closeBlockchainViewer}
            />
          )}
        </AnimatePresence>

        {/* Debug Input Section */}
        <div className="glassmorphism mt-4 rounded-lg p-4 shadow-lg">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Debug</h3>
          <form onSubmit={handleDebugSubmit} className="flex space-x-2">
            <input
              type="text"
              value={debugInput}
              onChange={(e) => setDebugInput(e.target.value)}
              placeholder="手動輸入掃描數據"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              提交
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default Scan;
