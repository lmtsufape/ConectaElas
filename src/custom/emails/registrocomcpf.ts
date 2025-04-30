import jwt from 'jsonwebtoken';

export async function sendCustomConfirmationEmail(strapi: any, user: any) {
  console.log('➡️ Enviando e-mail de confirmação customizado para:', user.email);

  const jwtSecret = process.env.JWT_SECRET || strapi.config.get('plugin.users-permissions.jwtSecret');
  const token = jwt.sign(
    { id: user.id },
    jwtSecret,
    { expiresIn: '1d' }
  );

  await strapi.entityService.update('plugin::users-permissions.user', user.id, {
    data: { confirmationToken: token },
  });

  try {
    await strapi.plugin('email').service('email').send({
      to: user.email,
      subject: 'Confirme seu cadastro',
      html: `
        <p>Olá!</p>
        <p>Confirme seu e-mail clicando <a href="http://localhost:1338/api/auth/local=${token}">aqui</a>.</p>
        <p>Este link expira em 24 horas.</p>
      `,
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail de confirmação:', err.message);
    throw err;
  }
}
