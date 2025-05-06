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
      text: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff7f9; padding: 30px; border-radius: 10px; border: 1px solid #f8d9e6;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://lmtsteste04.ufape.edu.br/uploads/Logo_30229a345d.png" alt="Logo ConectaElas" style="max-width: 100px;" />
      </div>
    
      <h2 style="color: #d63384; text-align: center;">Redefinição de Senha - ConectaElas</h2>
    
      <p style="font-size: 16px; color: #333;">Olá!</p>
    
      <p style="font-size: 16px; color: #333;">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>ConectaElas</strong>.
      </p>
    
      <p style="font-size: 16px; color: #333;">
        Use o código abaixo para confirmar essa ação:
      </p>
    
      <div style="background-color: #ffe3ed; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #c2185b;">${novoCodigo}</span>
      </div>
    
      <p style="font-size: 14px; color: #666;">
        Este código expira em 24 horas. Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.
      </p>
    
      <hr style="border: none; border-top: 1px solid #f8d9e6; margin: 30px 0;">
    
      <p style="font-size: 12px; color: #999; text-align: center;">
        Equipe ConectaElas
      </p>
    </div>
    `,
    });

    return ctx.send({ message: "Código enviado com sucesso"});
  },
}));
