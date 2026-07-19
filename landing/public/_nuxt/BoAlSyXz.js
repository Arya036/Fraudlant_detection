import { o as openBlock, c as createElementBlock, a as createVNode, V as _sfc_main$1, A as normalizeClass } from '#entry';

const _hoisted_1 = ["aria-hidden"];


const _sfc_main = {
  __name: "BackButton",
  props: {
  isVisible: { type: Boolean, default: false },
  isInXsHeader: { type: Boolean, default: false } // ? change its position on mobile if true
},
  setup(__props) {



return (_ctx, _cache) => {
  const _component_BaseButton = _sfc_main$1;

  return (openBlock(), createElementBlock("div", {
    "aria-hidden": !__props.isVisible,
    class: normalizeClass([{
      'back-button--top': __props.isInXsHeader,
      'back-button--visible': __props.isVisible
    }, "back-button"])
  }, [
    createVNode(_component_BaseButton, {
      class: "",
      label: "Return to homepage",
      url: "/"
    })
  ], 10, _hoisted_1))
}
}

};

export { _sfc_main as default };
