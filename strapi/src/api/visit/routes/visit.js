'use strict';
const { createCoreRouter } = require('@strapi/strapi').factories;
module.exports = createCoreRouter('api::visit.visit', {
  config: { create: { auth: false }, find: { auth: false }, findOne: { auth: false } },
});
