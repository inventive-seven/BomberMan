var app = new Vue({
  data: function() {
    return {
      test: 'test',
      active: null,
      nickname: null,
      name: null,
      playerId: null,
      rooms: [],
      socket: null,
      roomname: null,
      notInRoom: true,
      canvas: null,
      player: null,
      bombs: [],
    }
  },
  methods: {
    submitNickname: function(name) {
      this.nickname = name
      this.socket.emit('new-player', {
        id: this.playerId,
        nickname: this.nickname,
      })
    },
    plantBomb: function(player) {
      this.socket.emit('add-bomb', {
        player
      })
    },
    drawBomb: function(bomb) {
      var centerX = 10;
      var centerY = 10;
      var radius = 6;
      this.canvas.provider.beginPath();
      this.canvas.provider.arc(centerX + bomb.px * 20, centerY + bomb.py * 20, radius, 0, 2 * Math.PI, false);
      this.canvas.provider.fillStyle = 'red';
      this.canvas.provider.fill();
      this.canvas.provider.lineWidth = 5;
      this.canvas.provider.strokeStyle = '#003300';
      this.canvas.provider.stroke();
    },
    selectRoom: function(index, room) {
      if (!this.rooms[index].selected)
        Vue.set(this.rooms[index], 'selected', true)
      else
        Vue.set(this.rooms[index], 'selected', false)
      //this.rooms[index].selected = true
    },
    drawPlayer: function(player) {
      let pl = player || this.player
      this.canvas.provider.fillStyle = 'white';
      this.canvas.provider.fillRect(pl.px * 20, pl.py * 20, 20, 20);
    },
    clearPlayer: function(data) {
      console.log(data)
      this.canvas.provider.fillStyle = 'gray'
      this.canvas.provider.fillRect(data.player.px * 20, data.player.py * 20, 20, 20)
      if (data.player)
        if (this.player.id == data.player.id) {
          this.player = null
          alert('you are dead')
        }
    },
    clearBomb: function(data) {
      this.canvas.provider.fillStyle = 'gray'
      this.canvas.provider.fillRect(data.bomb.px * 20, data.bomb.py * 20, 20, 20)
    },
    redrawPlayer: function(data) {
      if (data.oldPlayer) {
        let bombhere = this.bombs.filter(b => b.px === data.oldPlayer.px && b.py === data.oldPlayer.py)
        if (bombhere.length > 0)
          bombhere = bombhere[0]
        if (bombhere) {
          this.canvas.provider.fillStyle = 'gray'
          this.canvas.provider.fillRect(data.oldPlayer.px * 20, data.oldPlayer.py * 20, 20, 20)
          var centerX = 10;
          var centerY = 10;
          var radius = 6;

          this.canvas.provider.beginPath();
          this.canvas.provider.arc(centerX + bombhere.px * 20, centerY + bombhere.py * 20, radius, 0, 2 * Math.PI, false);
          this.canvas.provider.fillStyle = 'red';
          this.canvas.provider.fill();
          this.canvas.provider.lineWidth = 5;
          this.canvas.provider.strokeStyle = '#003300';
          this.canvas.provider.stroke();

        } else {
          this.canvas.provider.fillStyle = 'gray'
          this.canvas.provider.fillRect(data.oldPlayer.px * 20, data.oldPlayer.py * 20, 20, 20)
        }
      }
      if (this.player)
        if (data.player.id == this.player.id)
          this.player = data.player
      this.canvas.provider.fillStyle = 'white'
      this.canvas.provider.fillRect(data.player.px * 20, data.player.py * 20, 20, 20)
    },
    movePlayer: function(direction) {
      let data = {
        player: this.player,
        direction: direction
      }
      console.log('move-player', data)
      this.socket.emit('move-player', data)
    },
    keymonitor: function(event) {
      alert(event)
      console.log(event.key)
    },
    menuButton: function(roomname) {
      let selectedRoom = this.rooms.filter(room => room.selected)
      if (selectedRoom.length > 0) {
        this.socket.emit('join-room', {
          room: selectedRoom[0].name,
          playerId: this.playerId,
          nickname: this.nickname,
        })
      } else if (roomname) {
        this.socket.emit('new-room', {
          id: this.playerId,
          name: roomname,
        })
      }
    },
    initCanvas: function() {
      let self = this
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          self.canvas = document.getElementById('canvas')
          self.canvas.provider = self.canvas.getContext('2d')
          self.canvas.provider.fillStyle = 'gray'
          self.canvas.provider.clearRect(0, 0, canvas.width, canvas.height)
          resolve(true)
        }, 1000)
      })
    }
  },
  created: function() {
    this.socket = io.connect('ws://localhost:8080', {
      resource: 'api'
    })
    this.socket.on('connect', () => {
      this.socket.on('client-auth', (id) => {
        this.playerId = id
        console.log('Connected and authed me is ', this.playerId)
        this.socket.emit(`client-ready${this.playerId}`, this.playerId)

        this.socket.on(`ready-to-play${this.playerId}`, () => {

          this.socket.emit('get-rooms', {
            id: this.playerId
          })

          this.socket.on('room-is-full', (data) => {
            console.log('room-is-full', data)
            alert(`${data.room} is already full please choose another room to plant some bombs`)
          })
          this.socket.on('rooms-list', (data) => {
            console.log('room-list', data)
            this.rooms = data.rooms
          })
          this.socket.on('room-created', (data) => {
            console.log('room-created', data)
            this.rooms = data
          })
          this.socket.on('player-moved', (data) => {
            console.log('player-moved', data)
            this.redrawPlayer(data)
          })
          this.socket.on('joined-room', data => {
            console.log('joined-room', data)
            this.rooms = data.rooms
            if (data.player.id) {
              this.player = data.player
              this.notInRoom = false
              this.bombs = data.bombsinroom
              this.initCanvas()
                .then(() => {
                  this.drawPlayer()
                  data.playerInSameRoom.map(this.drawPlayer)
                  data.bombsinroom.map(this.drawBomb)
                })
            }
          })
          this.socket.on('bomb-added', (data) => {
            console.log(data)
            this.bombs = data.bombs
          })
          this.socket.on('bomb-exploison', (data) => {
            console.log(data)
            this.bombs = data.bombs
            this.clearBomb(data)
          })
          this.socket.on('dead', (data) => {
            this.clearPlayer(data)
          })
        })
      })
    })
    document.addEventListener('keydown', (e) => {
      let direction = null
      let valid = null
      switch (e.code) {
        case 'ArrowUp':
          valid = true
          direction = 'up';
          break;
        case 'ArrowDown':
          valid = true
          direction = 'down';
          break;
        case 'ArrowLeft':
          valid = true
          direction = 'left';
          break;
        case 'ArrowRight':
          valid = true
          direction = 'right';
          break;
        case 'Space':
          if (this.player) {
            this.plantBomb(this.player)
          }
          break;
      }
      if (valid && this.player)
        this.movePlayer(direction)
    })
    window.onbeforeunload = (evt) => {
      this.socket.emit('client-disconnect', this.playerId)
      this.socket.close()
    }
  },
  mounted: function() {},
  el: '#game'
})