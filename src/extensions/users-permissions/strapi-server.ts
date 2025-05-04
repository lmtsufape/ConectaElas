import { validateCPF } from '../../utils/validateCPF';
import * as defaultPlugin from '@strapi/plugin-users-permissions/server';
import { sendCustomConfirmationEmail } from '../../custom/emails/registrocomcpf';

function gerarCodigo5Digitos() {
  const codigo = Math.floor(Math.random() * 100000);
  return codigo.toString().padStart(5, '0');
}

async function reenviarCodigo(strapi: any, email: string) {
  const codigoExistente = await strapi.entityService.findMany('api::codigo-email.codigo-email', {
    filters: { email },
    sort: { createdAt: 'desc' },
    limit: 1,
  });

  if (codigoExistente.length > 0) {
    await strapi.entityService.delete('api::codigo-email.codigo-email', codigoExistente[0].id);
  }

  const novoCodigo = gerarCodigo5Digitos();

  await strapi.entityService.create('api::codigo-email.codigo-email', {
    data: {
      email,
      codigo: novoCodigo,
      dataEnvio: new Date(),
    },
  });

  await strapi.plugin('email').service('email').send({
    to: email,
    subject: 'Confirmação de E-mail',
    html: `
      <p>Olá!</p>
      <p>Seu código de confirmação é: <strong>${novoCodigo}</strong></p>
      <p>Este código expira em 24 horas.</p>
    `,
  });
}

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

        const codigoPendente = await strapi.db.query('api::codigo-email.codigo-email').findOne({
          where: { email },
        });

        if (codigoPendente) {
          await reenviarCodigo(strapi, email);
          return ctx.badRequest('Este e-mail já foi usado, mas não confirmado. Um novo código foi enviado.');
        }

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

        let usuario;

        if (validateCPF(identifier)) {
          const cleanedCPF = identifier.replace(/\D/g, '');
          usuario = await strapi
            .query('plugin::users-permissions.user')
            .findOne({ where: { username: cleanedCPF } });
        } else {
          usuario = await strapi
            .query('plugin::users-permissions.user')
            .findOne({ where: { email: identifier.toLowerCase() } });
        }

        if (usuario && !usuario.confirmed) {
          const emailDoUsuario = usuario.email;

          const codigoPendente = await strapi.db.query('api::codigo-email.codigo-email').findOne({
            where: { email: emailDoUsuario },
          });

          if (codigoPendente) {
            await reenviarCodigo(strapi, emailDoUsuario);
            return ctx.badRequest('Este e-mail ainda não foi confirmado. Reenviamos um novo código.');
          }
        }

        return await original.callback(ctx);
      },
    };
  };

  return plugin;
};
