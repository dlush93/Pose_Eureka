const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io1 = require('socket.io')(server, { cors: { origin: "*" } });
const io2 = require("socket.io-client");
const fs = require('fs');

const PORT = 5000;
var r1 = [];
var r2 = [];
var r3 = [];

app.use(express.static('public'));

app.get('/', function(req, res){
    fs.readFile('./views/main.html', (err, data) => {
        if(err) throw err;

        res.writeHead(200, {
            'Content-Type' : 'text/html'
        })
        .write(data)
    });
});

io1.sockets.on('connection', function(socket){
    socket.on('newUserConnect', function(name){
        socket.name = name;

        io1.sockets.emit('updateMessage', {
            name : 'SERVER',
            message : name + '님이 접속했습니다.'
        });
    });

    socket.on('disconnect', function(){
        io1.sockets.emit('updateMessage', {
            name : 'SERVER',
            message : socket.name + '님이 퇴장했습니다.'
        });
    });

    socket.on('sendMessage', function(data){
        data.name = socket.name;
        io1.sockets.emit('updateMessage', data);
    });
});

app.get('/room_1', (req, res) => {
    // res.render('index');
    res.sendFile(__dirname + '/views/room_1.html');
});
app.get('/room_2', (req, res) => {
    res.sendFile(__dirname + '/views/room_2.html');
});
app.get('/room_3', (req, res) => {
    res.sendFile(__dirname + '/views/room_3.html');
});
app.get('/gameDemo', (req, res) => {
    res.sendFile(__dirname + '/views/jsEmulator.html');
});
app.all('*', (req, res) => {
    res.status(404).send('resource not found');
});

// 'http://172.22.77.5:3000'
// 'http://192.168.43.146:3000'
const game_server1 = 'http://192.168.0.7:3000';
var socket1 = io2.connect(game_server1);  // raspberry server 1
socket1.on('connect', function () {
    console.log('game server connected to host server');
    socket1.emit('message', 'connected to HostServer');
});
socket1.on('screen', (imgStr) => {
    rooms.to('room_1').emit('screen', imgStr);
});
socket1.on('disconnect', function() {
    console.log('game server connection lost');
});


setRoom = (skt1, room, arr, skt2) => {
    skt1.on('connection', (socket) => {
        console.log(socket.id + ' entered ' + room);

        if(arr.length > 1){
            socket.emit('forceDisconnect');
            console.log('forceDisconnect - ' + socket.id);
        }else{
            arr.push(socket.id);console.log(room + " : ", arr);
            socket.join(room);
    
            socket.on('cmd', (data) => {
                console.log(data);
                
                p_id = r1.indexOf(socket.id)+1
                skt2.emit('cmd', "p" + p_id + "_" + data);  // pass command to game server (raspberry)
                // skt1.to(room).emit('message', 'server reply to ' + room);  // acknowledgement
                // socket.emit('message', 'server reply to ' + room);  // bck to clinet requested
            });

            socket.on('start_stream', () => {
                skt2.emit('start_stream');
            });
        
            socket.on('disconnect', () => {
                console.log(socket.id + ' left ' + room);
                skt1.to(room).emit('userLeft', socket.id + ' left');  // broadcast everyone in the room

                socket.leave(room);

                let i = arr.indexOf(socket);
                arr.splice(i, 1);

                if(arr.length == 0){
                    skt2.emit('stop_stream');
                }
            });
        }
    });
}

const rooms = io1.of('/room_1');
setRoom(rooms, 'room_1', r1, socket1);
// const room2 = io1.of('/room_2');
// setRoom(room2, 'room_2', r2);
// const room3 = io1.of('/room_3');
// setRoom(room3, 'room_3', r3);



server.listen(PORT, () => {
    console.log('server listening on port '+ PORT);
});