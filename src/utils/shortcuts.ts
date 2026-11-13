export const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.platform);

export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';
