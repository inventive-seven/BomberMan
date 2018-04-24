const express = require('express')
const http = require('http')
const path = require('path')
const wsio = require('socket.io')
const logger = require('log-js')()
const utils = require('./lib/utils')

var app = express()
var server = http.Server(app)

var wsServer = wsio(server)

wsServer.clients = {}

app.use(require('body-parser')())

app.use('/scripts', express.static(__dirname + '/public/scripts'))

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, 'public', 'index.html'))
});

app.get('/resources/background.mp3', function(request, response) {
	response.sendFile(path.join(__dirname, 'public', 'resources', 'background.mp3'))
})

wsServer.on('connection', function connection(wsClient) {
	let clientId = utils.genId(wsClient.id)
	wsServer.clients[clientId] = wsClient

	console.log('client connected with id = ', clientId)
	wsClient.emit('client-auth', clientId)

	wsClient.on('playersManager', () => {
		wsServer.playersManager = wsClient
		console.log('playersManager connected', wsClient.id)
	})
	wsClient.on('movePlayersManager', () => {
		wsServer.movePlayersManager = wsClient
		console.log('movePlayersManager connected', wsClient.id)
	})
	wsClient.on('bombsManager', () => {
		wsServer.bombsManager = wsClient
		console.log('bombsManager connected', wsClient.id)
		wsServer.bombsManager.on('bomb-exploison', (data) => {
			console.log('VZRIV', data)
			wsServer.movePlayersManager.emit('same-room', data)
			wsServer.movePlayersManager.on('same-room', data => {
				wsServer.movePlayersManager.emit('check-bomb-dead', data)
				wsServer.movePlayersManager.on('check-bomb-dead', data => {
					data.playerInSameRoom.forEach(plInSameRoom => {
						wsServer.clients[plInSameRoom.id].emit('bomb-exploison', data)
						data.deadplayers.forEach(deadplayer => {
							data.player = deadplayer
							wsServer.clients[plInSameRoom.id].emit('dead', data)
						})
					})
				})
			})
		})
	})
	wsClient.on('roomsManager', () => {
		wsServer.roomsManager = wsClient
		console.log('roomsManager connected', wsClient.id)
	})
	wsClient.once(`client-ready${clientId}`, (playerId) => {
		wsServer.clients[playerId].once('new-player', (data) => {
			if (utils.isValidCredentials(data.id, data.nickname)) {
				wsServer.playersManager.emit('new-player', data)

				wsServer.playersManager.once('player-added', (addedPlayer) => {
					wsServer.clients[addedPlayer.id].emit(`ready-to-play${addedPlayer.id}`)
					wsServer.movePlayersManager.emit('new-player', addedPlayer)

					wsServer.clients[addedPlayer.id].once('client-disconnect', (clientIdDisconnected) => {
						console.log('client-disconnect', clientIdDisconnected)
						wsServer.playersManager.emit('disconnect-player', clientIdDisconnected)
						delete wsServer.clients[clientIdDisconnected]
					})
				})
			} else {
				wsServer.clients[data.id].emit('invalid-nickname')
			}
		})

		wsServer.clients[playerId].once('get-rooms', (data) => {
			console.log('get-rooms', data)
			wsServer.roomsManager.emit('get-rooms', data.id)
			wsServer.roomsManager.once('rooms-list', roomsData => {
				console.log('rooms-list', roomsData.id)
				wsServer.clients[roomsData.id].emit('rooms-list', roomsData)
			})
		})
		wsServer.clients[playerId].once('join-room', (data) => {
			console.log('join-room', data)
			wsServer.roomsManager.emit('join-room', data)
			wsServer.roomsManager.once('joined-room', roomData => {
				console.log('joined-room', roomData)
				wsServer.movePlayersManager.emit('start-position', roomData)
				wsServer.movePlayersManager.once('start-position', (data) => {
					console.log('start-position', data)
					wsServer.bombsManager.emit('get-bombs-room', data)
					wsServer.bombsManager.on('get-bombs-room', (data) => {
						wsServer.clients[data.player.id].emit('joined-room', data)
						data.playerInSameRoom.forEach(plInSameRoom => {
							console.log('player in the same room', plInSameRoom)
							wsServer.clients[plInSameRoom.id].emit('player-moved', {
								player: data.player
							})
						})
					})
				})
			})
			wsServer.roomsManager.once('room-is-full', roomData => {
				console.log('room-is-full', roomData)
				wsServer.clients[roomData.playerId].emit('room-is-full', roomData)
			})
		})
		wsServer.clients[playerId].once('new-room', data => {
			console.log('new-room', data)
			if (utils.isValidCredentials(data.id, data.name)) {
				wsServer.roomsManager.emit('new-room', data)
				wsServer.roomsManager.once('room-added', newRoom => {
					console.log('room-added', newRoom)
					let broadcastData = {
						object: newRoom.rooms,
						action: 'room-created'
					}
					wsServer.broadcast(broadcastData)
				})
			}
		})
		wsServer.clients[playerId].on('move-player', data => {
			console.log('move-player', data)
			wsServer.movePlayersManager.emit('move-player', data)
			wsServer.movePlayersManager.once('player-moved', data => {
				console.log('player-moved', data)
				//wsServer.clients[data.player.id].emit('player-moved', data)
				let broadcastData = {
					object: data,
					action: 'player-moved'
				}
				wsServer.broadcast(broadcastData)
			})
		})
		wsServer.clients[playerId].on('add-bomb', data => {
			console.log('add-bomb', data)
			wsServer.bombsManager.emit('add-bomb', data)
			wsServer.bombsManager.on('bomb-added', (data) => {
				wsServer.movePlayersManager.emit('same-room-player', data)
				wsServer.movePlayersManager.on('same-room-player', (data) => {
					wsServer.clients[data.player.id].emit('bomb-added', data)
					data.playerInSameRoom.forEach(plInSameRoom => {
						console.log('player in the same room', plInSameRoom)
						wsServer.clients[plInSameRoom.id].emit('bomb-added', data)
					})
				})
			})
		})
	})
})


wsServer.broadcast = (data) => {
	Object.keys(wsServer.clients).forEach(clientId => {
		if (wsServer.clients[clientId].readyState === wsio.OPEN) {
			if (!data.action)
				wsServer.clients[clientId].socket.send(data);
			else {
				wsServer.clients[clientId].emit(data.action, data.object);
			}
		}
	});
};
server.listen(8080, function() {
	console.log('Starting server on port ' + 8080);
})