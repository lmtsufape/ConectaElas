import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::caca-palavra.caca-palavra",
  ({ strapi }) => ({
    async create(ctx) {
      const body = ctx.request.body;
      const palavras: string[] = body.data.palavras;
      const N = 8;

      function palavraInvalida(palavra: string){
        if (palavra.length > N) {
          throw new Error("Palavra maior que a grade!");
        }
      }

      palavras.forEach (palavra => palavraInvalida(palavra));


      return await super.create(ctx);
    },
  })
);
