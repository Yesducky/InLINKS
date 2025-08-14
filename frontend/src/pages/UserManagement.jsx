import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../componenets/Header.jsx";
import {
  Add,
  Edit,
  Save,
  Cancel,
  CheckCircle,
  Error as ErrorIcon,
  Person,
  Block,
  Check,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import LoadingSpinner from "../componenets/LoadingSpinner.jsx";
import api from "../services/api.js"; // Adjust the import path as needed
import { backgroundVariants } from "../utils/styles.js";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hideDisabledUsers, setHideDisabledUsers] = useState(true);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    user_type_id: "",
    is_active: true,
  });

  const [editUser, setEditUser] = useState({
    id: "",
    username: "",
    email: "",
    user_type_id: "",
    is_active: true,
    project_ids: "",
    work_order_ids: "",
    task_ids: "",
  });

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

  // Fetch users and user types on component mount
  useEffect(() => {
    fetchUsers().then((r) => console.log(r));
    fetchUserTypes().then((r) => console.log(r));
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers();

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched Users:", data);
        setUsers(data || []);
      } else {
        setMessage({ type: "error", text: "無法載入用戶列表" });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserTypes = async () => {
    try {
      const response = await api.getUserTypes();

      if (response.ok) {
        const data = await response.json();
        setUserTypes(data || []);
        console.log("User Types:", userTypes);
      } else {
        setMessage({ type: "error", text: "無法載入用戶類型" });
      }
    } catch (error) {
      console.error("Error fetching user types:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    }
  };

  // Helper function to close form with animation
  const closeFormWithAnimation = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowCreateForm(false);
      setIsFormExiting(false);
      setNewUser({
        username: "",
        password: "",
        email: "",
        user_type_id: "",
        is_active: true,
      });
    }, 300); // Match animation duration
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      const response = await api.register(newUser);

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "用戶創建成功！" });
        // Use animated close function on success
        closeFormWithAnimation();
        await fetchUsers(); // Refresh user list
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      } else {
        setMessage({ type: "error", text: data.message || "創建失敗" });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    }
  };

  const handleUpdateUserStatus = async (userId, isActive) => {
    try {
      const response = await api.putUsers(userId, { is_active: isActive });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `用戶狀態已${isActive ? "啟用" : "停用"}`,
        });
        await fetchUsers(); // Refresh user list
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      } else {
        setMessage({ type: "error", text: data.message || "更新失敗" });
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear message when user types
    if (message.text) setMessage({ type: "", text: "" });
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear message when user types
    if (message.text) setMessage({ type: "", text: "" });
  };

  const handleEditUser = (user) => {
    setEditUser({
      id: user.id,
      username: user.username,
      email: user.email || "",
      user_type_id: user.user_type_id || "",
      is_active: user.is_active,
      project_ids: user.project_ids || "",
      work_order_ids: user.work_order_ids || "",
      task_ids: user.task_ids || "",
    });
    setEditingUser(user.id);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    try {
      //TODO: check username unique and can update username
      const body = {
        username: editUser.username,
        email: editUser.email,
        user_type_id: editUser.user_type_id,
        is_active: editUser.is_active,
        project_ids: editUser.project_ids,
        work_order_ids: editUser.work_order_ids,
        task_ids: editUser.task_ids,
      };
      console.log(body);
      const response = await api.putUsers(editUser.id, body);

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "用戶更新成功！" });
        setEditingUser(null);
        await fetchUsers(); // Refresh user list
        //only show for 5s
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      } else {
        setMessage({ type: "error", text: data.message || "更新失敗" });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage({ type: "error", text: "網絡錯誤，請重試" });
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditUser({
      id: "",
      username: "",
      email: "",
      user_type_id: "",
      is_active: true,
      project_ids: "",
      work_order_ids: "",
      task_ids: "",
    });
  };

  const getStatusDisplay = (isActive) => {
    return isActive ? "啟用" : "停用";
  };

  // Validate new user form
  const isNewUserValid = () => {
    return (
      newUser.username.trim() !== "" &&
      newUser.password.trim() !== "" &&
      newUser.user_type_id !== ""
    );
  };

  return (
    <motion.div
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
      // initial="initial"
      // animate="in"
      // exit="out"
      // variants={pageVariants}
      // transition={pageTransition}
      style={backgroundVariants.user_management}
    >
      <Header title={"用戶管理"} />

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white text-shadow-black text-shadow-md">
                用戶管理
              </h1>
              <p className="text-white text-shadow-black text-shadow-md">
                管理系統用戶和權限
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue hover:bg-lightblue flex items-center gap-2 rounded-xl px-4 py-2 text-white transition-colors duration-200"
            >
              <Add className="h-5 w-5" />
              新增用戶
            </button>
          </div>

          {/* Message Display */}
          {message.text && (
            <div
              className={`mb-6 rounded-xl border p-4 ${
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

          {/* Create User Form */}
          {showCreateForm && (
            <motion.div
              className="glassmorphism mb-8 overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={
                isFormExiting
                  ? { opacity: 0, height: 0, y: -20 }
                  : { opacity: 1, height: "auto", y: 0 }
              }
              transition={{
                duration: 0.3,
                ease: "easeInOut",
                height: { duration: 0.4 },
              }}
            >
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  新增用戶
                </h3>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Username */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      用戶名 *
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="輸入用戶名"
                      value={newUser.username}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      電子郵件
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="輸入電子郵件"
                      value={newUser.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      密碼 *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        placeholder="輸入密碼"
                        value={newUser.password}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <VisibilityOff className="h-5 w-5" />
                        ) : (
                          <Visibility className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* User Type */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      用戶類型 *
                    </label>
                    <select
                      name="user_type_id"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      value={newUser.user_type_id}
                      onChange={handleInputChange}
                    >
                      <option value="">選擇用戶類型</option>
                      {userTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={newUser.is_active}
                    onChange={handleInputChange}
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 text-sm text-gray-700"
                  >
                    啟用用戶
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={closeFormWithAnimation}
                    className="flex items-center gap-2 rounded-xl bg-gray-400 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-500"
                  >
                    <Cancel className="h-4 w-4" />
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!isNewUserValid()}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-white transition-colors duration-200 ${
                      isNewUserValid()
                        ? "bg-blue hover:bg-lightblue"
                        : "cursor-not-allowed bg-gray-400"
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    創建用戶
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Users List */}
          <div className="glassmorphism overflow-scroll rounded-2xl border border-gray-100 shadow-lg">
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  用戶列表
                </h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hideDisabledUsers"
                    className="text-blue focus:ring-lightblue h-4 w-4 rounded border-gray-300"
                    checked={hideDisabledUsers}
                    onChange={(e) => setHideDisabledUsers(e.target.checked)}
                  />
                  <label
                    htmlFor="hideDisabledUsers"
                    className="ml-2 text-sm text-gray-700"
                  >
                    隱藏停用用戶
                  </label>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <LoadingSpinner variant="circular" size={30} message="載入中" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <Person className="text-gray mx-auto h-12 w-12" />
                <p className="mt-2 text-gray-500">暫無用戶資料</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="h-fit border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        用戶名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        電子郵件
                      </th>
                      <th className="min-w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        用戶類型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        創建時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users
                      .filter((user) => !hideDisabledUsers || user.is_active)
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-lightblue flex h-8 w-8 items-center justify-center rounded-full">
                                <Person className="h-4 w-4 text-white" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {user.email || "未設置"}
                          </td>
                          <td className="w-32 px-6 py-4 whitespace-nowrap">
                            {
                              userTypes.find(
                                (type) => type.id === user.user_type_id,
                              )?.type
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                user.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {getStatusDisplay(user.is_active)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                            {new Date(user?.created_at).toLocaleDateString(
                              "zh-TW",
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateUserStatus(
                                    user.id,
                                    !user.is_active,
                                  )
                                }
                                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                                  user.is_active
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {user.is_active ? (
                                  <>
                                    <Block className="h-3 w-3" />
                                    停用
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" />
                                    啟用
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="flex items-center gap-1 rounded-lg bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 transition-colors duration-200 hover:bg-yellow-200"
                              >
                                <Edit className="h-3 w-3" />
                                編輯
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <motion.div
              className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="glassmorphism relative mx-10 max-h-[70vh] w-full max-w-4xl overflow-y-auto rounded-2xl shadow-2xl">
                <motion.div
                  className="glassmorphism rounded-2xl shadow-2xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">
                        編輯用戶
                      </h3>
                      <button
                        onClick={cancelEdit}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition-colors duration-200 hover:bg-gray-300"
                      >
                        <Cancel className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateUser} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Username */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          用戶名 *
                        </label>
                        <input
                          type="text"
                          name="username"
                          required
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="輸入用戶名"
                          value={editUser.username}
                          onChange={handleEditInputChange}
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          電子郵件
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="輸入電子郵件"
                          value={editUser.email}
                          onChange={handleEditInputChange}
                        />
                      </div>

                      {/* User Type */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          用戶類型 *
                        </label>
                        <select
                          name="user_type_id"
                          required
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          value={editUser.user_type_id}
                          onChange={handleEditInputChange}
                        >
                          <option value="">選擇用戶類型</option>
                          {userTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Project IDs */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          項目 IDs
                        </label>
                        <input
                          type="text"
                          name="project_ids"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="輸入項目 IDs (用逗號分隔)"
                          value={editUser.project_ids}
                          onChange={handleEditInputChange}
                        />
                      </div>

                      {/* Work Order IDs */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          工作單 IDs
                        </label>
                        <input
                          type="text"
                          name="work_order_ids"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="輸入工作單 IDs (用逗號分隔)"
                          value={editUser.work_order_ids}
                          onChange={handleEditInputChange}
                        />
                      </div>

                      {/* Task IDs */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          任務 IDs
                        </label>
                        <input
                          type="text"
                          name="task_ids"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          placeholder="輸入任務 IDs (用逗號分隔)"
                          value={editUser.task_ids}
                          onChange={handleEditInputChange}
                        />
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_active"
                        id="edit_is_active"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={editUser.is_active}
                        onChange={handleEditInputChange}
                      />
                      <label
                        htmlFor="edit_is_active"
                        className="ml-2 text-sm text-gray-700"
                      >
                        啟用用戶
                      </label>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-2 rounded-xl bg-gray-400 px-4 py-2 text-white transition-colors duration-200 hover:bg-gray-500"
                      >
                        <Cancel className="h-4 w-4" />
                        取消
                      </button>
                      <button
                        type="submit"
                        className="bg-blue hover:bg-lightblue flex items-center gap-2 rounded-xl px-4 py-2 text-white transition-colors duration-200"
                      >
                        <Save className="h-4 w-4" />
                        更新用戶
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UserManagement;
