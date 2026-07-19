import { d as onMounted, e as dispatcherSingleton, f as onUnmounted, O as gsapWithCSS, an as useEvent, o as openBlock, c as createElementBlock, C as createBaseVNode, A as normalizeClass, u as unref, ao as mapTo, x as ref, U as store } from '#entry';

const _sfc_main = {
  __name: "Scrollbar",
  setup(__props) {

const wrapper = ref(null);
const handle = ref(null);
const isVisible = ref(false);

let wrapperBounds = null;
let handleBounds = null;

onMounted(() => {
  onResize();
  dispatcherSingleton.on('scrollRaf', onDispatcherScroll);
});
onUnmounted(() => {
  dispatcherSingleton.off('scrollRaf', onDispatcherScroll);
});

// Listen to Dispatcher scroll event
const onDispatcherScroll = ({ total, currentY }) => {
  if (!handle.value) return

  const progressMapped = mapTo(
    currentY,
    store.snapPoints[0].value,
    total,
    0,
    1);

  isVisible.value = progressMapped >= 0.15;

  const yTranslate =
    progressMapped * (wrapperBounds.height - handleBounds.height);
  gsapWithCSS.set(handle.value, { y: yTranslate, force3D: true });
};

const onResize = () => {
  wrapperBounds = wrapper.value.getBoundingClientRect();
  handleBounds = handle.value.getBoundingClientRect();
};
useEvent('WINDOW:RESIZE', onResize);

return (_ctx, _cache) => {
  return (openBlock(), createElementBlock("div", {
    class: normalizeClass(["scrollbar", { 'scrollbar--visible': unref(isVisible) }])
  }, [
    createBaseVNode("div", {
      ref_key: "wrapper",
      ref: wrapper,
      class: "scrollbar__inner"
    }, null, 512),
    createBaseVNode("div", {
      ref_key: "handle",
      ref: handle,
      class: "scrollbar__progress"
    }, null, 512)
  ], 2))
}
}

};

export { _sfc_main as default };
