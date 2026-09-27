import axios from "axios";

const API = axios.create({
  baseURL: `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
  }/api`,
});

API.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;