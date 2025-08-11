import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../componenets/Header.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import {
  TaskIcon,
  InventoryIcon,
  AddMaterialIcon,
  QrCodeIcon,
  ProjectIcon,
  UserManagementIcon,
  SettingIcon,
} from "../componenets/CustomIcons.jsx";
import api from "../services/api.js";
import { backgroundVariants } from "../utils/styles.js";

const Dashboard = () => {
  const [cardMenus, setCardMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(0);
  const navigate = useNavigate();

  // Icon mapping object
  const iconMapping = {
    Inventory: InventoryIcon,
    Add: AddMaterialIcon,
    QrCodeScanner: QrCodeIcon,
    Assignment: ProjectIcon,
    People: UserManagementIcon,
    Task: TaskIcon,
  };

  // Get username from localStorage
  const getUsername = () => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.username || "用戶";
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return "用戶";
  };

  const username = getUsername();

  // Fetch card menus from API
  const fetchCardMenus = async () => {
    try {
      setIsLoading(true);
      setError(0); // Reset error state
      const response = await api.getCardMenus();

      if (response.ok) {
        const data = await response.json();
        // Sort by order_index
        const sortedMenus = data.sort((a, b) => a.order_index - b.order_index);
        setCardMenus(sortedMenus);
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError(err.message);
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCardMenus();
  }, []);

  const handleCardClick = (cardMenu) => {
    navigate(cardMenu.route_path);
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const renderIcon = (iconName, iconColor) => {
    const IconComponent = iconMapping[iconName];
    if (!IconComponent) {
      return <div className="h-12 w-12 rounded bg-gray-300" />; // Fallback
    }
    return <IconComponent className="h-12 w-12" style={{ color: iconColor }} />;
  };

  // Animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
  };

  const pageTransitionFadeIn = {
    type: "tween",
    ease: "easeInOut",
    duration: 1,
  };

  const pageTransitionFadeOut = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  };

  if (isLoading) {
    // Static background, animated spinner fades in
    return (
      <div
        className="h-screen w-full overflow-y-auto"
        style={backgroundVariants.dashboard}
      >
        <motion.div
          className="h-full w-full"
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransitionFadeIn}
        >
          <Header title={"工作台"} />
          {/*<div className="flex h-64 items-center justify-center">*/}
          {/*  <LoadingSpinner variant="circular" size={30} message="載入中" />*/}
          {/*</div>*/}
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="h-screen w-full overflow-y-auto"
        style={backgroundVariants.dashboard}
      >
        <motion.div
          className="h-full w-full"
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransitionFadeIn}
        >
          <Header title={"工作台"} />
          <FetchDataFail
            error={error}
            onRetry={fetchCardMenus}
            className="mx-4 mt-4"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={backgroundVariants.dashboard}>
      <motion.div
        className="h-full w-full overflow-y-auto"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransitionFadeOut}
      >
        <Header title={"工作台"} />
        <motion.div
          className="px-6 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
        >
          {/* welcome Section */}
          <motion.div
            className="mb-8 flex items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.2 }}
          >
            <div>
              <h1 className="mb-2 text-2xl font-bold text-white text-shadow-black text-shadow-md">
                歡迎回來，{username}
              </h1>
              <p className="text-white text-shadow-black text-shadow-md">
                選擇功能開始管理您的物料系統
              </p>
            </div>
            <motion.button
              onClick={handleSettingsClick}
              className="flex items-center justify-center rounded-xl border border-gray-100 bg-white/75 p-3 shadow-lg backdrop-blur-xs transition-all duration-200 hover:scale-105 hover:shadow-xl"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <SettingIcon className="text-blue h-6 w-6" />
            </motion.button>
          </motion.div>

          {/* Cards Grid */}
          <motion.div
            className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0, duration: 0.2 }}
          >
            {cardMenus.map((cardMenu, index) => (
              <motion.div
                key={cardMenu.id}
                onClick={() => handleCardClick(cardMenu)}
                className={` ${cardMenu.id === "CM004" ? "hidden" : ""} ${cardMenu.id === "CM005" ? "col-span-2" : "aspect-square"} group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white/75 p-8 shadow-lg backdrop-blur-xs transition-all duration-300 hover:shadow-2xl`}
                initial={{ opacity: 0, y: 25, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.2,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.1 },
                }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Background gradient overlay */}
                <div
                  className="absolute inset-0 opacity-5 transition-opacity duration-300 group-hover:opacity-10"
                  style={{
                    background: `linear-gradient(135deg, ${cardMenu.icon_color}20, ${cardMenu.icon_color}05)`,
                  }}
                />

                {/* Card content */}
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 transform transition-transform duration-300 group-hover:scale-110">
                    {renderIcon(cardMenu.icon_name, cardMenu.icon_color)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 transition-colors duration-200 group-hover:text-gray-900">
                    {cardMenu.title}
                  </h3>

                  {/* Subtle indicator dot */}
                  <div
                    className="mt-3 h-1.5 w-1.5 rounded-full opacity-60"
                    style={{ backgroundColor: cardMenu.icon_color }}
                  />
                </div>

                {/* Hover effect border */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ borderColor: `${cardMenu.icon_color}40` }}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
