const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const rooms = {};

function broadcastRooms() {
    const activeRooms = Object.keys(rooms);
    const message = JSON.stringify({
        cmd: "update_room_list",
        content: { rooms: activeRooms }
    });
    
    server.clients.forEach(client => {
        // Solo enviamos a los que están conectados pero no tienen sala aún
        if (client.readyState === WebSocket.OPEN && !client.room) {
            client.send(message);
        }
    });
}

server.on('connection', (socket) => {
    const playerId = "user_" + Math.random().toString(36).substring(2, 6);
    socket.playerId = playerId;
    console.log(`Jugador conectado: ${playerId}`);
    
    // Enviamos la lista inicial de salas al conectar
    const activeRooms = Object.keys(rooms);
    socket.send(JSON.stringify({
        cmd: "update_room_list",
        content: { rooms: activeRooms }
    })); // <--- AQUÍ FALTABAN EL PARENTESIS Y LA LLAVE

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { cmd, content } = data;

            switch (cmd) {
                case 'create_room':
                    const newRoom = content.room_name;
                    rooms[newRoom] = [socket];
                    socket.room = newRoom;
                    socket.send(JSON.stringify({ cmd: "room_created", content: { room: newRoom, id: playerId } }));
                    console.log(`Sala creada: ${newRoom} por ${playerId}`);
                    broadcastRooms();
                    break;

                case 'join_room':
                    const roomToJoin = content.room_name;
                    if (rooms[roomToJoin]) {
                        const existingPlayers = rooms[roomToJoin].map(client => {
                            return { id: client.playerId };
                        });
                
                        socket.send(JSON.stringify({ 
                            cmd: "spawn_network_players", 
                            content: { players: existingPlayers } 
                        }));
                
                        rooms[roomToJoin].forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ 
                                    cmd: "spawn_new_player", 
                                    content: { player: { id: playerId } } 
                                }));
                            }
                        });
                
                        rooms[roomToJoin].push(socket);
                        socket.room = roomToJoin;
                        socket.send(JSON.stringify({ cmd: "room_joined", content: { room: roomToJoin, id: playerId } }));
                    }
                    break;
                    
                case 'request_player_list':
                    const roomName = content.room;
                    if (rooms[roomName]) {
                        const list = rooms[roomName]
                            .filter(c => c.playerId !== socket.playerId)
                            .map(c => ({ id: c.playerId }));
                            
                        socket.send(JSON.stringify({ 
                            cmd: "spawn_network_players", 
                            content: { players: list } 
                        }));
                    }
                    break;
                    
                case 'update_position':
                    if (socket.room && rooms[socket.room]) {
                        rooms[socket.room].forEach(client => {
                            if (client !== socket && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ cmd: "update_position", content: data.content }));
                            }
                        });
                    }
                    break;
            }
        } catch (e) {
            console.log("Error procesando mensaje: ", e);
        }
    });

    socket.on('close', () => {
        // Limpieza al desconectar
        if (socket.room && rooms[socket.room]) {
            rooms[socket.room] = rooms[socket.room].filter(s => s !== socket);
            if (rooms[socket.room].length === 0) {
                delete rooms[socket.room];
                broadcastRooms();
            }
        }
        console.log(`Jugador desconectado: ${playerId}`);
    });
});

console.log('Servidor WebSocket corriendo v2');
