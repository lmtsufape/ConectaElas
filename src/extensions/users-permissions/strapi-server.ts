import { validateCPF } from '../../utils/validateCPF';
import * as defaultPlugin from '@strapi/plugin-users-permissions/server';

console.log("Plugin users-permissions está sendo estendido");

export default (plugin: typeof defaultPlugin) => {
  const rawAuth = plugin.controllers.auth({ strapi });

  const auth = ({ strapi }) => {
    return {
      ...rawAuth,

      register: async (ctx) => {
        const { username, email, password } = ctx.request.body;


        console.log(ctx.request.body);

        if (!username || !validateCPF(username)) {
          return ctx.badRequest('CPF inválido');
        }

        ctx.request.body.username = username;

        return await rawAuth.register(ctx);
      },

      callback: async (ctx) => {
        const { identifier, password } = ctx.request.body;

        if (!identifier || !password) {
          return ctx.badRequest('Identificador e senha obrigatórios');
        }
        ctx.request.body.identifier = identifier;

        return await rawAuth.callback(ctx);
      }
    };
  };

  plugin.controllers.auth = auth;

  return plugin;
};
