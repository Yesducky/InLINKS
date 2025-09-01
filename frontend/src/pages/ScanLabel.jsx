import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Camera,
} from "@mui/icons-material";
import { BrowserMultiFormatReader } from "@zxing/library";
import api from "../services/api.js";

const ScanLabel = ({ taskId, onClose, onScanSuccess, scanType }) => {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [scannedText, setScannedText] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraPermission, setCameraPermission] = useState(null);

  useEffect(() => {
    checkCameraPermission();
    return () => stopScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Check if running in Capacitor
      if (window.Capacitor) {
        const { Camera } = await import("@capacitor/camera");
        const permission = await Camera.checkPermissions();
        if (permission.camera === "granted") {
          setCameraPermission(true);
          startScanning();
        } else {
          const requestResult = await Camera.requestPermissions();
          if (requestResult.camera === "granted") {
            setCameraPermission(true);
            startScanning();
          } else {
            setCameraPermission(false);
            setCameraError("需要相機權限才能掃描");
          }
        }
      } else {
        // Web environment
        setCameraPermission(true);
        startScanning();
      }
    } catch (error) {
      console.error("Permission check error:", error);
      setCameraPermission(true);
      startScanning();
    }
  };

  const parseItemId = (text) => {
    if (!text) return null;

    // Normalize spaces
    const t = String(text).trim();

    // Patterns:
    // 1) "TSK123-ITM456" or "123-456" or "TSK123-456" or "123-ITM456"
    // 2) "ITM456"
    // 3) "456" (numbers only)
    // Try hyphen-based first
    if (t.includes("-")) {
      const parts = t.split("-").map((p) => p.trim());
      // Look for an ITM-prefixed part
      const itmPart = parts.find((p) => /ITM\d+/i.test(p));
      if (itmPart) {
        const m = itmPart.match(/ITM(\d+)/i);
        if (m) return `ITM${m[1]}`;
      }
      // Otherwise take the last numeric group as item
      const last = parts[parts.length - 1];
      const num = last.match(/\d+/);
      if (num) return `ITM${num[0]}`;
    }

    // If contains ITM anywhere
    const itm = t.match(/ITM(\d+)/i);
    if (itm) return `ITM${itm[1]}`;

    // Fallback: digits-only
    const onlyDigits = t.match(/^(\d+)$/);
    if (onlyDigits) return `ITM${onlyDigits[1]}`;

    return null;
  };

  const startScanning = async () => {
    try {
      setCameraError("");
      setResult(null);
      setScannedText("");
      setVerifying(false);
      setScanning(true);

      // Create new reader instance for each scan session
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (e) {
          console.warn("Error resetting previous reader:", e);
        }
      }

      codeReaderRef.current = new BrowserMultiFormatReader();

      // Enhanced camera constraints for mobile/Capacitor
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      };

      try {
        streamRef.current =
          await navigator.mediaDevices.getUserMedia(constraints);
      } catch (primaryError) {
        console.warn("Primary camera access failed:", primaryError);
        // Fallback with simpler constraints
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch (fallbackError) {
          console.warn("Fallback camera access failed:", fallbackError);
          // Final fallback without facingMode
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          video.load();
        });

        await videoRef.current.play();

        // Start decoding with timeout and error handling
        const startDecoding = () => {
          return codeReaderRef.current.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            async (res, err) => {
              if (res && scanning) {
                const text = res.getText();
                handleScan(text);
              }
              if (err && err.name !== "NotFoundException") {
                console.error("Decode error:", err);
              }
            },
          );
        };

        // Add a small delay for mobile devices
        setTimeout(startDecoding, 100);
      }
    } catch (e) {
      console.error("Camera start error:", e);
      let errorMessage = "無法啟動相機";

      if (e.name === "NotAllowedError") {
        errorMessage = "相機權限被拒絕，請在設定中允許相機存取";
      } else if (e.name === "NotFoundError") {
        errorMessage = "找不到相機裝置";
      } else if (e.name === "NotReadableError") {
        errorMessage = "相機正被其他應用程式使用";
      } else if (e.message) {
        errorMessage = e.message;
      }

      setCameraError(errorMessage);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    setScanning(false);

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        console.warn("Error stopping reader:", e);
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn("Error stopping stream:", e);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn("Error clearing video source:", e);
      }
    }
  };

  const handleScan = async (text) => {
    if (!text || verifying) return;

    // Freeze scanner while verifying
    stopScanning();
    setScannedText(text);

    const itemId = parseItemId(text);
    setScannedText(itemId);

    if (!itemId) {
      setResult({ success: false, message: "無法識別的條碼/二維碼" });
      return;
    }

    try {
      setVerifying(true);
      const resp = await api.scanItemVerify(itemId, taskId, scanType);
      if (resp.ok) {
        // try to read message/json if any
        const data = await resp.json();
        console.log(data);
        if (data.is_verified) {
          // If the response indicates verification is successful
          if (data.is_verified) {
            setResult({ success: true, message: "驗證成功" });
            onScanSuccess();
          }
        } else {
          if (data.error === "Item has not been printed yet") {
            setResult({ success: false, message: "該物品尚未打印" });
          } else if (data.error === "Item is not assigned to this task") {
            setResult({ success: false, message: "該物品不屬於此任務" });
          } else {
            setResult({ success: false, message: data.error || "驗證失敗" });
          }
        }
      } else {
        let msg = `驗證失敗 (${resp.status})`;
        try {
          const data = await resp.json();
          if (data && (data.error || data.message)) {
            msg = data.error || data.message;
          }
        } catch (_) {}
        setResult({ success: false, message: msg });
      }
    } catch (e) {
      setResult({ success: false, message: e?.message || "驗證時發生錯誤" });
    } finally {
      setVerifying(false);
    }
  };

  const retry = () => {
    setResult(null);
    setScannedText("");
    setCameraError("");
    startScanning();
  };

  // Animations similar to PrintLabelDetail
  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", damping: 25, stiffness: 300 },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 transition-colors hover:bg-gray-100"
        >
          <Close className="h-5 w-5 text-gray-600" />
        </button>

        {/* Content */}
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">掃描查驗</h2>

            {/*{cameraError && (*/}
            {/*  <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">*/}
            {/*    {cameraError}*/}
            {/*  </div>*/}
            {/*)}*/}

            {/* Camera / Scanner */}
            {!result && (
              <div className={`h-full`}>
                {cameraError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
                    <ErrorIcon className="mr-1 inline-block h-4 w-4" />
                    {cameraError}
                  </div>
                )}

                <div className="relative">
                  <video
                    ref={videoRef}
                    className="aspect-square w-full rounded-lg bg-black object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-40 w-40 rounded-lg border-2 border-white/60" />
                  </div>

                  {verifying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="rounded-lg bg-white p-4 text-center">
                        <div className="mb-2 text-sm">驗證中...</div>
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {scanning
                      ? "正在掃描..."
                      : cameraError
                        ? "相機錯誤"
                        : "相機待命"}
                  </div>
                  <div className="space-x-2">
                    {!scanning || cameraError ? (
                      <button
                        onClick={cameraError ? retry : startScanning}
                        className="bg-blue rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        disabled={cameraPermission === false}
                      >
                        <Camera className="mr-1 inline-block h-4 w-4" />
                        {cameraError ? "重試" : "開始"}
                      </button>
                    ) : (
                      <button
                        onClick={stopScanning}
                        className="rounded-full bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        <Camera className="mr-1 inline-block h-4 w-4" /> 停止
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Verification Result */}
            {result && (
              <div
                className={`h-full rounded-lg ${result.success ? `bg-green-50` : `bg-red-50`} p-4`}
              >
                <div className="mb-2 flex items-center">
                  {result.success ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  ) : (
                    <ErrorIcon className="mr-2 h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {result.success ? "驗證成功" : "驗證失敗"}
                  </span>
                </div>
                <div
                  className={`${result.success ? `bg-green-100` : `bg-white`} rounded p-3 text-sm text-gray-700`}
                >
                  <div className="mb-1 text-gray-500">掃描內容</div>
                  <div className="font-mono">{scannedText || "-"}</div>
                </div>
                <p className="mt-2 text-sm text-gray-700">{result.message}</p>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={retry}
                    className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    再次掃描
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-blue rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    關閉
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScanLabel;
