module.exports = ({ env }) => ({
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
          secure: false, // TLS
        },
        settings: {
          defaultFrom: 'conectaelasofc@gmail.com',
          defaultReplyTo: 'conectaelasofc@gmail.com',
        },
      },
    },
  });
  