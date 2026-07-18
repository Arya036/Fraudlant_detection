import { H as storeToRefs, al as useAppStore, y as watch, x as ref, b as useNuxtApp, f as onUnmounted, O as gsapWithCSS, T as withDirectives, o as openBlock, c as createElementBlock, C as createBaseVNode, u as unref, A as normalizeClass, n as computed, R as resolveDirective } from '#entry';

const _hoisted_1 = ["aria-label"];
const _hoisted_2 = { class: "sound-toggle__label-wrapper oh" };
const _hoisted_3 = { class: "sound-toggle__label-inner" };
const _hoisted_4 = ["aria-hidden"];
const _hoisted_5 = ["aria-hidden"];
const _hoisted_6 = {
  class: "sound-toggle__svg",
  viewBox: "0 0 24 7",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
};
const _hoisted_7 = ["d"];
// ? Handle logo visibility once loader is done
const WIDTH = 24; // ? dictates amplitude of the up & down
const STEPS = 30; // ? dictates smoothness of the curve
const CENTER_Y = 3.5;
const LERP = 0.08;
const FLAT_THRESHOLD = 0.01;


const _sfc_main = {
  __name: "SoundToggle",
  setup(__props) {

const isVisible = ref(false);
const { isLoaderVisible, isSoundMuted } = storeToRefs(useAppStore());

watch(
  () => isLoaderVisible.value,
  (newVal) => {
    if (!newVal) {
      isVisible.value = true;
    }
  }
);

const buildPath = (amp, ph) => {
  let d = `M0 ${(CENTER_Y + Math.sin(ph) * amp).toFixed(3)}`;
  for (let i = 1; i <= STEPS; i++) {
    const x = (i / STEPS) * WIDTH;
    const y = CENTER_Y + Math.sin((i / STEPS) * Math.PI * 4 + ph) * amp;
    d += `L${x.toFixed(2)} ${y.toFixed(3)}`;
  }
  return d
};

const wavePath = ref(buildPath(0, 0));
let amplitude = 0; // ? 0-3
let phase = 0;
let isRunning = false;

const target = computed(() => (isSoundMuted.value ? 0 : 3));
const onRender = () => {
  amplitude += (target.value - amplitude) * LERP;
  if (!isSoundMuted.value) phase += 0.08;

  // ? Stop ticker when flat and sound is off
  if (isSoundMuted.value && amplitude < FLAT_THRESHOLD) {
    amplitude = 0;
    wavePath.value = `M0 ${CENTER_Y}L${WIDTH} ${CENTER_Y}`;
    gsapWithCSS.ticker.remove(onRender);
    isRunning = false;
    return
  }

  wavePath.value = buildPath(amplitude, phase);
};

const startTicker = () => {
  if (isRunning) return

  isRunning = true;
  gsapWithCSS.ticker.add(onRender);
};

const ariaLabel = computed(() => {
  return isSoundMuted.value ? 'Enable sounds' : 'Mute sounds'
});

const { $soundManager } = useNuxtApp();
const { setIsSoundMuted } = useAppStore();
const onClick = () => {
  setIsSoundMuted();

  if (!isSoundMuted.value) {
    $soundManager?.unMute();
    $soundManager?.playSound('ambient');
  } else {
    $soundManager?.mute();
  }
};
watch(
  () => isSoundMuted.value,
  (newVal) => {
    if (!newVal) {
      // ? Always restart ticker on click
      startTicker();
    }
  }
);

onUnmounted(() => {
  gsapWithCSS.ticker.remove(onRender);
});

return (_ctx, _cache) => {
  const _directive_sound = resolveDirective("sound");

  return withDirectives((openBlock(), createElementBlock("button", {
    class: normalizeClass([{
      'sound-toggle--visible': unref(isVisible),
      'sound-toggle--active': !unref(isSoundMuted)
    }, "sound-toggle btn-label ttu"]),
    "aria-label": unref(ariaLabel),
    onClick: onClick
  }, [
    createBaseVNode("span", _hoisted_2, [
      createBaseVNode("span", _hoisted_3, [
        _cache[0] || (_cache[0] = createBaseVNode("span", { class: "sound-toggle__label" }, " SOUND ", -1)),
        createBaseVNode("span", {
          "aria-hidden": unref(isSoundMuted),
          class: "sound-toggle__label-status sound-toggle__label-status--off"
        }, "OFF", 8, _hoisted_4),
        createBaseVNode("span", {
          "aria-hidden": !unref(isSoundMuted),
          class: "sound-toggle__label-status sound-toggle__label-status--on"
        }, "ON", 8, _hoisted_5)
      ])
    ]),
    (openBlock(), createElementBlock("svg", _hoisted_6, [
      createBaseVNode("path", {
        d: unref(wavePath),
        stroke: "currentColor",
        "stroke-miterlimit": "10",
        fill: "none"
      }, null, 8, _hoisted_7)
    ]))
  ], 10, _hoisted_1)), [
    [_directive_sound, { click: 'click', hover: 'hover' }]
  ])
}
}

};

export { _sfc_main as default };
