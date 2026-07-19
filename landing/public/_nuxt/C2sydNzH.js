import { o as openBlock, c as createElementBlock, g as createStaticVNode } from '#entry';

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const _sfc_main = {  };

const _hoisted_1 = {
  class: "svg-sprite",
  fill: "none",
  "aria-hidden": "true"
};

function _sfc_render(_ctx, _cache) {
  return (openBlock(), createElementBlock("svg", _hoisted_1, [...(_cache[0] || (_cache[0] = [
    createStaticVNode("<defs><linearGradient id=\"btnBorderGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\"><stop offset=\"0%\" stop-color=\"#9BB8E1\"></stop><stop offset=\"100%\" stop-color=\"#2C4E73\"></stop></linearGradient></defs><defs><linearGradient id=\"navBorderLeft\" x1=\"0.5\" y1=\"14.5\" x2=\"65\" y2=\"14.5\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#9BB8E1\"></stop><stop offset=\"1\" stop-color=\"#235792\"></stop></linearGradient></defs><defs><linearGradient id=\"navBorderRight\" x1=\"-34.5\" y1=\"14.5\" x2=\"30\" y2=\"14.5\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#9BB8E1\"></stop><stop offset=\"1\" stop-color=\"#235792\"></stop></linearGradient></defs>", 3)
  ]))]))
}
const SvgSprite = /*#__PURE__*/Object.assign(_export_sfc(_sfc_main, [['render',_sfc_render]]), { __name: "SvgSprite" });

export { SvgSprite as default };
