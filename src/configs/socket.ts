/* eslint-disable no-console */
import { Server } from "socket.io";

export type MessageType = {
  content: string;
  conversationId?: string | undefined;
  privateUsers?: string[] | undefined;
  serverId?: string | undefined;
  channelId?: string | undefined;
  replyTo?: string | undefined;
  forwarded?:
    | {
        messageId: string;
        senderId: string;
        forwardedAt: string;
      }
    | undefined;
};

export type TypingUser = {
  userId: string;
  username: string;
  conversationId: string;
};

const onlineUsers = new Map<string, Set<string>>();

export function setupSocket(io: Server) {
  io.on("connection", socket => {
    const userId = socket.handshake.query.userId as string;

    if (!userId) return;

    console.log("socket connected", socket.id);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId)?.add(socket.id);

    io.emit("users:online", [...onlineUsers.keys()]);

    socket.on("conversation:join", conversationId => {
      if (!conversationId) return;

      console.log("conversation:join", conversationId);

      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", conversationId => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("channel:join", channelId => {
      if (!channelId) return;

      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", channelId => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("typing:start", (payload: TypingUser) => {
      const safePayload = {
        conversationId: payload.conversationId,
        username: payload.username,
        userId
      };

      if (!safePayload?.conversationId) return;

      socket
        .to(`conversation:${safePayload.conversationId}`)
        .emit("typing:start", safePayload);
    });

    socket.on("typing:stop", payload => {
      if (!payload?.conversationId) return;

      socket.to(`conversation:${payload.conversationId}`).emit("typing:stop", {
        conversationId: payload.conversationId,
        userId
      });
    });

    socket.on(
      "message:send",
      (payload: {
        conversationId?: string;
        channelId?: string;
        message: MessageType;
      }) => {
        let roomKey: string | undefined;

        if (payload.conversationId) {
          roomKey = `conversation:${payload.conversationId}`;
        } else if (payload.channelId) {
          roomKey = `channel:${payload.channelId}`;
        }

        if (!roomKey) return;

        console.log("message:send", payload);

        socket.to(roomKey).emit("message:new", payload.message);
      }
    );

    socket.on("disconnect", () => {
      for (const room of socket.rooms) {
        if (!room.startsWith("conversation:")) continue;

        const conversationId = room.replace("conversation:", "");

        socket.to(room).emit("typing:stop", {
          conversationId,
          userId
        });
      }

      const userSockets = onlineUsers.get(userId);

      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }

      io.emit("users:online", [...onlineUsers.keys()]);
    });
  });
}
