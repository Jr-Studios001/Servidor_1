const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

const rooms = {};

server.on('connection', (socket) => {
    const playerId = "user_" + Math.random().toString(36).substring(2, 6);
    socket.playerId = playerId;
    console.log(`Jugador conectado: ${playerId}`);

    socket.on('message', (message) => {
        const data = JSON.parse(message);
        const { cmd, content } = data;

        switch (cmd) {
            case 'create_room':
                const newRoom = content.room_name;
                rooms[newRoom] = [socket];
                socket.room = newRoom;
                socket.send(JSON.stringify({ cmd: "room_created", content: { room: newRoom, id: playerId } }));
                console.log(`Sala creada: ${newRoom} por ${playerId}`);
                break;

            case 'join_room':
                const roomToJoin = content.room_name;
                if (rooms[roomToJoin]) {
                    // 1. Obtener los IDs de todos los que ya están en la sala
                    const existingPlayers = rooms[roomToJoin].map(client => {
                        return { id: client.playerId };
                    });
            
                    // 2. Avisar al NUEVO usuario quiénes están ya en la sala
                    socket.send(JSON.stringify({ 
                        cmd: "spawn_network_players", 
                        content: { players: existingPlayers } 
                    }));
            
                    // 3. Avisar a los que YA ESTABAN que llegó uno nuevo
                    rooms[roomToJoin].forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ 
                                cmd: "spawn_new_player", 
                                content: { player: { id: playerId } } 
                            }));
                        }
                    });
            
                    // 4. Agregar al nuevo a la lista de la sala
                    rooms[roomToJoin].push(socket);
                    socket.room = roomToJoin;
                    
                    socket.send(JSON.stringify({ cmd: "room_joined", content: { room: roomToJoin, id: playerId } }));
                }
                break;
                
            case 'request_player_list':
                const roomName = content.room;
                if (rooms[roomName]) {
                    const list = rooms[roomName]
                        .filter(c => c.playerId !== socket.playerId) // Todos menos yo
                        .map(c => ({ id: c.playerId }));
                        
                    socket.send(JSON.stringify({ 
                        cmd: "spawn_network_players", 
                        content: { players: list } 
                    }));
                    console.log(`Enviando lista de ${list.length} jugadores a ${socket.playerId}`);
                }
                break;
                
            case 'update_position':
                // Solo reenvía la posición a los jugadores en la MISMA sala
                if (socket.room && rooms[socket.room]) {
                    rooms[socket.room].forEach(client => {
                        if (client !== socket && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ cmd: "update_position", content: data.content }));
                        }
                    });
                }
                break;
        }
    });

    socket.on('close', () => {
        console.log('Jugador desconectado');
    });
});

console.log('Servidor WebSocket corriendo en puerto 8080 v1');
