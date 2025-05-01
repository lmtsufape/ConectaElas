import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::inserir-codigo.inserir-codigo', ({ strapi }) => ({
  async create(ctx) {
    const { email, codigo } = ctx.request.body;

    if (!email || !codigo) {
      return ctx.badRequest('Email e código são obrigatórios');
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email },
    });

    if (!user) {
      return ctx.notFound('Usuário não encontrado');
    }

    const codigos = await strapi.entityService.findMany('api::codigo-email.codigo-email', {
        filters: {
          email,
        },
        sort: { createdAt: 'desc' },
        limit: 1,
      });
      

    if (!codigos || codigos.length === 0) {
      return ctx.badRequest('Nenhum código foi enviado');
    }

    const codigoEmail = codigos[0];

    if (String(codigoEmail.codigo) !== String(codigo)) {
      return ctx.badRequest('Código inválido');
    }

    const enviadoEm = new Date(codigoEmail.dataEnvio);
    const agora = new Date();
    const diffHoras = (agora.getTime() - enviadoEm.getTime()) / (1000 * 60 * 60);

    if (diffHoras > 24) {
      return ctx.badRequest('Código expirado');
    }

    await strapi.entityService.update('plugin::users-permissions.user', user.id, {
      data: {
        confirmed: true,
        confirmationToken: null,
      },
    });

    return ctx.send({ message: 'E-mail confirmado com sucesso' });
  },
}));
