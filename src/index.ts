import { Server } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";

export default {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      allowUpgrades: true,
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    io.on("connection", async (socket) => {
      console.log(`🔗 Novo cliente conectado: ${socket.id}`);

      socket.on("authenticate", async (token) => {
        try {
          if (!token) {
            console.log("🛑 Conexão rejeitada: Token ausente.");
            socket.disconnect();
            return;
          }

          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
          ) as JwtPayload;

          if (!decoded || typeof decoded !== "object" || !decoded.id) {
            console.log("🛑 Token inválido.");
            socket.disconnect();
            return;
          }

          const userId = decoded.id;
          console.log(
            `✅ Usuário autenticado (${userId}) conectado: ${socket.id}`
          );

          const userStored = await strapi.db
            .query("plugin::users-permissions.user")
            .findOne({ where: { id: userId } });

          if (!userStored) throw new Error("Usuário não encontrado!");

          socket.data.userId = userId;
          socket.data.userStored = userStored;

          console.log(`🎯 Usuário ${userId} autenticado com sucesso.`);
          socket.emit("authenticated", { success: true });
        } catch (error) {
          console.error("🛑 Erro na autenticação do usuário:", error.message);
          socket.emit("authenticated", {
            success: false,
            error: error.message,
          });
          socket.disconnect();
        }
      });

      socket.on("join_chat", async (ProtocoloID) => {
        try {
          if (!socket.data.userId) {
            console.log("⚠️ Tentativa de entrada em chat sem autenticação.");
            socket.disconnect();
            return;
          }

          const protocolo = await strapi.db
            .query("api::protocolo.protocolo")
            .findOne({ where: { ProtocoloID } });

          if (!protocolo) throw new Error("Protocolo não encontrado!");
          if (protocolo.Status_Protocolo === "Finalizado")
            throw new Error("Protocolo já foi finalizado!");

          socket.data.ProtocoloID = ProtocoloID;
          socket.data.id_protocolo = protocolo.id;

          await strapi.db.query("api::protocolo.protocolo").update({
            where: { ProtocoloID },
            data: { socket_id: socket.id },
          });

          console.log(
            `✅ Socket ID (${socket.id}) salvo no protocolo ${ProtocoloID}`
          );
          socket.join(ProtocoloID);
          io.to(ProtocoloID).emit(
            "user_connected",
            socket.data.userStored.username
          );
          const mensagensParaAtualizar = await strapi.db
            .query("api::mensagem.mensagem")
            .findMany({
              where: {
                protocolo: { id: protocolo.id },
                Leitura: false,
                remetente: {
                  id: { $ne: socket.data.userId },
                },
              },
              select: ["id"],
            });
          const ids = mensagensParaAtualizar.map((m) => m.id);

          if (ids.length > 0) {
            await strapi.db.query("api::mensagem.mensagem").updateMany({
              where: { id: { $in: ids } },
              data: { Leitura: true },
            });

            io.to(ProtocoloID).emit("mensagens_atualizadas", {
              protocoloId: ProtocoloID,
            });
          }
        } catch (error) {
          console.error(
            "❌ Erro ao associar usuário ao protocolo:",
            error.message
          );
        }
      });

      socket.on("send_message", async ({ ProtocoloID, message }) => {
        console.log("📩 Recebendo mensagem:", {
          ProtocoloID,
          message,
          usuario: socket.data.userId,
        });

        try {
          const idProtocolo = socket.data.id_protocolo;
          if (!idProtocolo) throw new Error("Protocolo não identificado.");

          const newMessage = await strapi.entityService.create(
            "api::mensagem.mensagem",
            {
              data: {
                Mensagem: message,
                Data_Envio: new Date(),
                Status_mensagem: "Enviado",
                protocolo: { id: idProtocolo },
                remetente: { id: socket.data.userId },
                publishedAt: new Date(),
              },
            }
          );

          console.log("✅ Mensagem salva com sucesso:", newMessage);
          io.to(ProtocoloID).emit("receive_message", newMessage);
        } catch (error) {
          console.error("❌ Erro ao salvar mensagem:", error.message);
        }
      });

      socket.on("disconnect", async () => {
        console.log(
          `🔌 Usuário ${socket.data.userId || "desconhecido"} desconectado: ${
            socket.id
          }`
        );

        const ProtocoloID = socket.data.ProtocoloID;
        if (ProtocoloID) {
          io.to(ProtocoloID).emit(
            "user_disconnect",
            socket.data.userStored?.username
          );
          try {
            await strapi.db.query("api::protocolo.protocolo").update({
              where: { ProtocoloID },
              data: { socket_id: null },
            });
            console.log(`✅ Socket ID removido do protocolo ${ProtocoloID}`);
          } catch (error) {
            console.error(
              "❌ Erro ao remover socket ID do protocolo:",
              error.message
            );
          }
        }
      });
      socket.on("typing", (data) => {
        socket.to(data.ProtocoloID).emit("typing");
      });

      socket.on("stop_typing", (data) => {
        socket.to(data.ProtocoloID).emit("stop_typing");
      });
    });
    strapi.io = io;
  },
};
