import { reactive } from 'vue'

const RIPPLES = [
  [
    ['words with white', 'elephant', 'egg', 'flag'],
    ['say something you shouldn’t', 'rat', 'lie'],
    ['uncool', 'out'],
    'nest',
  ],
  [
    ['verb', 'lose', 'seem', 'took'], // outer circle
    ['noun', 'does', 'spat'], // middle circle
    ['adjective', 'still'], // inner circle
    'and', // outlier
  ],
  [
    ['three letter body parts', 'arm', 'eye', 'toe'],
    ['talk, with sauce', 'jaw', 'lip'],
    ['food, with sauce', 'rib'],
    'knee',
  ],
  [
    ['onomatopoeia', 'moo', 'splash', 'burp'],
    ['website verbs', 'tweet', 'yelp'],
    ['lose it', 'snap'],
    'sheep',
  ],
  [
    ['words with bar', 'mini', 'hot', 'code'],
    ['creepy movies with The', 'fly', 'crow'],
    ['cafeteria chant', 'fight'],
    'bat',
  ],
  [
    ['what a superhero might be known for', 'telepathy', 'invisibility', 'shapeshifting'],
    ['possible response to danger', 'flying', ' fighting'],
    ['concern for a zoom meeting', 'freezing'],
    'melting',
  ],
]

// Day Five
// R = lose, seem, took
// Q = does, spat
// P = still
// O = and

function assignRipple(words) {
  switch (words.length) {
    case 3:
      return 'outer'
    case 2:
      return 'middle'
    case 1:
      return 'inner'
  }
}

let gencoords = (function* () {
  let theta = 0
  let buffer = 10
  while (true) {
    let radians = (theta * Math.PI) / 180
    yield {
      theta,
      // giving 5% of buffer so they all fit inside the viewport... just a guess
      x: Math.min(100 - buffer, Math.max(buffer, (Math.cos(radians) + 1) * 50)),
      y: Math.min(100 - buffer, Math.max(buffer, (Math.sin(radians) + 1) * 50)),
    }
    // leave room for the instructions in the bottom right
    do {
      theta += 45
    } while (theta % 360 > 0 && theta % 360 < 90)
  }
})()

let ripples = reactive([])
// let words = reactive([])
// let categories = reactive([])

for (let ripple of RIPPLES) {
  let [outer, middle, inner, pebble] = ripple

  let categories = []
  let words = [
    {
      placed: false,
      txt: pebble,
      category: 'outlier', // not really used, just potentially useful info
    },
  ]
  for (let ripple of [outer, middle, inner]) {
    let [category, ...ws] = ripple
    categories[ws.length] = category
    // console.debug(category, ws)
    let target = assignRipple(ws)
    for (let w of ws) {
      words.push({
        placed: false, // mixing user data with game data is probably going to turn out to be a bad choice later
        txt: w,
        category,
        ripple: target,
      })
    }
  }

  shuffle(words)
  for (let i in words) {
    Object.assign(words[i], gencoords.next().value)
  }

  ripples.push({
    words,
    categories,
    errors: 0,
  })
  // console.debug(words.map((w) => `${w.txt} ${w.theta}`))
}

export default ripples

// fisher-yates shuffle provided by co-pilot
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
