import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::caca-palavra.caca-palavra",
  ({ strapi }) => ({
    async create(ctx) {
      const body = ctx.request.body;
      const palavras = body.data.palavras;
      const N = 8;

      const grid = Array.from({ length: N }, () =>
        Array.from({ length: N }, () =>
          String.fromCharCode(65 + Math.floor(Math.random() * 26))
        )
      );

      palavras.forEach((palavra: string) => {
        const vertical = Math.random() < 0.5;

        if (vertical) {
          const row = Math.floor(Math.random() * (N - palavra.length));
          const col = Math.floor(Math.random() * N);

          for (let i = 0; i < palavra.length; i++) {
            grid[row + i][col] = palavra[i].toUpperCase();
          }
        } else {
          const row = Math.floor(Math.random() * N);
          const col = Math.floor(Math.random() * (N - palavra.length));

          for (let i = 0; i < palavra.length; i++) {
            grid[row][col + i] = palavra[i].toUpperCase();
          }
        }
      });

      body.data.grade = {
        linhas: N,
        colunas: N,
        grade: grid
      };

      return await super.create(ctx);
    }
  })
);
