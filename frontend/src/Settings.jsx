import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "./componenets/Header.jsx";
import BackButton from "./componenets/BackButton.jsx";
import { Person, ExitToApp } from "@mui/icons-material";

const Settings = ({ onLogout }) => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("");
  const [isLoadingUserType, setIsLoadingUserType] = useState(true);

  // Get user data from localStorage
  const getUserData = () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  };

  const user = getUserData();

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 0, scale: 0.95 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -50, scale: 0.95 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  // Fetch user type from API
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user?.user_type_id) {
        setIsLoadingUserType(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `/api/user_types/bg_user_type_id/${user.user_type_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setUserType(data.type || "用戶");
        } else {
          setUserType("無法獲取");
        }
      } catch (error) {
        console.error("Error fetching user type:", error);
        setUserType("載入失敗");
      } finally {
        setIsLoadingUserType(false);
      }
    };

    fetchUserType();
  }, [user?.user_type_id]);

  const handleLogout = () => {
    // Use the logout handler passed from App.jsx
    onLogout();

    // Navigate to login page
    navigate("/login");
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
      <Header title={"個人設置"} />

      <div className="px-6 py-8">
        {/* User Info Section */}
        <div className="mx-auto max-w-md">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
            {/* User Avatar Section */}
            <div className="bg-blue px-6 py-8 text-center text-white">
              <div className="mb-4 flex justify-center">
                <div className="bg-opacity-20 rounded-full bg-white p-2">
                  <Person className="text-blue" sx={{ fontSize: 60 }} />
                </div>
              </div>
              <h2 className="text-xl font-bold">{user?.username || "用戶"}</h2>
              <p className="mt-1 text-blue-100">
                {isLoadingUserType ? "載入中..." : userType}
              </p>
            </div>

            {/* User Details */}
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-gray-100 py-3">
                <span className="text-gray-600">用戶ID</span>
                <span className="font-medium text-gray-800">
                  {user?.id || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 py-3">
                <span className="text-gray-600">用戶名稱</span>
                <span className="font-medium text-gray-800">
                  {user?.username || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600">用戶類別</span>
                <span className="font-medium text-gray-800">
                  {isLoadingUserType ? "載入中..." : userType || "N/A"}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <div className="bg-gray-50 p-6">
              <button
                onClick={handleLogout}
                className="bg-lightblue flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-red-600"
              >
                <ExitToApp className="h-5 w-5" />
                登出系統
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button Component */}
      <BackButton to="/dashboard" />
    </motion.div>
  );
};

export default Settings;
