import { validateCPF } from "../../utils/validateCPF";
import * as defaultPlugin from "@strapi/plugin-users-permissions/server";
import { sendCustomConfirmationEmail } from "../../custom/emails/registrocomcpf";

function gerarCodigo5Digitos() {
  const codigo = Math.floor(Math.random() * 100000);
  return codigo.toString().padStart(5, "0");
}

async function reenviarCodigo(strapi: any, email: string) {
  const codigoExistente = await strapi.entityService.findMany(
    "api::codigo-email.codigo-email",
    {
      filters: { email },
      sort: { createdAt: "desc" },
      limit: 1,
    }
  );

  if (codigoExistente.length > 0) {
    await strapi.entityService.delete(
      "api::codigo-email.codigo-email",
      codigoExistente[0].id
    );
  }

  const novoCodigo = gerarCodigo5Digitos();

  await strapi.entityService.create("api::codigo-email.codigo-email", {
    data: {
      email,
      codigo: novoCodigo,
      dataEnvio: new Date(),
    },
  });

  await strapi
    .plugin("email")
    .service("email")
    .send({
      to: email,
      subject: "Confirmação de E-mail",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff7f9; padding: 30px; border-radius: 10px; border: 1px solid #f8d9e6;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://lmtsteste04.ufape.edu.br/uploads/Logo_30229a345d.png" alt="Logo ConectaElas" style="max-width: 100px;" />
      </div>
    
      <h2 style="color: #d63384; text-align: center;">ConectaElas</h2>
    
      <p style="font-size: 16px; color: #333;">Olá!</p>
    
      <p style="font-size: 16px; color: #333;">
        Agradecemos por se registrar na plataforma <strong>ConectaElas</strong> — um espaço seguro e acolhedor feito para você.
      </p>
    
      <p style="font-size: 16px; color: #333;">
        Aqui está seu código de confirmação:
      </p>
    
      <div style="background-color: #ffe3ed; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #c2185b;">${novoCodigo}</span>
      </div>
    
      <p style="font-size: 14px; color: #666;">
        Este código expira em 24 horas. Se você não solicitou este registro, pode ignorar este e-mail.
      </p>
    
      <hr style="border: none; border-top: 1px solid #f8d9e6; margin: 30px 0;">
    
      <p style="font-size: 12px; color: #999; text-align: center;">
        Com carinho,<br>
        Equipe ConectaElas
      </p>
    </div>
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

        console.log("➡️ Dados recebidos no register:", ctx.request.body);

        if (!username || !validateCPF(username)) {
          return ctx.badRequest("CPF inválido");
        }

        const cleanedCPF = username.replace(/\D/g, "");
        ctx.request.body.username = cleanedCPF;

        const codigoPendente = await strapi.db
          .query("api::codigo-email.codigo-email")
          .findOne({
            where: { email },
          });

        if (codigoPendente) {
          await reenviarCodigo(strapi, email);
          return ctx.badRequest(
            "Este e-mail já foi usado, mas não confirmado. Um novo código foi enviado."
          );
        }

        const response = await original.register(ctx);

        try {
          const advancedSettings = await strapi
            .store({
              type: "plugin",
              name: "users-permissions",
              key: "advanced",
            })
            .get();

          if (advancedSettings.email_confirmation) {
            const user = await strapi
              .query("plugin::users-permissions.user")
              .findOne({ where: { email } });

            if (user) {
              await sendCustomConfirmationEmail(strapi, user);
            }
          }
        } catch (err) {
          console.warn("⚠️ Erro ao enviar e-mail de confirmação:", err.message);
        }

        return response;
      },

      async callback(ctx) {
        const { identifier, password } = ctx.request.body;

        if (!identifier || !password) {
          return ctx.badRequest("Identificador e senha obrigatórios");
        }

        let usuario;

        if (validateCPF(identifier)) {
          const cleanedCPF = identifier.replace(/\D/g, "");
          usuario = await strapi
            .query("plugin::users-permissions.user")
            .findOne({ where: { username: cleanedCPF } });
        } else {
          usuario = await strapi
            .query("plugin::users-permissions.user")
            .findOne({ where: { email: identifier.toLowerCase() } });
        }

        if (usuario && !usuario.confirmed) {
          const emailDoUsuario = usuario.email;

          const codigoPendente = await strapi.db
            .query("api::codigo-email.codigo-email")
            .findOne({
              where: { email: emailDoUsuario },
            });

          if (codigoPendente) {
            await reenviarCodigo(strapi, emailDoUsuario);
            return ctx.badRequest(
              "Este e-mail ainda não foi confirmado. Reenviamos um novo código."
            );
          }
        }

        return await original.callback(ctx);
      },
    };
  };

  return plugin;
};
