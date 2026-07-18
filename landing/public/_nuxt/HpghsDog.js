import { b as useNuxtApp, d as onMounted, f as onUnmounted, S as ScrollTrigger, o as openBlock, z as createBlock, a7 as withCtx, A as normalizeClass, u as unref, a9 as resolveDynamicComponent, x as ref, t as renderSlot } from '#entry';

const _sfc_main = {
  __name: "InViewTracker",
  props: {
  tagType: { type: String, default: 'div' },
  threshold: { type: String, default: 'top 20%' },
  promise: { type: Promise, required: false, default: null },
  callback: { type: Function, default: () => {} }
},
  setup(__props) {

const props = __props;

const { hook, hooks } = useNuxtApp();

const container = ref(null);
const isVisible = ref(false);

let trigger = null;

onMounted(() => {
  initEvents();
  initTrigger();
});

onUnmounted(() => {
  destroyEvents();
  trigger?.kill();
});

const initEvents = () => {
  hook('WINDOW:RESIZE', onResize);
};

const destroyEvents = () => {
  hooks.removeHook('WINDOW:RESIZE', onResize);
};

const onResize = () => {
  trigger?.refresh();
};

const initTrigger = () => {
  trigger = ScrollTrigger.create({
    trigger: container.value,
    start: props.threshold,
    once: true,
    onEnter: onEnter
  });
};

const onEnter = async () => {
  await props.promise;

  isVisible.value = true;

  if (props.callback) props.callback();
};

return (_ctx, _cache) => {
  return (openBlock(), createBlock(resolveDynamicComponent(__props.tagType), {
    ref_key: "container",
    ref: container,
    class: normalizeClass({ 'is-visible': unref(isVisible) })
  }, {
    default: withCtx(() => [
      renderSlot(_ctx.$slots, "default")
    ]),
    _: 3
  }, 8, ["class"]))
}
}

};

export { _sfc_main as default };
