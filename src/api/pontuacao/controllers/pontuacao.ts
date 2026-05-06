import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::pontuacao.pontuacao",
  ({ strapi }) => ({
    async create(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data) {
          return ctx.badRequest("Dados são obrigatórios");
        }

        const { jogo, acertos, totalPerguntas } = data;

        if (!jogo) {
          return ctx.badRequest("Tipo de jogo é obrigatório");
        }

        console.log("DEBUG - Dados recebidos:", {
          jogo,
          acertos,
          totalPerguntas,
          cacaPalavraId: data.cacaPalavraId,
          allData: data,
        });

        const pontuacaoService = strapi.service("api::pontuacao.pontuacao");
        if (!pontuacaoService.validarJogo(jogo)) {
          return ctx.badRequest(
            `Tipo de jogo inválido. Valores aceitos: quiz, memoria, palavracruzada, cacapalavras`,
          );
        }
        let totalPerguntasCalculado = totalPerguntas;
        if (!totalPerguntasCalculado) {
          if (jogo === "cacapalavras" && data.cacaPalavraId) {
            const cacaPalavra = await strapi.entityService.findOne(
              "api::caca-palavra.caca-palavra",
              data.cacaPalavraId,
            );
            const palavrasArray = cacaPalavra?.palavras as string[] | undefined;
            totalPerguntasCalculado =
              (Array.isArray(palavrasArray) ? palavrasArray.length : 0) || 10;
          } else {
            totalPerguntasCalculado = 10;
          }
        }

        if (acertos === undefined || acertos === null) {
          return ctx.badRequest("Número de acertos é obrigatório");
        }

        if (typeof acertos !== "number" || acertos < 0) {
          return ctx.badRequest(
            "Número de acertos deve ser um número não-negativo",
          );
        }

        if (acertos > totalPerguntasCalculado) {
          return ctx.badRequest(
            "Número de acertos não pode ser maior que o total de perguntas",
          );
        }

        const pontuacaoAjustada = pontuacaoService.calcularPontuacao(
          jogo,
          acertos,
          totalPerguntasCalculado,
        );

        console.log("DEBUG - Cálculo pontuação:", {
          jogo,
          acertos,
          totalPerguntasCalculado,
          pontuacaoAjustada,
          esperado: (acertos / totalPerguntasCalculado) * 100,
        });

        const dataToSave = {
          jogo: jogo,
          total: pontuacaoAjustada,
          users_permissions_user: data.users_permissions_user,
          publishedAt: new Date(),
        };

        ctx.request.body.data = dataToSave;
        return await super.create(ctx);
      } catch (error) {
        console.error("Erro ao criar pontuação:", error);
        return ctx.internalServerError("Erro ao criar pontuação");
      }
    },

    async update(ctx) {
      try {
        const { data } = ctx.request.body;

        if (!data) {
          return ctx.badRequest("Dados são obrigatórios");
        }

        const { jogo, acertos, totalPerguntas } = data;

        if (jogo) {
          const pontuacaoService = strapi.service("api::pontuacao.pontuacao");
          if (!pontuacaoService.validarJogo(jogo)) {
            return ctx.badRequest(
              `Tipo de jogo inválido. Valores aceitos: quiz, memoria, palavracruzada, cacapalavras`,
            );
          }
        }

        if (acertos !== undefined && acertos !== null) {
          if (typeof acertos !== "number" || acertos < 0) {
            return ctx.badRequest(
              "Número de acertos deve ser um número não-negativo",
            );
          }

          const { id } = ctx.params;
          const pontuacaoAtual = await strapi.entityService.findOne(
            "api::pontuacao.pontuacao",
            id,
          );

          if (!pontuacaoAtual) {
            return ctx.notFound("Pontuação não encontrada");
          }

          const jogoUtilizado = jogo || pontuacaoAtual.jogo;
          let totalUtilizado = totalPerguntas;

          if (!totalUtilizado) {
            if (jogoUtilizado === "cacapalavras" && data.cacaPalavraId) {
              const cacaPalavra = await strapi.entityService.findOne(
                "api::caca-palavra.caca-palavra",
                data.cacaPalavraId,
              );
              const palavrasArray = cacaPalavra?.palavras as
                | string[]
                | undefined;
              totalUtilizado =
                (Array.isArray(palavrasArray) ? palavrasArray.length : 0) || 10;
            } else {
              totalUtilizado = 10;
            }
          }

          if (acertos > totalUtilizado) {
            return ctx.badRequest(
              "Número de acertos não pode ser maior que o total de perguntas",
            );
          }

          const pontuacaoService = strapi.service("api::pontuacao.pontuacao");
          const pontuacaoAjustada = pontuacaoService.calcularPontuacao(
            jogoUtilizado,
            acertos,
            totalUtilizado,
          );
          data.total = pontuacaoAjustada;
        }

        delete data.acertos;
        delete data.totalPerguntas;
        ctx.request.body.data = data;
        return await super.update(ctx);
      } catch (error) {
        console.error("Erro ao atualizar pontuação:", error);
        return ctx.internalServerError("Erro ao atualizar pontuação");
      }
    },
  }),
);
