// API calls for the visit scheduler
import type { WorkType } from "./scheduler.state";

export const api = {
  async fetchWorkTypes(): Promise<WorkType[]> {
    const response = await fetch("/api/work-types");
    if (!response.ok) throw new Error("Failed to fetch work types");
    return response.json();
  },

  async fetchSlots(date: string, workTypeId: number): Promise<string[]> {
    const response = await fetch(
      `/api/slots?date=${date}&workTypeId=${workTypeId}`,
    );
    if (!response.ok) throw new Error("Failed to fetch slots");
    return response.json();
  },

  async createVisit(data: {
    nombre: string;
    telefono: string;
    mensaje: string;
    date: string;
    time: string;
    workTypeId: number;
  }): Promise<void> {
    const response = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create visit");
    }
  },
};
