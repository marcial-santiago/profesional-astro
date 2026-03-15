import { prisma } from "../lib/prisma";
import { ERROR_MESSAGES, VISIT_STATUS, type VisitStatus } from "../constants";
import { ValidationService } from "./validation.service";

export interface CreateVisitData {
  nombre: string;
  telefono: string;
  email?: string;
  date: string;
  time: string;
  workTypeId: number;
  mensaje?: string;
}

export const VisitService = {
  /**
   * Create a new visit with atomic transaction to prevent race conditions
   */
  async createVisit(data: CreateVisitData) {
    const { nombre, telefono, email, date, time, workTypeId, mensaje } = data;

    // Validate that the datetime is in the future
    if (!ValidationService.isDateTimeInFuture(date, time)) {
      throw new Error(ERROR_MESSAGES.PAST_DATE);
    }

    // Combine date and time
    const visitDate = ValidationService.combineDateAndTime(date, time);

    // Verify work type exists
    const workType = await prisma.workType.findUnique({
      where: { id: workTypeId },
    });

    if (!workType || !workType.isActive) {
      throw new Error(ERROR_MESSAGES.WORK_TYPE_NOT_FOUND);
    }

    // Use transaction to prevent race conditions
    // This ensures that the check and insert happen atomically
    try {
      const visit = await prisma.$transaction(async (tx: any) => {
        // Check for overlapping visits — not just exact datetime match.
        // A new visit overlaps if: existing.start < new.end AND existing.end > new.start
        const newEnd = new Date(visitDate.getTime() + workType.duration * 60_000);

        const overlapping = await tx.visit.findFirst({
          where: {
            status: { not: VISIT_STATUS.CANCELLED },
            AND: [
              { date: { lt: newEnd } },
              {
                date: {
                  gte: new Date(visitDate.getTime() - workType.duration * 60_000),
                },
              },
            ],
          },
          include: { workType: { select: { duration: true } } },
        });

        // Re-check in application layer with actual durations
        if (overlapping) {
          const existingEnd = new Date(
            overlapping.date.getTime() + overlapping.workType.duration * 60_000,
          );
          if (overlapping.date < newEnd && existingEnd > visitDate) {
            throw new Error(ERROR_MESSAGES.SLOT_TAKEN);
          }
        }

        // Create the visit
        return await tx.visit.create({
          data: {
            nombre,
            telefono,
            email,
            date: visitDate,
            workTypeId,
            mensaje,
            status: VISIT_STATUS.PENDING,
          },
          include: {
            workType: true,
          },
        });
      });

      return visit;
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof Error &&
        error.message === ERROR_MESSAGES.SLOT_TAKEN
      ) {
        throw error;
      }
      // Wrap unknown errors
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  },

  /**
   * Get all visits with optional filters
   */
  async getVisits(filters?: {
    status?: VisitStatus;
    workTypeId?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.workTypeId) {
      where.workTypeId = filters.workTypeId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return await prisma.visit.findMany({
      where,
      include: { workType: true },
      orderBy: { date: "desc" },
    });
  },

  /**
   * Get a single visit by ID
   */
  async getVisitById(id: number) {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { workType: true },
    });

    if (!visit) {
      throw new Error(ERROR_MESSAGES.VISIT_NOT_FOUND);
    }

    return visit;
  },

  /**
   * Update visit status
   */
  async updateVisitStatus(id: number, status: VisitStatus) {
    try {
      return await prisma.visit.update({
        where: { id },
        data: { status },
        include: { workType: true },
      });
    } catch (error) {
      throw new Error(ERROR_MESSAGES.VISIT_NOT_FOUND);
    }
  },

  /**
   * Delete a visit (soft delete by setting status to CANCELLED)
   */
  async cancelVisit(id: number) {
    return await this.updateVisitStatus(id, VISIT_STATUS.CANCELLED);
  },

  /**
   * Get visits for a specific date
   */
  async getVisitsByDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await prisma.visit.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: VISIT_STATUS.CANCELLED },
      },
      include: { workType: true },
      orderBy: { date: "asc" },
    });
  },
};
