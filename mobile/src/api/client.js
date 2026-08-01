import axios from "axios";

// Shared axios instance. Base URL + auth token are set by AuthContext.
const client = axios.create({
  timeout: 20000,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

export function configureClient({ serverUrl, apiKey, apiSecret }) {
  if (serverUrl) client.defaults.baseURL = serverUrl.replace(/\/+$/, "");
  if (apiKey && apiSecret) {
    client.defaults.headers.common.Authorization = `token ${apiKey}:${apiSecret}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }
}

// Frappe wraps whitelisted return values in { message: ... }.
function unwrap(response) {
  return response.data && "message" in response.data ? response.data.message : response.data;
}

export function extractError(err) {
  const data = err.response && err.response.data;
  if (data) {
    if (data._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages);
        if (msgs.length) {
          const parsed = JSON.parse(msgs[0]);
          return parsed.message || parsed;
        }
      } catch (_) {
        /* fall through */
      }
    }
    if (data.exception) return String(data.exception).replace(/^.*?:\s*/, "");
    if (data.message) return data.message;
  }
  if (err.message === "Network Error") {
    return "Cannot reach the server. Check your connection and the server URL.";
  }
  return err.message || "Something went wrong.";
}

const M = "/api/method/bp_staff_portal.api";

function form(params) {
  const body = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // Objects/arrays go over the wire as JSON (the API parses them server-side).
    body.append(k, typeof v === "object" ? JSON.stringify(v) : v);
  });
  return body.toString();
}

export const api = {
  login: (serverUrl, usr, pwd) =>
    axios
      .post(`${serverUrl.replace(/\/+$/, "")}${M}.app_login`, form({ usr, pwd }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      })
      .then(unwrap),

  getProfile: () => client.get(`${M}.get_profile`).then(unwrap),
  getHome: () => client.get(`${M}.get_home`).then(unwrap),

  // Validate & serve
  findOrder: (otp) => client.get(`${M}.find_order_by_otp`, { params: { otp } }).then(unwrap),
  serveOrder: (otp) => client.post(`${M}.serve_order`, form({ otp })).then(unwrap),

  // Shift
  getPumps: () => client.get(`${M}.get_pumps`).then(unwrap),
  getShift: () => client.get(`${M}.get_shift`).then(unwrap),
  startShift: (readings) => client.post(`${M}.start_shift`, form({ readings })).then(unwrap),
  endShift: (payload) => client.post(`${M}.end_shift`, form(payload)).then(unwrap),

  // Stock
  getStock: (date) => client.get(`${M}.get_physical_stock`, { params: { date } }).then(unwrap),
  submitStockTake: (payload) =>
    client.post(`${M}.submit_stock_take`, form(payload)).then(unwrap),

  // Cashup
  getCashup: (date) => client.get(`${M}.get_cashup`, { params: { date } }).then(unwrap),
  submitCashup: (payload) => client.post(`${M}.submit_cashup`, form(payload)).then(unwrap),

  // HR
  getLeaveTypes: () => client.get(`${M}.get_leave_types`).then(unwrap),
  getAttendance: () => client.get(`${M}.get_attendance`).then(unwrap),
  getLeaveRequests: () => client.get(`${M}.get_leave_requests`).then(unwrap),
  createLeaveRequest: (payload) =>
    client.post(`${M}.create_leave_request`, form(payload)).then(unwrap),
  createAbsenceReport: (payload) =>
    client.post(`${M}.create_absence_report`, form(payload)).then(unwrap),
};

export default client;
