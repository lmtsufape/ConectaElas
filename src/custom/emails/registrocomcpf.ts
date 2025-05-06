import jwt from 'jsonwebtoken';
import codigoEmail from '../../api/codigo-email/controllers/codigo-email';
import { factories } from '@strapi/strapi';

function gerarCodigo5Digitos() {
    const codigo = Math.floor(Math.random() * 100000);
    return codigo.toString().padStart(5, '0');
}

export async function sendCustomConfirmationEmail(strapi: any, user: any) {
  console.log('➡️ Enviando e-mail de confirmação customizado para:', user.email);

  const jwtSecret = process.env.JWT_SECRET || strapi.config.get('plugin.users-permissions.jwtSecret');
  const token = jwt.sign(
    { id: user.id },
    jwtSecret,
    { expiresIn: '1d' }
  );

  const codigo = gerarCodigo5Digitos();
  const response = await strapi.entityService.create('api::codigo-email.codigo-email',{data:{codigo, dataEnvio : new Date(), email: user.email}});

  await strapi.entityService.update('plugin::users-permissions.user', user.id, {
    data: { confirmationToken: token },
  });

  try {
    await strapi.plugin('email').service('email').send({
      to: user.email,
      subject: 'Confirme seu cadastro',
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
              <span style="font-size: 24px; font-weight: bold; color: #c2185b;">${codigo}</span>
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
  } catch (err) {
    console.error('Erro ao enviar e-mail de confirmação:', err.message);
    throw err;
  }
}
