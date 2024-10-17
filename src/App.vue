<script setup>
import { nextTick, watch, toRaw, ref, computed, useTemplateRef } from 'vue'
import ripples from './ripples.js'

function ucfirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
function digitToWord(digit) {
  switch (digit) {
    case 0:
      return 'zero'
    case 1:
      return 'one'
    case 2:
      return 'two'
    case 3:
      return 'three'
    case 4:
      return 'four'
    case 5:
      return 'five'
    case 6:
      return 'six'
    case 7:
      return 'seven'
    case 8:
      return 'eight'
    case 9:
      return 'nine'
    default:
      throw new Error('digitToWord: digit must be between 0 and 9')
  }
}

let url = new URL(location.href)
let activeDay = ref(Number.parseInt(url.searchParams.get('day')) || 1)

let today = computed(() => ripples[activeDay.value - 1])
let words = computed(() => today.value?.words)
let categories = computed(() => today.value?.categories)
let incorrectNum = computed(() => today.value?.errors)

// for help debugging, i can't keep track of all the answers  in my head
watch(
  words,
  () => {
    if (!words.value) return
    let groups = toRaw(words.value).reduce((memo, curr) => {
      memo[curr.category] ??= []
      memo[curr.category].push(curr.txt)
      return memo
    }, {})
    let entries = Object.entries(groups).sort(([cat1, words1], [cat2, words2]) => {
      if (cat1 === 'outlier') return 1
      if (cat2 === 'outlier') return -1
      return words2.length - words1.length
    })
    for (let [key, value] of entries) {
      console.debug(`${key}:`, value)
    }
  },
  { immediate: true },
)

function goToDay(day) {
  activeDay.value = day
  // any other app state to reset?
}

window.addEventListener('popstate', (e) => {
  goToDay(e.state.day)
})

function go(day) {
  goToDay(day)
  history.pushState({ day }, '', `?day=${day}`)
}

let outerEl = useTemplateRef('outer-el')
let middleEl = useTemplateRef('middle-el')
let innerEl = useTemplateRef('inner-el')
let outlierEl = useTemplateRef('outlier-el')

let wordsEls = useTemplateRef('words-els')
let boardEl = useTemplateRef('board-el')

function findTargetElement(word) {
  switch (word.ripple) {
    case 'inner':
      return innerEl.value
    case 'middle':
      return middleEl.value
    case 'outer':
      return outerEl.value
    default:
      return outlierEl.value
  }
}

let selectedWord = ref(null)

function toggleWord(word) {
  if (selectedWord.value?.txt === word.txt) selectedWord.value = null
  else selectedWord.value = word
}

function placeWord(e) {
  if (!selectedWord.value) return
  let rect = boardEl.value.getBoundingClientRect()
  selectedWord.value.x = ((e.clientX - rect.left) / rect.width) * 100
  selectedWord.value.y = ((e.clientY - rect.top) / rect.height) * 100
}

let boardComplete = computed(() => words.value.every((word) => word.placed))

function tossWord(e) {
  if (!selectedWord.value) return

  let selectedRipple = e.target
  let targetRipple = findTargetElement(selectedWord.value)
  console.debug('**toss', toRaw(selectedWord.value), e, selectedRipple, targetRipple)

  // i was slightly pleasantly surprised you can compare elements like this
  if (![outlierEl.value, outerEl.value, middleEl.value, innerEl.value].includes(selectedRipple)) {
    // place word but do not process any game logic, the word is just being arranged outside the solution areas
    placeWord(e)
  } else if (targetRipple === selectedRipple) {
    placeWord(e)
    selectedWord.value.placed = true
    setTimeout(async function () {
      selectedWord.value = null
      dragoverCategory.value = null
      if (boardComplete.value) {
        await nextTick()
        alert(`You won with ${incorrectNum.value} mistakes! 🎉`)
      }
    }, 300) // the timing of the animation, todo should use transition end event intstead..
  } else {
    ripples[activeDay.value - 1].errors += 1
    selectedWord.value.nope = true
    setTimeout(() => {
      selectedWord.value.nope = false
      selectedWord.value = null
    }, 500)
  }
}

let dragoverCategory = ref(null)
</script>

<template>
  <div class="container">
    <span class="days">
      <a
        v-for="(data, i) in ripples"
        :key="i"
        tabindex="0"
        :href="`?day=${i + 1}`"
        :class="{ day: true, active: activeDay === i + 1 }"
        @click.prevent="go(i + 1)"
      >
        Day {{ ucfirst(digitToWord(i + 1)) }}
      </a>
    </span>
    <main
      class="board"
      :class="{ complete: boardComplete }"
      @click="placeWord"
      ref="board-el"
      @drop.stop="tossWord"
      @dragover.prevent
      @dragenter.prevent="dragoverCategory = null"
    >
      <div
        tabindex="0"
        class="outer ripple"
        :class="{ dragover: dragoverCategory === 'outer' }"
        ref="outer-el"
        @click.stop="tossWord"
        @drop.stop="tossWord"
        @dragover.prevent
        @dragenter.stop="dragoverCategory = 'outer'"
        aria-label="outer ripple"
      ></div>
      <div
        tabindex="0"
        class="middle ripple"
        :class="{ dragover: dragoverCategory === 'middle' }"
        ref="middle-el"
        @click.stop="tossWord"
        @drop.stop="tossWord"
        @dragover.prevent
        @dragenter.stop="dragoverCategory = 'middle'"
        aria-label="middle ripple"
      ></div>
      <div
        tabindex="0"
        class="inner ripple"
        :class="{ dragover: dragoverCategory === 'inner' }"
        ref="inner-el"
        @click.stop="tossWord"
        @drop.stop="tossWord"
        @dragover.prevent
        @dragenter.stop="dragoverCategory = 'inner'"
        @x-keyup.enter="todo"
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
        @dragend="dragoverCategory = null"
        :inert="word.placed"
      >
        {{ word.txt }}
      </button>
      <div class="legend">
        <div
          tabindex="0"
          class="outlier"
          :class="{ dragover: dragoverCategory === 'outlier' }"
          ref="outlier-el"
          @click.stop="tossWord"
          @drop.stop="tossWord"
          @dragover.prevent
          @dragenter.stop="dragoverCategory = 'outlier'"
          @dragleave.stop="dragoverCategory = null"
          @x-keyup.enter="todo"
          aria-label="outlier area"
        ></div>
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
      </div>
    </main>

    <details class="instructions">
      <summary>
        <strong>instructions</strong>
      </summary>
      Each concentric circle represents a (hidden) category. One of the words fits into all three
      categories and should be placed in the innermost circle. Two of the words fit into two of the
      categories only and should be placed in the middle circle. Three more words fit only into one
      category and should be placed in the outermost circle. Only one word does not fit into any
      category; it should be placed in the outlier box. If you make a placement mistake, a category
      title will be revealed. See how few mistakes you can make before you correctly categorize each
      word!k
    </details>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:math';

.days {
  margin: 0.4em;
  display: flex;
  gap: 1em;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;

  @media (min-aspect-ratio: 1.08/1) {
    flex-direction: column;
  }
}

.container {
  display: flex;
  flex-direction: column;
  place-content: center;
  min-height: 100vh;
  background: white;

  @media (prefers-color-scheme: dark) {
    background: black;
  }
}

.board {
  background: var(--bg-color);
  margin: auto;
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

@mixin placement {
  border: 0.3em solid var(--fg-color);
  border-radius: 50%;
  aspect-ratio: 1;
  background: var(--bg-color);

  .board:has(.word.selected) &:is(:hover, :focus-visible) {
    cursor: pointer;
    outline: none;
    background: var(--active-bg-color);
  }

  &.dragover,
  .board.complete & {
    background: var(--active-bg-color);
  }
}

.ripple {
  // pointer-events: all;
  top: min(50vh, 50vw);
  left: min(50vh, 50vw);
  translate: -50% -50%;
  position: absolute;
  place-self: center;
  // position: absolute;
  width: min(60vh, 60vw);
  // translate: 22% 0;
  @include placement;

  &.outer {
    --active-bg-color: hsl(193.3, 100%, 55%);
    @media (prefers-color-scheme: dark) {
      --active-bg-color: midnightblue;
    }
  }

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

.outlier {
  @include placement;
  border-radius: 15%;
  position: absolute;
  bottom: calc(100% + 2vh);
  right: 0;
  place-self: center;
  width: min(15vh, 15vw);

  --active-bg-color: orange;
  @media (prefers-color-scheme: dark) {
    --active-bg-color: darkorange;
  }
}

.word {
  cursor: grab;
  border: 1px solid var(--fg-color);
  border-radius: 2px;
  background: var(--bg-color);
  color: var(--fg-color);
  padding: 0.5em 0.7em;
  perspective: 1000px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transform-origin: 50% 50%;
  position: absolute;
  z-index: 1;
  transition: all 0.3s;
  transform: translate(-50%, -50%); // to center them on the click point
  font-size: 1.5em;

  &:active {
    cursor: grabbing;
  }

  &[inert] {
    cursor: pointer;
    border-color: #999; // a bit more of a hint that it's not draggable would be nicer
  }

  &.selected {
    cursor: grabbing;
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
  max-width: 40%;
  background: var(--bg-color);
  box-shadow: 0 4px 10px rgba(0, 0, 10, 0.5);
}

.instructions {
  padding: 1em;
  position: absolute;
  z-index: 1;
  top: 2%;
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
