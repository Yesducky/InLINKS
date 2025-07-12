import { useState } from "react";
import Header from "./componenets/Header.jsx";
import { Person, Lock } from "@mui/icons-material";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token
        localStorage.setItem("token", data.access_token);

        // Store complete user data including user_type_id for interface differentiation
        const userData = {
          id: data.user_id,
          username: data.username,
          user_type_id: data.user_type_id,
        };
        localStorage.setItem("user", JSON.stringify(userData));

        // Pass user data to parent component
        onLogin(userData);
      } else {
        setError(data.message || "登錄失敗");
      }
    } catch (err) {
      setError("網絡錯誤，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="from-blue to-lightblue flex min-h-screen items-center justify-center bg-gradient-to-b">
      {/*<Header title={"物料管理系統登錄"} />*/}

      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Section */}
            <div className="bg-lightblue px-8 py-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-opacity-20 rounded-full bg-white p-2">
                  <Person sx={{ fontSize: 60 }} />
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-white">歡迎登錄</h2>
              <p className="text-blue-100">物料管理系統</p>
            </div>

            {/* Form Section */}
            <div className="px-8 py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    用戶名稱
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Person className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="username"
                      type="text"
                      placeholder="請輸入用戶名稱"
                      required
                      className="focus:ring-blue w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:ring-2"
                      value={credentials.username}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    密碼
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      placeholder="請輸入密碼"
                      required
                      className="focus:ring-blue w-full rounded-xl border border-gray-300 py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:ring-2"
                      value={credentials.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2">
                    <p className="text-center text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="hover:from-lightblue hover:to-blue bg-blue w-full transform rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                      登錄中...
                    </div>
                  ) : (
                    "登錄系統"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-white opacity-80">
              ©2025 Leo Hong Jiaen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
