const io = require('socket.io-client');

var players = []

const utils = require('../lib/utils')

;
(function() {

	let socket = io.connect('ws://localhost:8080');

	socket.once('connect', function() {
		socket.emit('playersManager')
		socket.on('new-player', (data) => {
			console.log('player added', JSON.stringify(data))
			players.pushIfNotExist({
				id: data.id,
				nickname: data.nickname
			}, el => el.nickname == data.nickname)
			socket.emit('player-added', {
				id: data.id,
				nickname: data.nickname
			})
		})
		socket.on('disconnect-player', (playerId) => {
			console.log('disconnect-player', playerId)
			players = players.filter(player => player.id !== playerId)
		})
	})
})()