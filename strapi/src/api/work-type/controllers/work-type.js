'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::work-type.work-type', ({ strapi }) => ({
  async getAvailableSlots(ctx) {
    try {
      const { date, workTypeId } = ctx.query;
      if (!date || !workTypeId) return ctx.badRequest('Date and workTypeId are required');
      
      const workTypeIdNum = parseInt(workTypeId, 10);
      if (isNaN(workTypeIdNum)) return ctx.badRequest('Invalid workTypeId');

      // 1. Parse date
      const [year, month, day] = date.split('-').map(Number);
      const queryDate = new Date(year, month - 1, day);
      const dayOfWeek = queryDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      // 2. Check blocked date
      const blockedDates = await strapi.db.query('api::blocked-date.blocked-date').findMany({
        where: { date: { $gte: startOfDay, $lte: endOfDay } },
        limit: 1,
      });
      
      if (blockedDates.length > 0) {
        return ctx.send({ data: [] });
      }

      // 3. Get work type duration
      const workType = await strapi.db.query('api::work-type.work-type').findOne({ where: { id: workTypeIdNum } });
      if (!workType) return ctx.notFound('Work type not found');
      const slotDuration = workType.duration || 60;

      // 4. Get availability for this day of week
      const availability = await strapi.db.query('api::availability.availability').findMany({
        where: { dayOfWeek },
      });

      if (availability.length === 0) {
        return ctx.send({ data: [] }); // Closed this day
      }

      // 5. Get existing visits
      const visits = await strapi.db.query('api::visit.visit').findMany({
        where: { date: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: 'cancelled' } },
      });

      // 6. Generate slots
      const slots = [];
      const hours = availability[0];
      const [startH, startM] = hours.startTime.split(':').map(Number);
      const [endH, endM] = hours.endTime.split(':').map(Number);
      
      let current = new Date(year, month - 1, day, startH, startM, 0, 0);
      const businessEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

      while (current < businessEnd) {
        const slotEnd = new Date(current.getTime() + slotDuration * 60000);
        
        if (slotEnd > businessEnd) break;

        const timeStr = current.toTimeString().substring(0, 5);
        
        const isOccupied = visits.some((visit) => {
          const visitStart = new Date(visit.date);
          const visitEnd = new Date(visitStart.getTime() + slotDuration * 60000);
          return current < visitEnd && slotEnd > visitStart;
        });

        if (!isOccupied) {
          slots.push(timeStr);
        }
        current = new Date(current.getTime() + slotDuration * 60000);
      }

      return ctx.send({ data: slots });
    } catch (error) {
      console.error('[Slots] CRITICAL ERROR:', error);
      return ctx.internalServerError(error.message);
    }
  },
}));
