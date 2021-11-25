const socket = io('http://localhost:5000/room_1');

window.onunload = window.onbeforeunload = function() {
    socket.close();
};

function emitCommand(cmd) {
    console.log(cmd);
    socket.emit('cmd', cmd);
}
function start_stream() {
    $('#stream').hide();
    socket.emit('start_stream');
}

socket.on('connect', () => {
    console.log('client connected to host server socket');
});

socket.on('screen', (imgStr) => {
    $('img').attr('src', 'data:image/png;base64,' + imgStr);
});

socket.on('forceDisconnect', () => {
    socket.disconnect();
    console.log('room is full... you are disconnected');
});

socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
    }
    // else the socket will automatically try to reconnect
});
