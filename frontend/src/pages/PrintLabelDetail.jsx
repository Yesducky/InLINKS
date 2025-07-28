import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Close, Print } from "@mui/icons-material";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

const PrintLabelDetail = ({ item, taskId, onClose, onPrintSuccess }) => {
  const [printing, setPrinting] = useState(false);
  const [barcodeData, setBarcodeData] = useState("");

  useEffect(() => {
    // Generate barcode data
    const s = `${taskId.replace(/\D/g, "")}-${item.id.replace(/\D/g, "")}`;
    setBarcodeData(item.label || s);
  }, [item, taskId]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/items/${item.id}/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert("打印成功！");
        onPrintSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "打印失敗");
      }
    } catch (error) {
      console.error("Error printing label:", error);
      alert("打印時發生錯誤");
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

  const qrValue = barcodeData;

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
                    <Barcode value={barcodeData} width={1.5} height={60} fontSize={12} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="border-t pt-4">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white shadow-md transition-all duration-300 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {printing ? (
                <div className="flex items-center justify-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  打印中...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Print className="mr-2 h-5 w-5" />
                  打印標籤
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
