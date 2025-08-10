const BASE_URL = import.meta.env.VITE_API_URL; // Change this to your backend URL if needed

// Helper to get Authorization headers
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Generic GET with optional auth
export async function get(endpoint, withAuth = false) {
  const headers = withAuth ? getAuthHeaders() : {};
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { ...headers },
  });
  if (!response.ok) {
    throw new Error(`GET ${endpoint} failed: ${response.status}`);
  }
  return response;
}

// Generic POST with optional auth
export async function post(endpoint, data, withAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(withAuth ? getAuthHeaders() : {}),
  };
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { ...headers },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    console.log(
      `POST ${BASE_URL}${endpoint} failed:`,
      response.status,
      response,
    );
    throw new Error(`POST ${endpoint} failed: ${response.status}`);
  }
  return response;
}

// Generic PUT with optional auth
export async function put(endpoint, data, withAuth = false) {
  const headers = {
    "Content-Type": "application/json",
    ...(withAuth ? getAuthHeaders() : {}),
  };
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: { ...headers },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    console.log(
      `PUT ${BASE_URL}${endpoint} failed:`,
      response.status,
      response,
    );
    throw new Error(`PUT ${endpoint} failed: ${response.status}`);
  }
  return response;
}

// Generic DELETE with optional auth
export async function del(endpoint, withAuth = false) {
  const headers = withAuth ? getAuthHeaders() : {};
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: { ...headers },
  });

  if (!response.ok) {
    console.log(
      `DELETE ${BASE_URL}${endpoint} failed:`,
      response.status,
      response,
    );
    throw new Error(`DELETE ${endpoint} failed: ${response.status}`);
  }
  return response;
}

const api = {
  get,
  post,

  //common
  login: (credentials) => post("/auth/login", credentials),
  register: (data) => post("/auth/register", data, true),
  getUserTypes: () => get("/api/user_types", true),
  getUserTypeById: (id) => get(`/api/user_types/bg_user_type_id/${id}`, true),
  getUsers: () => get("/api/users", true),
  putUsers: (userId, data) => put(`/api/users/${userId}`, data, true),

  //dashboard
  getCardMenus: () => get("/api/card-menus", true),

  //material types: cat 6 cables, etc
  getMaterialTypes: () => get("/api/material_types", true),
  getMaterialTypeQuantity: () => get(`/api/material_type_quantities`, true),

  //lots
  getLots: () => get("/api/lots", true),
  getLotsByMaterialTypeId: (id) => get(`/api/lots/material_type/${id}`, true),
  getLotsById: (id) => get(`/api/lots/${id}`, true),
  postAddLot: (data) => post("/api/add_lot", data, true), // addMaterial.jsx
  getLotsByProjectId: (id) => get(`/api/projects/${id}/lots`, true), //get all lots assigned to a project
  getUnassignedLots: () => get("/api/lots/unassigned", true), //get all lots not assigned to a project
  assignLotToProject: (lotId, projectId) =>
    put(`/api/lots/${lotId}/assign-to-project`, projectId, true), // assign a lot to a project
  removeLotFromProject: (lotId, projectId) =>
    put(`/api/lots/${lotId}/remove-from-project`, projectId, true), // remove a lot from a project

  //cartons
  getCarton: (cartonId) => get(`/api/cartons/${cartonId}`, true), //get a carton by id
  getCartonByLotId: (id) => get(`/api/cartons/lot/${id}`, true),
  getCartonItems: (cartonId) => get(`/api/cartons/${cartonId}/items`, true),

  //items
  getItem: (itemId) => get(`/api/items/${itemId}`, true), //get an item by id
  getAllItems: () => get("/api/items", true),
  putItem: (itemId, data) => put(`/api/items/${itemId}`, data, true),
  getItemsByTaskId: (taskId) => get(`/api/tasks/${taskId}/items`, true), //get all items by task id
  getAvailableItemsByTaskId: (taskId) =>
    get(`/api/tasks/${taskId}/items/available`, true),
  getAvailableItemsByTaskIdAndMaterialTypeId: (taskId, materialTypeId) =>
    get(
      `/api/tasks/${taskId}/items/available?material_type_id=${materialTypeId}`,
      true,
    ), //get all items by task id and material type id
  assignItemToTask: (taskId, assignments) =>
    post(`/api/tasks/${taskId}/items/assign`, { assignments }, true), // assign items to a task
  removeItemFromTask: (itemId, taskId) =>
    del(`/api/tasks/${taskId}/items/${itemId}/remove`, true), // remove an item from a task
  getItemsSummaryByTaskId: (taskId) =>
    get(`/api/tasks/${taskId}/items/summary`, true), // get items summary by task id

  //stock logs: keep track any modification of items/ cartons/ lots
  getStockLog: (params) => get(`/api/get_stock_logs?${params}`, true),

  //projects
  getProject: (id) => get(`/api/projects/${id}`, true), //get a project by id
  getAllProjects: () => get("/api/projects", true), //get all projects
  postProject: (data) => post("/api/projects", data, true), // create a new project
  putProject: (id, data) => put(`/api/projects/${id}`, data, true), // update a project by id

  //work orders
  getWorkOrderByProjectId: (id) => get(`/api/projects/${id}/work_orders`, true),
  getWorkOrder: (id) => get(`/api/work_orders/${id}`, true), //get a work order by id
  postWorkOrder: (data) => post("/api/work_orders", data, true), // create a new work order
  putWorkOrder: (id, data) => put(`/api/work_orders/${id}`, data, true), // update a work order by id

  //tasks
  getTasksByWorkOrderId: (id) => get(`/api/work_orders/${id}/tasks`, true), // get all tasks by work order id
  getTask: (id) => get(`/api/tasks/${id}`, true), //get a task by id
  postTask: (data) => post("/api/tasks", data, true), // create a new task
  putTask: (id, data) => put(`/api/tasks/${id}`, data, true), // update a task by id
  getTasksByUserId: (id) => get(`/api/tasks/by_user/${id}`, true), // get all tasks by user id
  startTask: (id) => post(`/api/tasks/${id}/start`, {}, true), // start a task by id

  //subtasks
  postSubtask: (data) => post("/api/subtasks", data, true), // create a new subtask
  putSubtask: (id, data) => put(`/api/subtasks/${id}`, data, true), // update a subtask by id
  getSubtasksByTaskId: (id) => get(`/api/tasks/${id}/sub_tasks`, true), // get all subtasks by task id
  getSubtask: (id) => get(`/api/subtasks/${id}`, true), //get a subtask by id

  //get process state types: e.g. "in progress", "completed"
  getProcessStateTypesByProcessType: (processType) =>
    get(`/api/process_state_types/by_type/${processType}`, true),

  //get process logs
  getProcessLogs: (type, id) =>
    get(`/api/get_process_logs/${type}/${id}`, true),

  //print labels
  printAllLabelsByTaskId: (taskId, showPrinted) =>
    post(`/api/tasks/${taskId}/print-all`, { show_printed: showPrinted }, true), // print all labels for a task
  printLabelByItemId: (itemId, taskId) =>
    post(`/api/items/${itemId}/print`, { task_id: taskId }, true),

  //blockchain
  getItemBlockchainHistory: (itemId) =>
    get(`/api/item/${itemId}/history`, true),
  getItemStateAtTransaction: (itemId, transactionId) =>
    get(`/api/item/${itemId}/state/transaction/${transactionId}`, true),
};

export default api;
