import { Server } from "socket.io";

export default {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Usuário conectado:", socket.id);

      socket.on("join_chat", (ProtocoloID) => {
        socket.join(ProtocoloID);
        console.log(`Usuário entrou no chat do protocolo: ${ProtocoloID}`);
      });

      socket.on("send_message", async ({ ProtocoloID, message, remetente }) => {
        try {
          const newMessage = await strapi.entityService.create("api::message.message", {
            data: {
              Mensagem: message,
              Data_Envio: new Date(),
              Status_mensagem: "enviado",
              protocolo: ProtocoloID,
              remetente: remetente,
            },
          });

          io.to(ProtocoloID).emit("receive_message", newMessage);
        } catch (error) {
          console.error("Erro ao salvar mensagem:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("Usuário desconectado:", socket.id);
      });
    });

    strapi.io = io;
  },
};
