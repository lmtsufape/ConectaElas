import { Server } from "socket.io";
import jwt, { JwtPayload } from "jsonwebtoken";
import { error } from "console";
import protocolo from "./api/protocolo/controllers/protocolo";
export default {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", async (socket) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          console.log("🛑 Conexão rejeitada: Token ausente.");
          socket.disconnect();
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

        if (!decoded || typeof decoded !== "object" || !decoded.id) {
          console.log("🛑 Token inválido.");
          socket.disconnect();
          return;
        }

        const userId = decoded.id;
        console.log(`✅ Usuário autenticado (${userId}) conectado:`, socket.id);

        const userStored = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({
            where: { id: userId },
          });

        if (!userStored) throw new Error("Usuário não encontrado!");

        socket.on("join_chat", async (ProtocoloID) => {
          try {
            const protocolo = await strapi.db
              .query("api::protocolo.protocolo")
              .findOne({
                where: { ProtocoloID: ProtocoloID },
              });

            console.log(protocolo);
            if (!protocolo) {
              throw new Error("Protocolo não encontrado!");
            }

            if (protocolo.Status_Protocolo === "Finalizado")
              throw new Error("Protocolo já foi finalizado!");

            const idDoProtocolo = protocolo.id;
            socket.data.ProtocoloID = ProtocoloID;
            socket.data.id_protocolo = idDoProtocolo;
            await strapi.db.query("api::protocolo.protocolo").update({
              where: { ProtocoloID: ProtocoloID },
              data: { socket_id: socket.id },
            });
            console.log(
              `✅ Socket ID (${socket.id}) salvo no protocolo ${ProtocoloID}`
            );

            socket.join(ProtocoloID);
            console.log(
              `Usuário ${userId} entrou no chat do protocolo: ${ProtocoloID}`
            );
            io.to(ProtocoloID).emit("user_connected", userStored.username);
          } catch (error) {
            console.error(
              "❌ Erro ao atualizar o protocolo com o socket ID:",
              error
            );
          }
        });

        socket.on("send_message", async ({ ProtocoloID, message }) => {
          console.log("📩 Recebendo mensagem:", {
            ProtocoloID,
            message,
            usuario: userId,
          });

          try {
            const idProtocolo = socket.data.id_protocolo;
            const newMessage = await strapi.entityService.create(
              "api::mensagem.mensagem",
              {
                data: {
                  Mensagem: message,
                  Data_Envio: new Date(),
                  Status_mensagem: "Enviado",
                  protocolo: { id: idProtocolo },
                  remetente: { id: userId },
                  publishedAt: new Date(),
                },
              }
            );

            console.log("✅ Mensagem salva com sucesso:", newMessage);
            io.to(ProtocoloID).emit("receive_message", newMessage);
          } catch (error) {
            console.error("❌ Erro ao salvar mensagem:", error.details.errors);
          }
        });

            socket.on("disconnect", async () => {
      console.log(`Usuário ${userId} desconectado:`, socket.id);

      const ProtocoloID = socket.data.ProtocoloID;

      if (ProtocoloID) {
        io.to(ProtocoloID).emit("user_disconnect", userStored.username);
        try {
            await strapi.db.query("api::protocolo.protocolo").update({
              where: { ProtocoloID: ProtocoloID },
              data: { socket_id: null },
            });

            console.log(`✅ Socket ID removido do protocolo ${ProtocoloID}`);
          } catch (error) {
            console.error("❌ Erro ao remover o socket ID do protocolo:", error);
          }
        } else {
          console.log("⚠️ ProtocoloID não encontrado no socket.");
        }
      });

      } catch (error) {
        console.log("🛑 Erro na autenticação do usuário:", error);
        socket.disconnect();
      }
    });

    strapi.io = io;
  },
};