import * as usersPermissionsServices from '@strapi/plugin-users-permissions/server/services';

export const getService = (name: keyof typeof usersPermissionsServices, strapi: any) => {
  return usersPermissionsServices[name]({ strapi });
};
