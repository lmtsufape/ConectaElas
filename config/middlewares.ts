export default [
  "strapi::errors",
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      headers: "*",
      origin: "*",
    },
  },
  "strapi::security",
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
