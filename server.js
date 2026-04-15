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
                console.log(`Intento de unión a sala: ${roomToJoin} por parte de: ${playerId}`); // <--- AGREGA ESTO
            
                if (rooms[roomToJoin]) {
                    rooms[roomToJoin].push(socket);
                    socket.room = roomToJoin;
                    
                    // Respuesta al que entra
                    socket.send(JSON.stringify({ cmd: "room_joined", content: { room: roomToJoin, id: playerId } }));
                    
                    // Avisar a los que YA ESTABAN en la sala que hay alguien nuevo
                    rooms[roomToJoin].forEach(client => {
                        if (client !== socket && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ cmd: "spawn_new_player", content: { player: { id: playerId } } }));
                            console.log(`Avisando a ${client.playerId} que entró ${playerId}`);
                        }
                    });
                } else {
                    console.log(`La sala ${roomToJoin} no existe.`);
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
