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
              <p>Olá!</p>
              <p>Seu novo código de confirmação é: <strong>${novoCodigo}</strong></p>
              <p>Este código expira em 24 horas.</p>
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
