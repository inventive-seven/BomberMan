const io = require('socket.io-client');

var rooms = [{
	name: 'test_room',
	playersIn: [],
	playersMax: 4,
}]

const utils = require('../lib/utils')

;
(function() {

	let socket = io.connect('ws://localhost:8080');

	socket.once('connect', function() {
		socket.emit('roomsManager')
		socket.on('new-room', (data) => {
			console.log('room added', JSON.stringify(data))
			rooms.push({
				name: data.name,
				playersIn: [],
				playersMax: 4
			})
			socket.emit('room-added', {
				name: data.name,
				id: data.id,
				rooms: rooms,
			})
		})
		socket.on('delete-room', (data) => {
			rooms = rooms.filter(room => room.name !== data.name)
		})
		socket.on('get-rooms', (data) => {
			console.log('get rooms', data)
			socket.emit('rooms-list', {
				id: data,
				rooms: rooms
			})
		})
		socket.on('join-room', (data) => {
			let roomisfull = false
			let resultRoom
			rooms = rooms.map(room => {
				if (room.name === data.room) {
					if (room.playersIn.length < room.playersMax) {
						room.playersIn.push(data.nickname)
						resultRoom = room
					} else {
						roomisfull = true;
					}
				}
				return room
			})
			if (roomisfull) {
				socket.emit('room-is-full', data)
			} else {
				console.log(`player ${data.nickname} joined room ${data.room}`, data)
				socket.emit('joined-room', {
					newRooms: rooms,
					resultRoom:resultRoom,
					playerId: data.playerId,
					nickname: data.nickname,
				});
			}
		})
	})
})()