import { factories } from "@strapi/strapi";
import { validateCPF } from "../../../utils/validateCPF";

function gerarCodigo5Digitos() {
  const codigo = Math.floor(Math.random() * 100000);
  return codigo.toString().padStart(5, "0");
}

export default factories.createCoreController(
  "api::reenvio-codigo.reenvio-codigo",
  ({ strapi }) => ({
    async create(ctx) {
      const { identifier } = ctx.request.body;

      if (!identifier) {
        return ctx.badRequest("E-mail é obrigatório");
      }

      // verifica se foi o CPF que foi passado
      const isCpf = validateCPF(identifier);
      let user = null;

      // busca o usuário pelo CPF ou pelo email
      if (isCpf) {
        const cleanedCPF = identifier.replace(/\D/g, "");
        user = await strapi.query("plugin::users-permissions.user").findOne({
          where: { username: cleanedCPF },
        });
      } else {
        user = await strapi.query("plugin::users-permissions.user").findOne({
          where: { email: identifier },
        });
      }

      if (!user) {
        return ctx.notFound("Usuário não encontrado");
      }

      try {
        const codigoExistente = await strapi.entityService.findMany(
          "api::codigo-email.codigo-email",
          {
            filters: { email: user.email },
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
            email: user.email,
            codigo: novoCodigo,
            dataEnvio: new Date(),
          },
        });

        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: user.email,
            subject: "Reenvio de Código de Confirmação",
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

        return ctx.send({ message: "Novo código enviado com sucesso." });
      } catch (error) {
        console.error("Erro ao reenviar código:", error);
        return ctx.internalServerError("Erro ao reenviar código");
      }
    },
  })
);
