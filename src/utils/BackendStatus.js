import axios from "axios";
import API_BASE_URL from "../config";

/**
 * Checks if backend is alive.
 * Returns:
 *   { online: true }  if backend responds "OK"
 *   { online: false } otherwise
 */
export async function checkBackendStatus(timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await axios.get(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 200 && res.data === "OK") {
      return { online: true };
    }
    return { online: false, error: "Unexpected response" };
  } catch (err) {
    clearTimeout(timeout);
    return { online: false, error: err.message };
  }
}
