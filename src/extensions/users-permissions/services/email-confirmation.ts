export async function sendCustomConfirmationEmail(strapi: any, user: any) {
  const token = user.confirmationToken;

  const confirmationLink = `https://seu-front.com/confirmar-email?token=${token}`; // ajuste esse link

  await strapi.plugin('email').service('email').send({
    to: user.email,
    subject: 'Confirmação de Cadastro - ConectaElas',
    html: `
      <h2>Olá!</h2>
      <p>Seja bem-vinda ao ConectaElas!</p>
      <p>Confirme seu e-mail clicando no botão abaixo:</p>
      <a href="${confirmationLink}" style="padding:10px 20px; background-color:#ee609c; color:#fff; text-decoration:none; border-radius:4px;">Confirmar E-mail</a>
      <p>Ou copie e cole este link no navegador: ${confirmationLink}</p>
    `,
  });
}
