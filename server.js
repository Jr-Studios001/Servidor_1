const WebSocket = require('ws');

const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

server.on('connection', (socket) => {
    const playerId = "user_" + Math.random().toString(36).substring(2, 6);
    console.log('Jugador conectado: ' + playerId);
    
    socket.send(JSON.stringify({
        "cmd": "id_assigned",
        "id": playerId
    }));
    
    socket.on('message', (data) => {
        // Reenvía el mensaje de movimiento a los demás
        server.clients.forEach(client => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });

    socket.on('close', () => {
        console.log('Jugador desconectado');
    });
});

console.log('Servidor WebSocket corriendo en puerto 8080 v1');
