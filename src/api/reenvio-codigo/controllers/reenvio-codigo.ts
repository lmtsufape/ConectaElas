import { factories } from '@strapi/strapi';

function gerarCodigo5Digitos() {
  const codigo = Math.floor(Math.random() * 100000);
  return codigo.toString().padStart(5, '0');
}

export default factories.createCoreController('api::reenvio-codigo.reenvio-codigo', ({ strapi }) => ({
  async create(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('E-mail é obrigatório');
    }

    try {
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
        subject: 'Reenvio de Código de Confirmação',
        html: `
          <p>Olá!</p>
          <p>Seu novo código de confirmação é: <strong>${novoCodigo}</strong></p>
          <p>Este código expira em 24 horas.</p>
        `,
      });

      return ctx.send({ message: 'Novo código enviado com sucesso.' });

    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      return ctx.internalServerError('Erro ao reenviar código');
    }
  }
}));
