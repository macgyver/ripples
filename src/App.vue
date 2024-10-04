<script setup>
import { ref, computed, useTemplateRef, onMounted } from 'vue'
import ripples from './ripples.js'

let outerEl = useTemplateRef('outer')
let middleEl = useTemplateRef('middle')
let innerEl = useTemplateRef('inner')

let wordsEls = useTemplateRef('words-els')

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
  let theta = 90
  while (true) {
    let radians = (theta * Math.PI) / 180
    yield {
      theta,
      x: (Math.cos(radians) + 1) * 45, // giving 5% of buffer so they all fit inside the viewport... just a guess
      y: (Math.sin(radians) + 1) * 45
    }
    // leave room for the insturciotns..
    do {
      theta += 45
    } while (theta % 360 > 0 && theta % 360 < 90)
  }
})()

let [outer, middle, inner, pebble] = ripples
let words = [
  {
    // the pebble is "placed" correctly because it's target is the "hole" outside the ripples where all words start
    placed: true,
    txt: pebble,
    ...gencoords.next().value
  }
]
let categories = []
for (let ripple of [outer, inner, middle]) {
  let [category, ...ws] = ripple
  categories[ws.length] = category
  let targetEl = findRipple(ws)
  for (let w of ws) {
    words.push({
      placed: false,
      txt: w,
      category,
      targetEl,
      ...gencoords.next().value
    })
  }
}

let selectedWord = ref(null)
let incorrectNum = ref(0)

function toggleWord(word) {
  selectedWord.value = word
}

function throwWord(e) {
  if (!selectedWord.value) return

  let selectedRipple = e.currentTarget
  if (selectedWord.value.targetEl === selectedRipple) {
    selectedWord.value.x = (e.clientX / window.innerWidth) * 100
    selectedWord.value.y = (e.clientY / window.innerHeight) * 100

    selectedWord.value.placed = true
    // if (
  } else {
    incorrectNum.value += 1
  }
  selectedWord.value.nope = true
  setTimeout(() => {
    selectedWord.value.nope = false
    selectedWord.value = null
  }, 500)
}
</script>

<template>
  <main class="board">
    <!-- <div class="ripple-container" ref="outer"> -->
    <div tabindex="0" class="outer ripple" ref="outer" @click="throwWord"></div>
    <!-- </div> -->
    <!-- <div class="rippple-container" ref="middle"> -->
    <div tabindex="0" class="middle ripple" ref="middle" @click="throwWord"></div>
    <!-- </div> -->
    <!-- <div class="rippple-container" ref="inner"> -->
    <div tabindex="0" class="inner ripple" ref="inner" @click="throwWord"></div>
    <!-- </div> -->
    <button
      class="word"
      v-for="(word, i) in words"
      :key="word.txt"
      ref="words-els"
      :style="{ top: `${word.y}%`, left: `${word.x}%` }"
      :class="{ selected: selectedWord?.txt === word.txt, nope: word.nope }"
      @click="toggleWord(word)"
      :title="`${i}. ${word.theta}°, (${word.x}, ${word.y}`"
      :data-theta="word.theta"
    >
      {{ word.txt }}
    </button>

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
  </main>
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

  &:hover,
  &:focus-visible {
    outline: none;
    background: cyan;
  }

  // todo: should be like an archery target, do some like. geometry or trig or whatever
  &.middle {
    width: min(35vw, 35vh);
    // translate: 50% 0;
  }

  &.inner {
    width: min(15vw, 15vh);
    // translate: 115% 0;
  }
}

.word {
  border: 1px solid var(--fg-color);
  padding: 0.5em 0.7em;
  perspective: 1000px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transform-origin: 50% 50%;
  position: absolute;
  transition: all 0.3s;

  &.selected {
    background: cyan;
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
