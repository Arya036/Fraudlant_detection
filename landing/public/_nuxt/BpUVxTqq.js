import _sfc_main$3 from './-GFkwhdW.js';
import _sfc_main$4 from './CMR927m8.js';
import _sfc_main$1 from './BoAlSyXz.js';
import _sfc_main$2 from './DC3PvTXl.js';
import { u as useCompanyNav } from './DYt7FIrk.js';
import { o as openBlock, c as createElementBlock, a as createVNode, u as unref } from '#entry';

const _hoisted_1 = { class: "header" };


const _sfc_main = {
  __name: "Header",
  setup(__props) {

const { prevUrl, nextUrl, isVisible } = useCompanyNav();

return (_ctx, _cache) => {
  const _component_HeaderLogo = _sfc_main$3;
  const _component_SoundToggle = _sfc_main$4;
  const _component_BackButton = _sfc_main$1;
  const _component_NavPrevNext = _sfc_main$2;

  return (openBlock(), createElementBlock("header", _hoisted_1, [
    createVNode(_component_HeaderLogo),
    createVNode(_component_SoundToggle),
    createVNode(_component_BackButton, { "is-visible": unref(isVisible) }, null, 8, ["is-visible"]),
    createVNode(_component_NavPrevNext, {
      "prev-aria-label": "Go to previous company page",
      "prev-url": unref(prevUrl),
      "next-aria-label": "Go to next company page",
      "next-url": unref(nextUrl),
      "is-visible": unref(isVisible)
    }, null, 8, ["prev-url", "next-url", "is-visible"])
  ]))
}
}

};

export { _sfc_main as default };
