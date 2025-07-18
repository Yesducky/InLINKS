import React from "react";
import { motion } from "framer-motion";
import { ErrorOutline, Refresh } from "@mui/icons-material";

const FetchDataFail = ({
  error = "載入資料失敗",
  onRetry = null,
  showRetryButton = true,
  className = "",
}) => {
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

  //if error is 422, jump to login page
  if (error === 422 || error === 401) {
    window.location.href = "/login";
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null; // Prevent rendering while redirecting
  }

  return (
    <motion.div
      className={`flex flex-col items-stretch p-8 ${className} `}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <motion.div
        className="mb-4 flex h-16 w-16 items-center justify-center self-center rounded-full bg-red-100"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <ErrorOutline className="text-red-600" sx={{ fontSize: 40 }} />
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          資料載入失敗
        </h3>
        <p className={`text-normal mb-20 text-gray-600`}>Error code: {error}</p>
        <br />

        {showRetryButton && onRetry && (
          <motion.button
            onClick={onRetry}
            className="bg-lightblue hover:bg-blue bottom-0 cursor-pointer self-end rounded-xl px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Refresh className="h-5 w-5" />
            重新載入
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default FetchDataFail;
