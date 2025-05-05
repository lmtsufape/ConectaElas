import { factories } from "@strapi/strapi";
import { validateCPF } from "../../../utils/validateCPF";

export default factories.createCoreController(
  "api::inserir-codigo.inserir-codigo",
  ({ strapi }) => ({
    async create(ctx) {
      const { identifier, codigo } = ctx.request.body;

      if (!identifier || !codigo) {
        return ctx.badRequest("Identificador e código são obrigatórios");
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

      // busca códigos do usuário encontrado
      const codigos = await strapi.entityService.findMany(
        "api::codigo-email.codigo-email",
        {
          filters: { email: user.email },
          sort: { createdAt: "desc" },
          limit: 1,
        }
      );

      if (!codigos || codigos.length === 0) {
        return ctx.badRequest("Nenhum código foi enviado");
      }

      const codigoEmail = codigos[0];

      if (String(codigoEmail.codigo) !== String(codigo)) {
        return ctx.badRequest("Código inválido");
      }

      const enviadoEm = new Date(codigoEmail.dataEnvio);
      const agora = new Date();
      const diffHoras =
        (agora.getTime() - enviadoEm.getTime()) / (1000 * 60 * 60);

      if (diffHoras > 24) {
        return ctx.badRequest("Código expirado");
      }

      await strapi.entityService.update(
        "plugin::users-permissions.user",
        user.id,
        {
          data: {
            confirmed: true,
            confirmationToken: null,
          },
        }
      );

      await strapi.entityService.delete(
        "api::codigo-email.codigo-email",
        codigoEmail.id
      );

      return ctx.send({ message: "E-mail confirmado com sucesso" });
    },
  })
);
