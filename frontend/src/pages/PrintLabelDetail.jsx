import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Close, Download } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

const PrintLabelDetail = ({ item, taskId, onClose, onPrintSuccess }) => {
  const [printing, setPrinting] = useState(false);
  const [barcodeData, setBarcodeData] = useState("");

  useEffect(() => {
    // Generate barcode data
    const s = `${taskId.replace(/\D/g, "")}-${item.id.replace(/\D/g, "")}`;
    const validBarcode = item.label || s;
    // Ensure barcode data is valid for CODE128 - must be non-empty and contain valid characters
    setBarcodeData(validBarcode || "000000");
  }, [item, taskId]);

  const generatePDF = async () => {
    setPrinting(true);
    try {
      const token = localStorage.getItem("token");

      // Send POST request to backend with task_id
      const response = await fetch(`/api/items/${item.id}/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
        }),
      });

      if (response.ok) {
        // Get the PDF blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.id}-label.pdf`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);

        onPrintSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || "打印失敗");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("PDF生成時發生錯誤");
    } finally {
      setPrinting(false);
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.2,
      },
    },
  };

  if (!item) return null;

  const qrValue = barcodeData || `${taskId}-${item.id}`;

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
        className="relative h-fit w-fit min-w-[80%] overflow-hidden rounded-2xl bg-white shadow-2xl"
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
        <div className="flex h-full flex-col p-6">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              {/* Item Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">物品編號</span>
                  <p className="font-medium">{item.id}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">材料類型</span>
                  <p className="font-medium">{item.material_type_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">數量</span>
                  <p className="font-medium">
                    {item.quantity} {item.material_unit}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">標籤</span>
                  <p className="font-medium">{barcodeData}</p>
                </div>
              </div>

              {/* QR Code and Barcode */}
              <div className="flex flex-col items-center space-y-6">
                <div className="text-center">
                  <p className="mb-2 text-sm font-medium text-gray-500">
                    QR Code
                  </p>
                  <div className="flex justify-center">
                    <QRCodeSVG value={qrValue} size={120} />
                  </div>
                </div>

                <div className="text-center">
                  <p className="mb-2 text-sm font-medium text-gray-500">
                    條形碼
                  </p>
                  <div className="flex justify-center">
                    <Barcode
                      value={barcodeData}
                      width={1.5}
                      height={60}
                      fontSize={12}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div className="border-t pt-4">
            <button
              onClick={generatePDF}
              disabled={printing}
              className="bg-blue w-full rounded-lg px-4 py-3 font-medium text-white shadow-md transition-all duration-300 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {printing ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  生成PDF中...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Download className="mr-2 h-5 w-5" />
                  下載PDF標籤
                </div>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PrintLabelDetail;
