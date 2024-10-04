export default (function getRipples() {
  let url = new URL(window.location)
  switch (url.searchParams.get('q')) {
    case '1':
      return [
        ['verb', 'lose', 'seem', 'took'],
        ['noun', 'does', 'spat'],
        ['adjective', 'still'],
        'and'
      ]
    default:
      return [
        ['words with white', 'elephant', 'egg', 'flag'],
        ['say something you shouldn’t', 'rat', 'lie'],
        ['uncool', 'out'],
        'nest'
      ]
  }
})()
