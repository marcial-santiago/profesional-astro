import { prisma } from "../lib/prisma";
import { DEFAULT_SLOT_DURATION } from "../constants";

export interface SlotOptions {
  date: string;
  workTypeId: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

// Fixed business hours — 8am to 6pm, every day
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 18;

export const SlotService = {
  /**
   * Get available time slots for a specific date and work type.
   * Business hours are fixed: 8:00 — 18:00.
   */
  async getAvailableSlots(options: SlotOptions): Promise<string[]> {
    const { date, workTypeId } = options;

    // 1. Check if the date is blocked
    const blocked = await prisma.blockedDate.findFirst({
      where: {
        date: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
      },
    });

    if (blocked) {
      return [];
    }

    // 2. Get work type to know the duration
    const workType = await prisma.workType.findUnique({
      where: { id: workTypeId },
    });

    const slotDuration = workType?.duration || DEFAULT_SLOT_DURATION;

    // 3. Get ALL existing visits for that day
    const [year, month, day] = date.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const existingVisits = await prisma.visit.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: "CANCELLED" },
      },
      select: {
        date: true,
        workType: { select: { duration: true } },
      },
    });

    // 4. Generate slots from fixed business hours
    const slots: string[] = [];

    let current = new Date(year, month - 1, day, BUSINESS_START_HOUR, 0, 0, 0);
    const end = new Date(year, month - 1, day, BUSINESS_END_HOUR, 0, 0, 0);

    while (current < end) {
      const timeStr = current.toTimeString().substring(0, 5);

      const isOccupied = this.isSlotOccupied(current, slotDuration, existingVisits);

      if (!isOccupied) {
        slots.push(timeStr);
      }

      current.setMinutes(current.getMinutes() + slotDuration);
    }

    return slots;
  },

  /**
   * Check if a time slot is occupied by existing visits
   */
  isSlotOccupied(
    slotStart: Date,
    slotDuration: number,
    existingVisits: Array<{
      date: Date;
      workType: { duration: number | null };
    }>,
  ): boolean {
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    for (const visit of existingVisits) {
      const visitStart = new Date(visit.date);
      const visitDuration = visit.workType.duration || DEFAULT_SLOT_DURATION;
      const visitEnd = new Date(visitStart);
      visitEnd.setMinutes(visitEnd.getMinutes() + visitDuration);

      // Overlap: slotStart < visitEnd AND slotEnd > visitStart
      if (slotStart < visitEnd && slotEnd > visitStart) {
        return true;
      }
    }

    return false;
  },

  /**
   * Check if a specific slot is available
   */
  async isSlotAvailable(
    date: string,
    time: string,
    workTypeId: number,
  ): Promise<boolean> {
    const availableSlots = await this.getAvailableSlots({ date, workTypeId });
    return availableSlots.includes(time);
  },
};
