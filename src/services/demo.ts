/**
 * Demo controls. Resets the in-browser mock database to its seed state.
 * Has no effect on a real backend (http mode); the UI reloads after calling it.
 */
import { resetDb } from "./mock/db";

export function resetDemoData() {
  resetDb();
}
