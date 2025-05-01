import { validateCPF } from '../../utils/validateCPF';
import * as defaultPlugin from '@strapi/plugin-users-permissions/server';
import { sendCustomConfirmationEmail } from '../../custom/emails/registrocomcpf';


console.log('Plugin users-permissions está sendo estendido');

export default (plugin: typeof defaultPlugin) => {
  const originalAuthController = plugin.controllers.auth;

  plugin.controllers.auth = ({ strapi }) => {
    const original = originalAuthController({ strapi });

    return {
      ...original,

      async register(ctx) {
        let { username, email } = ctx.request.body;

        console.log('➡️ Dados recebidos no register:', ctx.request.body);

        if (!username || !validateCPF(username)) {
          return ctx.badRequest('CPF inválido');
        }

        const cleanedCPF = username.replace(/\D/g, '');
        ctx.request.body.username = cleanedCPF;

        const response = await original.register(ctx);

        try {
          const advancedSettings = await strapi
            .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
            .get();

          if (advancedSettings.email_confirmation) {
            const user = await strapi
              .query('plugin::users-permissions.user')
              .findOne({ where: { email } });

            if (user) {
              await sendCustomConfirmationEmail(strapi, user);
            }
          }
        } catch (err) {
          console.warn('⚠️ Erro ao enviar e-mail de confirmação:', err.message);
        }

        return response;
      },

      async callback(ctx) {
        const { identifier, password } = ctx.request.body;

        if (!identifier || !password) {
          return ctx.badRequest('Identificador e senha obrigatórios');
        }

        return await original.callback(ctx);
      },
    };
  };

  return plugin;
};
