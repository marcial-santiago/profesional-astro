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

export const SlotService = {
  /**
   * Get available time slots for a specific date and work type
   */
  async getAvailableSlots(options: SlotOptions): Promise<string[]> {
    const { date, workTypeId } = options;

    // Parse the date
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 1. Check if the date is blocked
    const blocked = await prisma.blockedDate.findUnique({
      where: { date: new Date(date) },
    });

    if (blocked) {
      return [];
    }

    // 2. Get availability for that day of week
    const availability = await prisma.availability.findMany({
      where: { dayOfWeek },
    });

    if (availability.length === 0) {
      return [];
    }

    // 3. Get work type to know the duration
    const workType = await prisma.workType.findUnique({
      where: { id: workTypeId },
    });

    const slotDuration = workType?.duration || DEFAULT_SLOT_DURATION;

    // 4. Get ALL existing visits for that day (regardless of work type)
    // IMPORTANT: We block time slots occupied by ANY service to prevent double-booking
    // Important: Parse the date string correctly to avoid timezone issues
    const [year, month, day] = date.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    console.log(`[SlotService] Querying visits between:`, {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    });

    const existingVisits = await prisma.visit.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: "CANCELLED" },
      },
      select: {
        date: true,
        workType: {
          select: {
            duration: true,
          },
        },
      },
    });

    // 5. Generate slots based on availability
    const slots: string[] = [];

    console.log(
      `[SlotService] Generating slots for ${date}, workTypeId: ${workTypeId}`,
    );
    console.log(
      `[SlotService] Found ${existingVisits.length} existing visits:`,
      existingVisits.map((v: { date: any; workType: { duration: any } }) => ({
        date: v.date,
        duration: v.workType.duration,
      })),
    );

    for (const avail of availability) {
      const [startHour, startMin] = avail.startTime.split(":").map(Number);
      const [endHour, endMin] = avail.endTime.split(":").map(Number);

      // Use the same date parsing method to avoid timezone issues
      let current = new Date(year, month - 1, day, startHour, startMin, 0, 0);
      const end = new Date(year, month - 1, day, endHour, endMin, 0, 0);

      while (current < end) {
        const timeStr = current.toTimeString().substring(0, 5);

        // Check if this slot conflicts with any existing visit
        const isOccupied = this.isSlotOccupied(
          current,
          slotDuration,
          existingVisits,
        );

        console.log(
          `[SlotService] Slot ${timeStr}: ${isOccupied ? "OCCUPIED" : "AVAILABLE"}`,
        );

        if (!isOccupied) {
          slots.push(timeStr);
        }

        // Move to next slot based on duration
        current.setMinutes(current.getMinutes() + slotDuration);
      }
    }

    console.log(
      `[SlotService] Returning ${slots.length} available slots:`,
      slots,
    );

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

      // Check if there's any overlap
      // Overlap occurs if: slotStart < visitEnd AND slotEnd > visitStart
      const hasOverlap = slotStart < visitEnd && slotEnd > visitStart;

      if (hasOverlap) {
        console.log(`[SlotService] OVERLAP DETECTED:`, {
          slot: { start: slotStart.toISOString(), end: slotEnd.toISOString() },
          visit: {
            start: visitStart.toISOString(),
            end: visitEnd.toISOString(),
          },
        });
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
