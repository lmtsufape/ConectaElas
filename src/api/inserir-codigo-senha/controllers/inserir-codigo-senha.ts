import { factories } from '@strapi/strapi';
import { sensitiveHeaders } from 'http2';

export default factories.createCoreController('api::inserir-codigo-senha.inserir-codigo-senha', ({ strapi }) => ({
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

    const codigos = await strapi.entityService.findMany('api::codigo-senha.codigo-senha', {
      filters: { email },
      sort: { createdAt: 'desc' },
      limit: 1,
    });

    if (!codigos || codigos.length === 0) {
      return ctx.badRequest('Nenhum código foi enviado');
    }

    const codigoSenha = codigos[0];

    if (String(codigoSenha.codigo) !== String(codigo)) {
      return ctx.badRequest('Código inválido');
    }

    const enviadoEm = new Date(codigoSenha.dataEnvio);
    const agora = new Date();
    const diffHoras = (agora.getTime() - enviadoEm.getTime()) / (1000 * 60 * 60);

    if (diffHoras > 24) {
      return ctx.badRequest('Código expirado');
    }

    const confirmada = await strapi.entityService.update('api::codigo-senha.codigo-senha', codigoSenha.id, {
        data: {
          confirmed: true,
        },
      });
      

    return ctx.send({ message: 'Codigo confirmado com sucesso', codigo:codigoSenha,  });
  },
}));
