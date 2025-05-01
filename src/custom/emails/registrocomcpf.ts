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
        <p>Olá!</p>
        <p>Confirme seu e-mail com o código: ${codigo}.</p>
        <p>Este código expira em 24 horas.</p>
      `,
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail de confirmação:', err.message);
    throw err;
  }
}
