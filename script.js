const c = document.getElementById("c")
c.width = c.height = 0
const ctx = c.getContext("2d")
let kante, intervalID
let running = 0
let requested = 0
function triggerFileUpload() {
 let fileInput = document.getElementById("fileUpload")
 fileInput.value = null
 fileInput.click()
}
document.getElementById("fileUpload").addEventListener("change", function (event) {
 if (event.target.files[0]) {
  let reader = new FileReader()
  reader.onload = function (e) {
   let [n, playerPos, walls, doorPos, fires] = readStr(e.target.result)
   kante = n
   running = 0
   clearInterval(intervalID)
   main(playerPos, walls, doorPos, fires)
  }
  reader.readAsText(event.target.files[0])
 }
})
function readStr(inStr) {
 let [n, ...map] = inStr.replace(/\r/g, "").split("\n")
 n = +n
 let [playerPos, walls, doorPos, fires] = [[], [], [], []]
 for (let x = 0; x < n; x++) {
  for (let y = 0; y < n; y++) {
   if (map[x] && map[x][y]) {
    if (/[D,d]/.test(map[x][y])) {
     doorPos.push([x, y])
    }
    if (/[P,p]/.test(map[x][y])) {
     playerPos.push([x, y])
    }
    if (/[W,w]/.test(map[x][y])) {
     walls.push([x, y])
    }
    if (/[F,f]/.test(map[x][y])) {
     fires.push([x, y])
    }
   }
  }
 }
 return [n, playerPos, walls, doorPos, fires]
}
let env = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, 1], [1, -1], [-1, -1], [-1, 1]]
let check = [[0], [1], [2], [3], [4, 2, 1], [5, 1, 0], [6, 0, 3], [7, 3, 2]]
function cord(x, y) {
 if (x >= kante) x -= kante
 if (y >= kante) y -= kante
 if (y < 0) y += kante
 if (x < 0) x += kante
 return y * kante + x
}
let posRich = (pos, rich) => cord((pos % kante) + env[rich][0], (~~(pos / kante)) + env[rich][1])
let walkable = posDes => +!(posDes & 13)
function vis(map) {
 let ref = [".", "P", "D", "B", "W", , , , "F"]//P: Player, D: door, B: both, W: wall, F: fire
 let out = kante + "\n"
 for (let x = 0; x < kante; x++) {
  for (let y = 0; y < kante; y++) {
   out += ref[map[cord(x, y)]]
  }
  out += "\n"
 }
 return out
}
function draw(map) {
 let pixSize = Math.max(~~(Math.min(window.innerWidth, window.innerHeight) / kante / 1.2), 1)
 let colors = [,
  [255, 150, 50],//yellow -> Person
  [0, 255, 0], ,//green -> door
  [127, 127, 127], , , ,//grey -> wall
  [255, 0, 0]//red -> fire
 ]
 c.width = c.height = Math.max(kante, 1) * pixSize
 let newC = typeof OffscreenCanvas !== "undefined"? new OffscreenCanvas(c.width, c.height) : document.createElement("canvas")
 newC.width = c.width
 newC.height = c.height
 let newCtx = newC.getContext("2d")
 let dark = window.matchMedia("(prefers-color-scheme: dark)").matches
 newCtx.fillStyle = dark ? "black" : "white"
 newCtx.fillRect(0, 0, c.width, c.height)
 for (let pos = 0; pos < map.length; pos++) {
  let col = colors[map[pos]]
  if (col) {
   newCtx.fillStyle = `rgb(${col[0]} ${col[1]} ${col[2]})`
   newCtx.fillRect((~~(pos / kante)) * pixSize, (pos % kante) * pixSize, pixSize, pixSize)
  }
 }
 ctx.drawImage(newC, 0, 0)
 document.getElementById("result").textContent = vis(map)
 requested = 0
}
function getDis(map) {
 let changed = []
 let dis = Array(kante ** 2).fill(1 / 0)
 let done = Array(kante ** 2).fill(0)
 for (let i = 0; i < map.length; i++) {
  if (map[i] == 2) {
   changed.push(i)
   dis[i] = 0
   done[i] = 1
  }
 }
 let time = 0
 while (changed.length > 0) {
  time++
  let nextChanged = []
  for (let i = 0; i < changed.length; i++) {
   for (let j = 0; j < 8; j++) {
    let newPos = posRich(changed[i], j)
    let possible = 1
    for (let l = 0; l < check[j].length; l++) {
     possible &= !(map[posRich(changed[i], check[j][l])] & 4)
    }
    if (!done[newPos] && possible) {
     done[newPos] = 1
     nextChanged.push(newPos)
     dis[newPos] = time
    }
   }
  }
  changed = nextChanged
 }
 return dis
}
function toggleSim() {
 if (running) {
  running = 0
  clearInterval(intervalID)
 } else {
  let [n, playerPos, walls, doorPos, fires] = readStr(document.getElementById("result").innerText)
  kante = n
  main(playerPos, walls, doorPos, fires)
 }
}
function main(playerPos, walls, doorPos, fires) {
 let dead = 0
 let saved = 0
 let map = Array(kante ** 2).fill(0)
 for (let i = 0; i < playerPos.length; i++) {
  map[playerPos[i] = cord(...playerPos[i])] |= 1
 }
 for (let i = 0; i < doorPos.length; i++) {
  map[cord(...doorPos[i])] |= 2
 }
 for (let i = 0; i < walls.length; i++) {
  map[cord(...walls[i])] |= 4
 }
 for (let i = 0; i < fires.length; i++) {
  map[fires[i] = cord(...fires[i])] |= 8
 }
 let disMap = getDis(map)
 running = 1
 document.getElementById("result").textContent = vis(map)
 draw(map)
 intervalID = setInterval(() => {
  let nextFires = []
  for (let i = 0; i < fires.length; i++) {
   let newFire = []
   for (let j = 0; j < 4; j++) {
    let newPos = posRich(fires[i], j)
    if (!(map[newPos] & 8)) {
     if (!(map[newPos] & 4) || (Math.random() > 0.9)) {
      newFire.push(newPos)
     }
    }
   }
   if (newFire.length && Math.random() > 0.9) {
    let spawnFire = newFire[~~(Math.random() * newFire.length)]
    if (map[spawnFire] & 1) {
     dead++
    }
    map[spawnFire] = 8
    nextFires.push(spawnFire)
   }
   if (newFire.length) {
    nextFires.push(fires[i])
   }
  }
  fires = nextFires
  let nextPlayers = []
  for (let i = 0; i < playerPos.length; i++) {
   if (!(map[playerPos[i]] & 1)) {
    continue
   }
   let pos = playerPos[i]
   let minDis = disMap[pos] + 1
   let nextPos = []
   for (let i = 0; i < 8; i++) {
    let newPos = posRich(pos, i)
    let possible = 1
    for (let j = 0; j < check[i].length; j++) {
     possible &= walkable(map[posRich(pos, check[i][j])])
    }
    if (possible && disMap[newPos] < minDis) {
     minDis = disMap[newPos]
     nextPos = [newPos]
    } else if (possible && disMap[newPos] == minDis) {
     nextPos.push(newPos)
    }
   }
   if (nextPos.length) {
    nextPos = nextPos[~~(Math.random() * nextPos.length)]
    map[nextPos] |= 1
    map[pos] ^= 1
    playerPos[i] = nextPos
    if (map[playerPos[i]] & 2) {
     map[playerPos[i]] ^= 1
     saved++
    }
   }
   if (map[playerPos[i]] & 1) {
    nextPlayers.push(playerPos[i])
   }
  }
  playerPos = nextPlayers
  document.getElementById("stats").textContent = `fliehend: ${playerPos.length}; tod: ${dead}; gerettet: ${saved}`
  if (!requested) {
   requested = 1
   requestAnimationFrame(() => draw(map))
  }
  if (!playerPos.length) {
   running = 0
   clearInterval(intervalID)
  }
 }, 100)

}

