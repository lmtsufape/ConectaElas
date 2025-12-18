import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::palavras-cruzada.palavras-cruzada",
  ({ strapi }) => ({

    async create(ctx) {
      const body = ctx.request.body;
      const palavras: string[] = body.data.palavras.map(p => p.toUpperCase());

      const SIZE = 15;
      const grid: string[][] = Array.from({ length: SIZE }, () =>
        Array.from({ length: SIZE }, () => "")
      );

      function canPlaceHorizontal(word: string, row: number, col: number, crossIndex: number) {
        if (col < 0 || col + word.length > SIZE) return false;
        if (col > 0 && grid[row][col - 1] !== "") return false;
        if (col + word.length < SIZE && grid[row][col + word.length] !== "") return false;

        for (let i = 0; i < word.length; i++) {
          const cell = grid[row][col + i];
          if (cell !== "" && cell !== word[i]) return false;

          if (cell === "") {
            if (
              (row > 0 && grid[row - 1][col + i] !== "") ||
              (row < SIZE - 1 && grid[row + 1][col + i] !== "")
            ) return false;
          }
        }
        return true;
      }

      function canPlaceVertical(word: string, row: number, col: number, crossIndex: number) {
        if (row < 0 || row + word.length > SIZE) return false;
        if (row > 0 && grid[row - 1][col] !== "") return false;
        if (row + word.length < SIZE && grid[row + word.length][col] !== "") return false;

        for (let i = 0; i < word.length; i++) {
          const cell = grid[row + i][col];
          if (cell !== "" && cell !== word[i]) return false;

          if (cell === "") {
            if (
              (col > 0 && grid[row + i][col - 1] !== "") ||
              (col < SIZE - 1 && grid[row + i][col + 1] !== "")
            ) return false;
          }
        }
        return true;
      }

      function placeHorizontal(word: string, row: number, col: number) {
        for (let i = 0; i < word.length; i++) {
          grid[row][col + i] = word[i];
        }
      }

      function placeVertical(word: string, row: number, col: number) {
        for (let i = 0; i < word.length; i++) {
          grid[row + i][col] = word[i];
        }
      }

      // Primeira palavra no centro
      const first = palavras.shift();
      const centerRow = Math.floor(SIZE / 2);
      const startCol = Math.floor((SIZE - first.length) / 2);
      placeHorizontal(first, centerRow, startCol);

      for (const word of palavras) {
        let placed = false;

        for (let r = 0; r < SIZE && !placed; r++) {
          for (let c = 0; c < SIZE && !placed; c++) {
            const letter = grid[r][c];
            if (!letter) continue;

            for (let i = 0; i < word.length; i++) {
              if (word[i] !== letter) continue;

              const hCol = c - i;
              if (canPlaceHorizontal(word, r, hCol, i)) {
                placeHorizontal(word, r, hCol);
                placed = true;
                break;
              }

              const vRow = r - i;
              if (canPlaceVertical(word, vRow, c, i)) {
                placeVertical(word, vRow, c);
                placed = true;
                break;
              }
            }
          }
        }
      }

      body.data.grade = {
        linhas: SIZE,
        colunas: SIZE,
        grade: grid
      };

      return await super.create(ctx);
    }

  })
);
