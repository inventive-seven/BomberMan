const io = require('socket.io-client');

var bombs = []

const utils = require('../lib/utils')

;
(function() {

	let socket = io.connect('ws://localhost:8080');

	socket.once('connect', function() {
		socket.emit('bombsManager')
		socket.on('add-bomb', (data) => {
			console.log('bomb added', JSON.stringify(data))
			let bomb = {
				px: data.player.px,
				py: data.player.py,
				timer: 5,
				room: data.player.room,
			}
			bombs.push(bomb)
			data.bombs = bombs
			socket.emit('bomb-added', data)
			setTimeout(() => {
				bombs.splice(bombs.indexOf(bomb, 1))
				let data = {
					bomb,
					bombs
				}
				socket.emit('bomb-exploison', data)
			}, 5000)
		})
		socket.on('get-bombs-room', (data) => {
			let bombsinroom = bombs.filter(b => b.room === data.player.room)
			data.bombsinroom = bombsinroom
			socket.emit('get-bombs-room', data)
		})
	})
})()