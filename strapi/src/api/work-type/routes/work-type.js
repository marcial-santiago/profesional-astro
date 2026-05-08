'use strict';
const { createCoreRouter } = require('@strapi/strapi').factories;
module.exports = createCoreRouter('api::work-type.work-type', {
  config: { find: { auth: false }, findOne: { auth: false } },
});
