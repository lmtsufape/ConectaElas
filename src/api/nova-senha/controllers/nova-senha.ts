import { factories } from '@strapi/strapi';
import bcrypt from 'bcryptjs';

export default factories.createCoreController('api::nova-senha.nova-senha', ({ strapi }) => ({
  async create(ctx) {
    const { codigo, senha } = ctx.request.body.data || {};

    if (!codigo || !senha) {
      return ctx.badRequest('Código e nova senha são obrigatórios');
    }

    const codigos = await strapi.entityService.findMany('api::codigo-senha.codigo-senha', {
      filters: {
        codigo,
        confirmed: true,
      },
      sort: { createdAt: 'desc' },
      limit: 1,
    });

    if (!codigos || codigos.length === 0) {
      return ctx.badRequest('Código inválido ou não confirmado');
    }

    const email = codigos[0].email;

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email },
    });

    if (!user) {
      return ctx.notFound('Usuário não encontrado');
    }

    // Criptografa a nova senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Atualiza o usuário com a senha criptografada
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return ctx.send({ message: 'Senha alterada com sucesso' });
  },
}));
