import { R as resolveDirective, T as withDirectives, o as openBlock, z as createBlock, a7 as withCtx, a8 as createTextVNode, D as toDisplayString, u as unref, a9 as resolveDynamicComponent, n as computed, aa as __nuxt_component_0, d as onMounted, e as dispatcherSingleton, O as gsapWithCSS, f as onUnmounted, x as ref, H as storeToRefs, c as createElementBlock, B as createCommentVNode, C as createBaseVNode, X as Fragment, Y as renderList, a as createVNode, A as normalizeClass, _ as _sfc_main$2, s as mergeProps } from '#entry';
import { u as useDataStore } from './lMIEOdbu.js';

const _sfc_main$1 = {
  __name: "BaseLink",
  props: {
  label: { type: String, required: true },
  url: { type: String, required: true },
  onClick: { type: Function, default: () => {} }
},
  setup(__props) {

const props = __props;

const tagType = computed(() => {
  return props.url ? __nuxt_component_0 : 'button'
});
const isExternal = computed(() => {
  return props.url?.includes('https://')
});
const target = computed(() => {
  return isExternal.value ? '_blank' : '_self'
});

return (_ctx, _cache) => {
  const _directive_sound = resolveDirective("sound");

  return withDirectives((openBlock(), createBlock(resolveDynamicComponent(unref(tagType)), {
    to: __props.url,
    class: "link",
    target: unref(target),
    onClick: __props.onClick
  }, {
    default: withCtx(() => [
      createTextVNode(toDisplayString(__props.label), 1)
    ]),
    _: 1
  }, 8, ["to", "target", "onClick"])), [
    [_directive_sound, { hover: 'hover' }]
  ])
}
}

};

// Module-level cache of the last known UI visibility per section.
// Populated as `sceneUIVisibilityChanged` events arrive on the main thread,
// so that components remounting after navigation can read the current state
// immediately in onMounted without waiting for the next worker event.
const uiVisibilityCache = {};
dispatcherSingleton.on('sceneUIVisibilityChanged', ({ section, visible }) => {
  uiVisibilityCache[section] = visible;
});

/**
 * Base composable for section components
 * Provides common functionality for section animation and visibility control
 *
 * @param {string} sectionId - The section identifier (e.g., "sectionIntro")
 * @param {Object} options - Configuration options
 * @param {number} options.fadeDuration - Duration for fade in/out (default: 0.4)
 */
function useSectionComponent(sectionId, options = {}) {
  const {
    fadeDuration = 0.4,
    isDisabled = false,
    awaitPromise = null
  } = options;

  const elementRef = ref(null);

  const cachedVisible = uiVisibilityCache[sectionId] === true;
  const isVisible = ref(false);

  const isEnabled = ref(true); // Tracks if scene is enabled via Theatre.js
  const currentAnimation = ref(null);

  /**
   * Fades the section in
   */
  const animateIn = () => {
    if (!elementRef.value) return

    if (currentAnimation.value) {
      currentAnimation.value.kill();
    }

    isVisible.value = true;

    currentAnimation.value = gsapWithCSS.to(elementRef.value, {
      autoAlpha: 1,
      duration: fadeDuration,
      ease: 'none',
      onComplete: () => {
        currentAnimation.value = null;
      }
    });
  };

  /**
   * Fades the section out
   */
  const animateOut = () => {
    if (!elementRef.value) return

    if (currentAnimation.value) {
      currentAnimation.value.kill();
    }

    isVisible.value = false;

    currentAnimation.value = gsapWithCSS.to(elementRef.value, {
      autoAlpha: 0,
      duration: fadeDuration,
      ease: 'none',
      onComplete: () => {
        currentAnimation.value = null;
      }
    });
  };

  /**
   * Immediately show the section without animation
   */
  const show = () => {
    if (!elementRef.value) return

    if (currentAnimation.value) {
      currentAnimation.value.kill();
    }

    isVisible.value = true;

    gsapWithCSS.set(elementRef.value, { autoAlpha: 1 });
  };

  /**
   * Immediately hide the section without animation
   */
  const hide = () => {
    if (!elementRef.value) return

    if (currentAnimation.value) {
      currentAnimation.value.kill();
    }

    isVisible.value = false;
    elementRef.value.classList.remove('is-active');
    gsapWithCSS.set(elementRef.value, { autoAlpha: 0 });
  };

  /**
   * Handle section change events from the GL dispatcher
   */
  const handleSectionChange = ({ section }) => {
    if (section === sectionId) {
      // This section should be shown
      animateIn();
    } else if (isVisible.value) {
      // This section should be hidden
      animateOut();
    }
  };

  /**
   * Handle UI visibility changes from Theatre.js UI activation toggles
   */
  const handleSceneUIVisibilityChanged = ({ section, visible }) => {
    if (section === sectionId) {
      isEnabled.value = visible;

      if (!visible) {
        // UI disabled - fade out
        animateOut();
      } else {
        // UI enabled - fade in
        animateIn();
      }
    }
  };

  onMounted(async () => {
    if (isDisabled) return

    // Listen to dispatcher events
    dispatcherSingleton.on('sectionChange', handleSectionChange);
    dispatcherSingleton.on('sceneUIVisibilityChanged', handleSceneUIVisibilityChanged);

    if (cachedVisible === true) {
      // Await optional promise so that things instantiate properly (text split etc)
      if (awaitPromise) await awaitPromise;
      if (!elementRef.value) return

      // Section was active when we last saw it — restore visible state immediately
      // so components remounting after navigation (e.g. back from a company page)
      // don't stay invisible waiting for an event that won't fire.
      animateIn();
    } else {
      // Initialize with hidden state
      if (elementRef.value) {
        gsapWithCSS.set(elementRef.value, { autoAlpha: 0 });
      }
    }
  });

  onUnmounted(() => {
    if (isDisabled) return

    // Cleanup
    dispatcherSingleton.off('sectionChange', handleSectionChange);
    dispatcherSingleton.off('sceneUIVisibilityChanged', handleSceneUIVisibilityChanged);

    if (currentAnimation.value) {
      currentAnimation.value.kill();
    }
  });

  return {
    elementRef,
    isVisible,
    cachedVisible,
    isEnabled,
    animateIn,
    animateOut,
    show,
    hide
  }
}

const _hoisted_1 = { class: "grid btn-label ttu" };
const _hoisted_2 = ["innerHTML"];
const _hoisted_3 = { class: "footer__list footer__list--socials" };
const _hoisted_4 = { class: "footer__credits" };
const _hoisted_5 = {
  key: 0,
  class: "footer__list footer__list--legals"
};
const _sfc_main = {
  __name: "Footer",
  props: {
  showTitle: { type: Boolean, default: true }
},
  setup(__props, { expose: __expose }) {

const props = __props;

const { globalData } = storeToRefs(useDataStore());
const title = computed(() => globalData.value.footerTitle);
const copyrights = computed(() =>
  globalData?.value.footerCopyrights?.replace(
    '{year}',
    new Date().getFullYear()
  )
);
const socials = computed(() => globalData.value.socials);
const legalNav = computed(() => globalData.value.legalNav);

// ? pass isDisabled: true in case we don't need the webgl to trigger this section on other pages
const { elementRef, animateIn, animateOut, show, hide, isVisible } =
  useSectionComponent('sectionOutro', { isDisabled: !props.showTitle });
__expose({
  animateIn,
  animateOut,
  show,
  hide,
  elementRef
});

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$2;
  const _component_BaseLink = _sfc_main$1;

  return (openBlock(), createElementBlock("footer", {
    ref_key: "elementRef",
    ref: elementRef,
    class: normalizeClass([{ 'is-visible': unref(isVisible), 'footer--full-height': __props.showTitle }, "footer"])
  }, [
    (__props.showTitle)
      ? (openBlock(), createBlock(_component_TextSplitter, {
          key: 0,
          class: "footer__title h2",
          content: unref(title),
          "content-tag": "h3",
          "split-tag": "div",
          type: "lines, chars",
          "char-class": "anim-fade",
          "is-rich-text": true,
          "should-restore": false
        }, null, 8, ["content"]))
      : createCommentVNode("", true),
    createBaseVNode("div", _hoisted_1, [
      createBaseVNode("div", {
        class: "footer__copyrights",
        innerHTML: unref(copyrights)
      }, null, 8, _hoisted_2),
      createBaseVNode("ul", _hoisted_3, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(socials), (link, socialId) => {
          return (openBlock(), createElementBlock("li", { key: socialId }, [
            createVNode(_component_BaseLink, mergeProps({ ref_for: true }, link), null, 16)
          ]))
        }), 128))
      ]),
      createBaseVNode("div", _hoisted_4, [
        (unref(legalNav))
          ? (openBlock(), createElementBlock("ul", _hoisted_5, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(legalNav), (link, legalId) => {
                return (openBlock(), createElementBlock("li", { key: legalId }, [
                  createVNode(_component_BaseLink, mergeProps({ ref_for: true }, link), null, 16)
                ]))
              }), 128)),
              createBaseVNode("li", null, [
                createVNode(_component_BaseLink, {
                  url: "/",
                  label: "Made by TEAM SPIRIT"
                })
              ])
            ]))
          : createCommentVNode("", true)
      ])
    ])
  ], 2))
}
}

};

const Footer = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: _sfc_main
}, Symbol.toStringTag, { value: 'Module' }));

export { Footer as F, _sfc_main as _, useSectionComponent as u };
