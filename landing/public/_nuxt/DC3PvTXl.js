import { o as openBlock, c as createElementBlock, C as createBaseVNode, y as watch, T as withDirectives, z as createBlock, a7 as withCtx, s as mergeProps, u as unref, a9 as resolveDynamicComponent, A as normalizeClass, n as computed, aa as __nuxt_component_0, R as resolveDirective, a as createVNode, x as ref, O as gsapWithCSS } from '#entry';

const _hoisted_1$2 = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "currentColor",
  viewBox: "0 0 4 12"
};

function render$2(_ctx, _cache) {
  return (openBlock(), createElementBlock("svg", _hoisted_1$2, [...(_cache[0] || (_cache[0] = [
    createBaseVNode("path", { d: "M0 7.978 4 12v-1.978L0 6zm0-3.956L4 0v1.978L0 6z" }, null, -1)
  ]))]))
}
const ArrowSvg = { render: render$2 };

const _hoisted_1$1 = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 31 33"
};

function render$1(_ctx, _cache) {
  return (openBlock(), createElementBlock("svg", _hoisted_1$1, [...(_cache[0] || (_cache[0] = [
    createBaseVNode("path", { d: "M30.5 32.5h-25a5 5 0 0 1-5-5v-22a5 5 0 0 1 5-5h25" }, null, -1)
  ]))]))
}
const BorderLeftSvg = { render: render$1 };

const _hoisted_1 = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 31 33"
};

function render(_ctx, _cache) {
  return (openBlock(), createElementBlock("svg", _hoisted_1, [...(_cache[0] || (_cache[0] = [
    createBaseVNode("path", { d: "M0 32.5h25a5 5 0 0 0 5-5v-22a5 5 0 0 0-5-5H0" }, null, -1)
  ]))]))
}
const BorderRightSvg = { render: render };

const _sfc_main = {
  __name: "NavPrevNext",
  props: {
  isVertical: { type: Boolean, default: false },
  prevAriaLabel: { type: String, required: true },
  prevUrl: { type: String, default: '' },
  onPrevClick: { type: Function, default: () => {} },
  nextAriaLabel: { type: String, required: true },
  nextUrl: { type: String, default: '' },
  onNextClick: { type: Function, default: () => {} },
  isDisabled: { type: Boolean, default: false },
  isVisible: { type: Boolean, default: false }
},
  setup(__props) {

const props = __props;

// ? Handle blur when aria-hidden="true" but focus is active
const btnPrev = ref(null);
const btnRight = ref(null);
const getEl = (refEl) => {
  const el = refEl?.value;
  return el?.$el ?? el ?? null
};
watch(
  () => props.isVisible,
  (newVal) => {
    if (!newVal) {
      getEl(btnPrev)?.blur();
      getEl(btnRight)?.blur();
    }
  }
);

const tagType = computed(() =>
  props.prevUrl || props.nextUrl ? __nuxt_component_0 : 'button'
);
const leftProps = computed(() => (props.prevUrl ? { to: props.prevUrl } : {}));
const rightProps = computed(() => (props.nextUrl ? { to: props.nextUrl } : {}));

const borderLeftEl = ref(null);
const onPrevBtnClick = () => {
  props.onPrevClick();

  if (!borderLeftEl?.value?.$el || props.isDisabled) return false

  gsapWithCSS.killTweensOf(borderLeftEl.value.$el);
  gsapWithCSS.fromTo(
    borderLeftEl.value.$el,
    { strokeDashoffset: 100 },
    { strokeDashoffset: 0, ease: 'expoInOut', duration: 1.2 }
  );
};

const borderRightEl = ref(null);
const onNextBtnClick = () => {
  props.onNextClick();

  if (!borderRightEl?.value?.$el || props.isDisabled) return false

  gsapWithCSS.killTweensOf(borderRightEl.value.$el);
  gsapWithCSS.fromTo(
    borderRightEl.value.$el,
    { strokeDashoffset: 100 },
    { strokeDashoffset: 0, ease: 'expoInOut', duration: 1.2 }
  );
};

watch(
  () => props.isVisible,
  (newVal) => {
    if (newVal) {
      const tl = gsapWithCSS.timeline();
      tl.fromTo(
        [borderLeftEl.value.$el, borderRightEl.value.$el],
        {
          strokeDashoffset: 90,
          strokeDasharray: 90
        },
        {
          strokeDashoffset: 180,
          duration: 1,
          clearProps: 'all'
        },
        0
      );
    }
  }
);

return (_ctx, _cache) => {
  const _directive_sound = resolveDirective("sound");

  return (openBlock(), createElementBlock("nav", {
    class: normalizeClass([{
      'nav-prev-next--visible': __props.isVisible,
      'nav-prev-next--vertical': __props.isVertical
    }, "nav-prev-next"])
  }, [
    withDirectives((openBlock(), createBlock(resolveDynamicComponent(unref(tagType)), mergeProps({
      ref_key: "btnPrev",
      ref: btnPrev
    }, unref(leftProps), {
      "aria-label": __props.prevAriaLabel,
      class: "nav-prev-next__btn nav-prev-next__btn--prev",
      onClick: onPrevBtnClick
    }), {
      default: withCtx(() => [
        createVNode(unref(ArrowSvg), {
          "aria-hidden": "true",
          class: "nav-prev-next__btn-arrow nav-prev-next__btn-arrow--base"
        }),
        createVNode(unref(ArrowSvg), {
          "aria-hidden": "true",
          class: "nav-prev-next__btn-arrow nav-prev-next__btn-arrow--hover"
        }),
        createVNode(unref(BorderLeftSvg), {
          ref_key: "borderLeftEl",
          ref: borderLeftEl,
          "aria-hidden": "true",
          class: "nav-prev-next__svg-border"
        }, null, 512)
      ]),
      _: 1
    }, 16, ["aria-label"])), [
      [_directive_sound, { click: 'click', hover: 'hover' }]
    ]),
    withDirectives((openBlock(), createBlock(resolveDynamicComponent(unref(tagType)), mergeProps({
      ref_key: "btnRight",
      ref: btnRight
    }, unref(rightProps), {
      "aria-label": __props.nextAriaLabel,
      class: "nav-prev-next__btn nav-prev-next__btn--next",
      onClick: onNextBtnClick
    }), {
      default: withCtx(() => [
        createVNode(unref(ArrowSvg), {
          "aria-hidden": "true",
          class: "nav-prev-next__btn-arrow nav-prev-next__btn-arrow--base"
        }),
        createVNode(unref(ArrowSvg), {
          "aria-hidden": "true",
          class: "nav-prev-next__btn-arrow nav-prev-next__btn-arrow--hover"
        }),
        createVNode(unref(BorderRightSvg), {
          ref_key: "borderRightEl",
          ref: borderRightEl,
          "aria-hidden": "true",
          class: "nav-prev-next__svg-border"
        }, null, 512)
      ]),
      _: 1
    }, 16, ["aria-label"])), [
      [_directive_sound, { click: 'click', hover: 'hover' }]
    ])
  ], 2))
}
}

};

export { _sfc_main as default };
