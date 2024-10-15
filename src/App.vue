<script setup>
import { toRaw, ref, reactive, computed, useTemplateRef, onMounted } from 'vue'
import ripples from './ripples.js'

let outerEl = useTemplateRef('outer-el')
let middleEl = useTemplateRef('middle-el')
let innerEl = useTemplateRef('inner-el')

let wordsEls = useTemplateRef('words-els')
let boardEl = useTemplateRef('board-el')

function findRipple(words) {
  switch (words.length) {
    case 3:
      return outerEl
    case 2:
      return middleEl
    case 1:
      return innerEl
  }
}
// Day Five
// R = lose, seem, took
// Q = does, spat
// P = still
// O = and

let gencoords = (function* () {
  let theta = 0
  let buffer = 10
  while (true) {
    let radians = (theta * Math.PI) / 180
    console.debug('yield theta', theta)
    yield {
      theta,
      // giving 5% of buffer so they all fit inside the viewport... just a guess
      x: Math.min(100 - buffer, Math.max(buffer, (Math.cos(radians) + 1) * 50)),
      y: Math.min(100 - buffer, Math.max(buffer, (Math.sin(radians) + 1) * 50))
    }
    // leave room for the instructions in the bottom right
    do {
      theta += 45
    } while (theta % 360 > 0 && theta % 360 < 90)
  }
})()

let [outer, middle, inner, pebble] = ripples
let words = reactive([
  {
    // the pebble is already "placed" correctly because it's target is the space outside the ripples, where all words start
    placed: true,
    txt: pebble
  }
])
let categories = []
for (let ripple of [outer, middle, inner]) {
  let [category, ...ws] = ripple
  categories[ws.length] = category
  let targetEl = findRipple(ws)
  for (let w of ws) {
    words.push({
      placed: false,
      txt: w,
      category,
      targetEl
    })
  }
}

shuffle(words)
for (let i in words) {
  Object.assign(words[i], gencoords.next().value)
}

console.debug(words.map((w) => `${w.txt} ${w.theta}`))

// fisher-yates shuffle provided by co-pilot
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

let selectedWord = ref(null)
let incorrectNum = ref(0)

function toggleWord(word) {
  if (selectedWord.value?.txt === word.txt) selectedWord.value = null
  else selectedWord.value = word
}

function placeWord(e) {
  if (!selectedWord.value) return
  let rect = boardEl.value.getBoundingClientRect()
  console.log(rect, e)
  selectedWord.value.x = ((e.clientX - rect.left) / rect.width) * 100
  selectedWord.value.y = ((e.clientY - rect.top) / rect.height) * 100
}

function tossWord(e) {
  console.debug('**drop', toRaw(selectedWord.value), e)
  if (!selectedWord.value) return

  let selectedRipple = e.target
  console.debug('selected', selectedRipple, 'target', selectedWord.value.targetEl)

  if (selectedRipple.matches('main.board')) {
    // place word but do not process any game logic, the word is just being arranged outside the ripples
    placeWord(e)
  } else if (selectedWord.value.targetEl === selectedRipple) {
    placeWord(e)
    selectedWord.value.placed = true
  } else {
    incorrectNum.value += 1
    selectedWord.value.nope = true
    setTimeout(() => {
      selectedWord.value.nope = false
      selectedWord.value = null
    }, 500)
  }
}

let dragoverRipple = ref(null)

function debug(e) {
  console.debug('**debug', e, dragoverRipple.value)
}
</script>

<template>
  <main
    class="board"
    @click="placeWord"
    ref="board-el"
    @drop="tossWord"
    @dragover.prevent
    @dragenter.prevent="dragoverRipple = null"
  >
    <div
      tabindex="0"
      class="outer ripple"
      :class="{ dragover: dragoverRipple === 'outer' }"
      ref="outer-el"
      @click.stop="tossWord"
      @drop="tossWord"
      @dragover.prevent
      @dragenter.stop="dragoverRipple = 'outer'"
      aria-label="outer ripple"
    ></div>
    <div
      tabindex="0"
      class="middle ripple"
      :class="{ dragover: dragoverRipple === 'middle' }"
      ref="middle-el"
      @click.stop="tossWord"
      @drop="tossWord"
      @dragover.prevent
      @dragenter.stop="dragoverRipple = 'middle'"
      aria-label="middle ripple"
    ></div>
    <div
      tabindex="0"
      class="inner ripple"
      :class="{ dragover: dragoverRipple === 'inner' }"
      ref="inner-el"
      @click.stop="tossWord"
      @drop="tossWord"
      @dragover.prevent
      @dragenter.stop="dragoverRipple = 'inner'"
      @Keyup.enter="todo"
      aria-label="inner ripple"
    ></div>
    <button
      class="word"
      v-for="(word, i) in words"
      :key="word.txt"
      ref="words-els"
      :style="{ top: `${word.y}%`, left: `${word.x}%` }"
      :class="{ selected: selectedWord?.txt === word.txt, nope: word.nope }"
      @click.stop="toggleWord(word)"
      :title="`${i}. ${word.theta}°, (${word.x}, ${word.y}`"
      :data-theta="word.theta"
      draggable="true"
      @dragstart="selectedWord = word"
      @dragend="dragoverRipple = null"
    >
      {{ word.txt }}
    </button>
  </main>
  <div class="legend">
    <ol reversed>
      <li>
        (outer circle, 3 words)
        <span class="hint" v-if="incorrectNum > 2">{{ categories[3] }}</span>
      </li>
      <li>
        (middle circle 2 words)
        <span class="hint" v-if="incorrectNum > 0">{{ categories[2] }}</span>
      </li>
      <li>
        (inner circle, 1 word)
        <span class="hint" v-if="incorrectNum > 1">{{ categories[1] }}</span>
      </li>
    </ol>

    <details class="instructions">
      <summary>
        <strong>instructions</strong>
      </summary>
      Each concentric circle is an increasingly specific category. Drag each word to the most
      general category it fits in. Only one word does not fit into any category. If you make a
      mistake, a category will be revealed. See how few mistakes you can make before you correctly
      categorize each word!
    </details>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.board {
  // background: lightgray;
  position: relative;
  // display: flex;
  // align-content: center;
  // justify-content: center;
  height: min(100vh, 100vw);
  width: min(100vh, 100vw);
  aspect-ratio: 1;
  gap: 1em;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

// .ripple-container {
//   position: absolute;
//   // grid-column: 2 / -2;
//   // grid-row: 2 / -2;
//   display: flex;
//   height: 100%;
//   width: 100%;

//   margin-top: -100%;
//   margin-left: -100%;
//   pointer-events: none;
// }

.ripple {
  // pointer-events: all;
  top: min(50vh, 50vw);
  left: min(50vh, 50vw);
  translate: -50% -50%;
  position: absolute;
  place-self: center;
  // position: absolute;
  border: 0.3em solid var(--fg-color);
  border-radius: 50%;
  width: min(60vh, 60vw);
  aspect-ratio: 1;
  background: var(--bg-color);
  // translate: 22% 0;

  #app:has(.word.selected) & {
    &:hover,
    &:focus-visible {
      cursor: pointer;
      outline: none;
      background: var(--active-bg-color);
    }
  }

  &.dragover {
    background: var(--active-bg-color);
  }

  &.outer {
    --active-bg-color: hsl(193.3, 100%, 55%);
    @media (prefers-color-scheme: dark) {
      --active-bg-color: midnightblue;
    }
  }

  // todo: should be like an archery target, do some like. geometry or trig or whatever
  &.middle {
    width: min(35vw, 35vh);
    // translate: 50% 0;
    --active-bg-color: hsl(193.3, 100%, 45%);
    @media (prefers-color-scheme: dark) {
      --active-bg-color: #141452;
    }
  }

  &.inner {
    width: min(15vw, 15vh);
    --active-bg-color: hsl(193.3, 100%, 35%);
    // translate: 115% 0;
    @media (prefers-color-scheme: dark) {
      --active-bg-color: #0e0e32;
    }
  }
}

.word {
  border: 1px solid var(--fg-color);
  background: var(--bg-color);
  color: var(--fg-color);
  padding: 0.5em 0.7em;
  perspective: 1000px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transform-origin: 50% 50%;
  position: absolute;
  transition: all 0.3s;
  transform: translate(-50%, -50%); // to center them on the click point
  font-size: 1.5em;

  &.selected {
    background: yellow;
    @media (prefers-color-scheme: dark) {
      background-color: #3f3f2c;
    }
  }

  &.nope {
    background: fuchsia;
  }

  // &::after {
  //   position: absolute;
  //   content: attr(title);
  //   background: lightgray;
  //   left: 100%;
  // }
}

@keyframes nope {
  0% {
    transform: rotateY(0deg);
  }

  40% {
    transform: rotateY(-45deg);
  }

  80% {
    transform: rotateY(45deg);
  }

  100% {
    transform: rotateY(0deg);
  }
}

.legend {
  padding: 1em;
  position: absolute;
  bottom: 2%;
  right: 2%;
  border: 2px solid gray;
  max-width: 35%;
  background: var(--bg-color);
  box-shadow: 0 4px 10px rgba(0, 0, 10, 0.5);
}

.hint {
  text-transform: uppercase;
}
</style>
