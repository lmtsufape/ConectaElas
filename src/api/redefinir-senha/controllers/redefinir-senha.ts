// src/api/redefinir-senha/controllers/redefinir-senha.ts
import { factories } from '@strapi/strapi';
import crypto from 'crypto';

function gerarCodigo5Digitos() {
    const codigo = Math.floor(Math.random() * 100000);
    return codigo.toString().padStart(5, '0');
  }

export default factories.createCoreController('api::redefinir-senha.redefinir-senha', ({ strapi }) => ({
  async create(ctx) {
    const { email } = ctx.request.body;

    if (!email) return ctx.badRequest("Email é obrigatório");

    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { email } });

    if (!user) return ctx.notFound("Usuário não encontrado");

    const novoCodigo = gerarCodigo5Digitos();

    
    await strapi.db.query('api::codigo-senha.codigo-senha').deleteMany({
      where: { email},
    });

    await strapi.entityService.create('api::codigo-senha.codigo-senha', {
      data: {
        email,
        codigo: novoCodigo,
        dataEnvio: new Date(),
      },
    });

    await strapi.plugins['email'].services.email.send({
      to: email,
      subject: 'Seu código para redefinir a senha',
      text: `Seu código de verificação é: ${novoCodigo}`,
    });

    return ctx.send({ message: "Código enviado com sucesso"});
  },
}));
