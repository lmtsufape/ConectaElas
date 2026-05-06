import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::pontuacao.pontuacao",
  ({ strapi }) => ({
    validarJogo(jogo: string): boolean {
      const jogosValidos = [
        "quiz",
        "memoria",
        "palavracruzada",
        "cacapalavras",
      ];
      return jogosValidos.includes(jogo);
    },

    calcularPontuacao(
      jogo: string,
      acertos: number,
      totalPerguntas: number,
    ): number {
      const percentual = (acertos / totalPerguntas) * 100;
      const percentualFinal = Math.round(percentual);
      console.log("DEBUG - Serviço calcularPontuacao:", {
        jogo,
        acertos,
        totalPerguntas,
        percentual,
        percentualFinal,
      });
      return Math.min(Math.max(percentualFinal, 0), 100);
    },
  }),
);
