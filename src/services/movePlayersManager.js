const io = require('socket.io-client');

var players = []

const utils = require('../lib/utils')

;
(function() {

	let socket = io.connect('ws://localhost:8080');

	socket.once('connect', function() {
		socket.emit('movePlayersManager')
		socket.on('new-player', (data) => {
			console.log('player registered', JSON.stringify(data))
			players.pushIfNotExist({
				id: data.id,
				nickname: data.nickname,
				px: utils.getRandomInt(0, 30),
				py: utils.getRandomInt(0, 30),
			}, el => el.nickname == data.nickname)
		})
		socket.on('disconnect-player', (playerId) => {
			console.log('disconnect-player', playerId)
			players = players.filter(player => player.id !== playerId)
		})
		socket.on('move-player', (data) => {
			console.log('move-player', data)
			let mv = {
				x: 0,
				y: 0,
			};
			switch (data.direction) {
				case 'left':
					mv.x -= 1
					break;
				case 'right':
					mv.x += 1
					break;
				case 'up':
					mv.y -= 1
					break;
				case 'down':
					mv.y += 1
					break;
			}
			let pl = players.find(player => player.id == data.player.id);
			let op = players.find(player => (player.px == pl.px + mv.x && player.py == pl.py + mv.y))
			if (typeof op === 'undefined' && pl.px + mv.x < 30 && pl.py + mv.y < 30) {
				pl.px += mv.x
				pl.py += mv.y
				data.oldPlayer = data.player
				data.player = pl
				socket.emit('player-moved', data)
			} else {
				socket.emit('cannot-move', data)
			}
		})
		socket.on('same-room-player', (data) => {
			console.log('same room', data)
			let playerInSame = players.filter(player => player.room === data.player.room && player.id !== data.player.id)
			data.playerInSameRoom = playerInSame
			socket.emit('same-room-player', data)
		})
		socket.on('same-room', (data) => {
			console.log('same room', data)
			let playerInSame = players.filter(player => player.room === data.bomb.room)
			data.playerInSameRoom = playerInSame
			socket.emit('same-room', data)
		})
		socket.on('start-position', (data) => {
			console.log('start-position', data)
			let pl = players.find(player => player.id == data.playerId);
			pl.room = data.resultRoom.name
			let playerInSame = players.filter(player => player.room === pl.room && player.id !== pl.id)
			data.player = pl
			data.playerInSameRoom = playerInSame
			socket.emit('start-position', data)
		})
		socket.on('check-bomb-dead', (data) => {
			console.log(data)
			let deadplayers = data.playerInSameRoom.filter(player => (player.px === data.bomb.px && player.py === data.bomb.py ||
					player.px === data.bomb.px + 1 && player.py === data.bomb.py ||
					player.px === data.bomb.px - 1 && player.py === data.bomb.py) ||
				player.px === data.bomb.px && player.py === data.bomb.py + 1 ||
				player.px === data.bomb.px && player.py === data.bomb.py - 1 ||
				player.px === data.bomb.px + 1 && player.py === data.bomb.py + 1 ||
				player.px === data.bomb.px - 1 && player.py === data.bomb.py - 1 ||
				player.px === data.bomb.px + 1 && player.py === data.bomb.py - 1 ||
				player.px === data.bomb.px - 1 && player.py === data.bomb.py + 1) || []
			console.log('DEADPLAYER', deadplayers)
			data.deadplayers = deadplayers
			socket.emit('check-bomb-dead', data)
		})
	})
})()