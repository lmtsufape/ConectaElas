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
    
        socket.on("join_chat", async (ProtocoloID) => {
          try {
            const protocolo = [{id:16}];
            if (!protocolo || protocolo.length === 0) {
              console.log(ProtocoloID);
              throw new Error("Protocolo não encontrado.");
            }
        const idDoProtocolo = protocolo[0].id
            socket.data.ProtocoloID = ProtocoloID;
            socket.data.id_protocolo = idDoProtocolo;
            await strapi.entityService.update("api::protocolo.protocolo", idDoProtocolo, {
              data: {
                socket_id: socket.id,
              },
            });
            console.log(`✅ Socket ID (${socket.id}) salvo no protocolo ${ProtocoloID}`);

            socket.join(ProtocoloID);
            console.log(`Usuário ${userId} entrou no chat do protocolo: ${ProtocoloID}`);
          } catch (error) {
            console.error("❌ Erro ao atualizar o protocolo com o socket ID:", error);
          }
        });
    
        socket.on("send_message", async ({ ProtocoloID, message }) => {
          console.log("📩 Recebendo mensagem:", { ProtocoloID, message, usuario: userId });
          
          try {
            const newMessage = await strapi.entityService.create("api::mensagem.mensagem", {
              data: {
                Mensagem: message,
                Data_Envio: new Date(),
                Status_mensagem: "Enviado",
                protocolo: { ProtocoloID },
                remetente: { id: userId },
              },
            });
    
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
            try {
              const idDoProtocolo = socket.data.id_protocolo;
              await strapi.entityService.update("api::protocolo.protocolo", idDoProtocolo, {
                data: {
                  socket_id: null,
                },
              });
              console.log(`✅ Socket ID (${socket.id}) removido do protocolo ${ProtocoloID}`);
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