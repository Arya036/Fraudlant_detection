import { b as useNuxtApp, d as onMounted, i as init, e as dispatcherSingleton, f as onUnmounted, o as openBlock, c as createElementBlock } from '#entry';
import { S as Sleep } from './DxtrQHzD.js';
import { u as useDataStore } from './lMIEOdbu.js';

const _hoisted_1 = { id: "gl-canvas" };
const _sfc_main = {
  __name: "Canvas",
  setup(__props) {

const { $soundManager } = useNuxtApp();
const dataStore = useDataStore();

let cleanup = null;
onMounted(async () => {
  await Sleep(1200); // Give loader time to animate to avoid jank
  await init({
    offscreen: false,
    teamMembers: dataStore.allTeamMembers
  });

  const onPlaySound = ({ soundId }) => $soundManager?.playSound(soundId);
  const onPauseSound = ({ soundId }) => $soundManager?.pauseSound(soundId);
  const onSetSoundVolume = ({ soundId, volume }) =>
    $soundManager?.setSoundVolume(soundId, volume);

  dispatcherSingleton.on('playSound', onPlaySound);
  dispatcherSingleton.on('pauseSound', onPauseSound);
  dispatcherSingleton.on('setSoundVolume', onSetSoundVolume);

  // Store cleanup function if needed
  cleanup = () => {
    dispatcherSingleton.off('playSound', onPlaySound);
    dispatcherSingleton.off('pauseSound', onPauseSound);
    dispatcherSingleton.off('setSoundVolume', onSetSoundVolume);
    dispatcherSingleton.off('debugInfos');
  };
});

onUnmounted(() => {
  if (cleanup) {
    cleanup();
  }
});

return (_ctx, _cache) => {
  return (openBlock(), createElementBlock("div", _hoisted_1))
}
}

};

export { _sfc_main as default };
