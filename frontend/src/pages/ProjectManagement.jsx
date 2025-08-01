import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Header from "../componenets/Header.jsx";
import { Search, ViewList, ViewModule } from "@mui/icons-material";
import EditProjectModal from "../componenets/EditProjectModal.jsx";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import FetchDataFail from "../componenets/FetchDataFail.jsx";
import PermissionGate from "../componenets/PermissionGate";
import AddButton from "../componenets/AddButton.jsx";
import {
  ProjectIcon,
  ActiveIcon,
  PendingIcon,
  CompletedIcon,
} from "../componenets/CustomIcons.jsx";
import { iconMap } from "../componenets/CustomIcons.jsx";
import api from "../services/api.js";

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
  });

  // Animation variants
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  useEffect(() => {
    fetchProjects().then((r) => console.log(r));
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.getAllProjects();

      if (response.ok) {
        const projectsData = await response.json();

        // Ensure projectsData is always an array
        const projects = Array.isArray(projectsData) ? projectsData : [];
        setProjects(projects);

        // Calculate stats
        const totalProjects = projects.length;
        const activeProjects = projects.filter(
          (project) => project.state?.state_name === "active",
        ).length;
        const completedProjects = projects.filter(
          (project) => project.state?.state_name === "completed",
        ).length;
        const pendingProjects = projects.filter(
          (project) => project.state?.state_name === "pending",
        ).length;

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          pendingProjects,
        });
      } else {
        setError(response.status);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      // hour: "2-digit",
      // minute: "2-digit",
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "高"; // High
      case "medium":
        return "中"; // Medium
      case "low":
        return "低"; // Low
      default:
        return "未知"; // Unknown
    }
  };

  // Filter projects based on search term and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.person_in_charge?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (selectedStatus !== "all") {
      matchesStatus = project.state?.state_name === selectedStatus;
    }

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title="項目管理" />
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner variant="circular" size={30} message="載入中..." />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title="項目管理" />
        <FetchDataFail error={error} onRetry={fetchProjects} className="h-64" />
      </motion.div>
    );
  }

  return (
    <PermissionGate resource="project" action="read" header="項目管理">
      <motion.div
        className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Header title="項目管理" />

        <div className="px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Statistics Cards */}
            <motion.div
              className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {/* All Projects */}
              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "all" ? "ring-2 ring-orange-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                onClick={() => setSelectedStatus("all")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                    <ProjectIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">所有項目</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.totalProjects}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Active Projects */}
              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "active" ? "ring-2 ring-green-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                onClick={() => setSelectedStatus("active")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <ActiveIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">進行中</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.activeProjects}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Pending Projects */}
              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "pending" ? "ring-2 ring-yellow-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                onClick={() => setSelectedStatus("pending")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <PendingIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">待開始</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.pendingProjects}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Completed Projects */}
              <motion.div
                className={`cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl ${selectedStatus === "completed" ? "ring-2 ring-red-500" : ""}`}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                onClick={() => setSelectedStatus("completed")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <CompletedIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">已完成</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.completedProjects}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
              className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋項目、ID、名稱..."
                  className="w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  項目列表 ({filteredProjects.length})
                </h3>
                <button
                  onClick={() =>
                    setViewMode(viewMode === "list" ? "grid" : "list")
                  }
                  className="flex w-fit items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                >
                  {viewMode === "list" ? (
                    <ViewModule className="h-5 w-5" />
                  ) : (
                    <ViewList className="h-5 w-5" />
                  )}
                </button>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <ProjectIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    {searchTerm || selectedStatus !== "all"
                      ? "無符合的項目"
                      : "沒有任何項目可顯示"}
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          項目ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          名稱
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          描述
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          優先級
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          狀態
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          開始日期
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                          結束日期
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredProjects.map((project, index) => (
                        <motion.tr
                          key={project.id}
                          className="cursor-pointer hover:bg-gray-50"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                                <ProjectIcon className="h-4 w-4 text-orange-600" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {project.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                            {project.project_name}
                          </td>
                          <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                            {project.description || "無描述"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(
                                project.priority,
                              )}`}
                            >
                              {getPriorityText(project.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold`}
                              style={{
                                backgroundColor: project.state?.bg_color,
                                color: project.state?.text_color,
                              }}
                            >
                              {iconMap[project.state?.icon] &&
                                React.createElement(
                                  iconMap[project.state.icon],
                                  {
                                    className: "h-4 w-4",
                                  },
                                )}
                              &nbsp;
                              {project.state?.state_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(project.start_date)}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {formatDate(project.due_date)}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow duration-200 hover:shadow-md"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex w-full items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full">
                            <span
                              className={`inline-flex items-center rounded-full p-2 text-xs font-semibold`}
                              style={{
                                backgroundColor: project.state?.bg_color,
                                color: project.state?.text_color,
                              }}
                            >
                              {iconMap[project.state?.icon] &&
                                React.createElement(
                                  iconMap[project.state.icon],
                                  {
                                    className: "h-5 w-5",
                                  },
                                )}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {project.project_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              #{project.id}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="line-clamp-2 text-sm text-gray-600">
                          {project.description || "無描述"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(project.start_date)}
                          </div>
                          <div className="text-xs text-gray-500">開始日期</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(project.due_date)}
                          </div>
                          <div className="text-xs text-gray-500">結束日期</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(
                            project.priority,
                          )}`}
                        >
                          優先級: {getPriorityText(project.priority)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
      <EditProjectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        project={null}
        onSave={(new_id) => {
          //navigate to new proj
          navigate(`/project/${new_id}`);
        }}
      />
      <PermissionGate resource="project" action="create" show={false}>
        <AddButton action={() => setShowAddModal(true)} />
      </PermissionGate>
    </PermissionGate>
  );
};

export default ProjectManagement;
