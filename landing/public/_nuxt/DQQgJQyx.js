import { o as openBlock, c as createElementBlock, C as createBaseVNode, D as toDisplayString, u as unref, a8 as createTextVNode, n as computed } from '#entry';

const _hoisted_1 = { class: "section-title btn-label ttu" };
const _hoisted_2 = { class: "section-title__id" };


const _sfc_main = {
  __name: "SectionTitle",
  props: {
  sectionId: { type: String, required: true },
  label: { type: String, required: true }
},
  setup(__props) {

const props = __props;
const formattedId = computed(() => props.sectionId.padStart(2, '0'));

return (_ctx, _cache) => {
  return (openBlock(), createElementBlock("div", _hoisted_1, [
    createBaseVNode("span", _hoisted_2, "//" + toDisplayString(unref(formattedId)), 1),
    createTextVNode(" " + toDisplayString(__props.label), 1)
  ]))
}
}

};

export { _sfc_main as default };
