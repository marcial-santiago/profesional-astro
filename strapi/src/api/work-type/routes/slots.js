'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/work-types/slots',
      handler: 'work-type.getAvailableSlots',
      config: {
        auth: false,
      },
    },
  ],
};
