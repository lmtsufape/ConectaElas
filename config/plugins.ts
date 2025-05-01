module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      register: {
        confirmation: false, // <- desativa o envio automático
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env.int('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
        secure: false,
      },
      settings: {
        defaultFrom: 'conectaelasofc@gmail.com',
        defaultReplyTo: 'conectaelasofc@gmail.com',
      },
    },
  },
});
