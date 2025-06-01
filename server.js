const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
    console.log('Jugador conectado');

    socket.on('message', (data) => {
        console.log(`Mensaje recibido: ${data}`);
        // Reenviar el mensaje a todos los clientes conectados
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
