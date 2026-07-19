import { b as useNuxtApp, y as watch, d as onMounted, e as dispatcherSingleton, f as onUnmounted, R as resolveDirective, o as openBlock, c as createElementBlock, a as createVNode, _ as _sfc_main$6, T as withDirectives, C as createBaseVNode, D as toDisplayString, A as normalizeClass, u as unref, O as gsapWithCSS, U as store, V as _sfc_main$7, x as ref, W as createPromise, s as mergeProps, G as nextTick, H as storeToRefs, X as Fragment, Y as renderList, z as createBlock, n as computed, N as withAsyncContext, J as createError, v as normalizeProps, Z as guardReactiveProps } from '#entry';
import { u as useSectionComponent, _ as _sfc_main$a } from './DwgGGfV0.js';
import _sfc_main$8 from './DQQgJQyx.js';
import { S as Sleep } from './DxtrQHzD.js';
import _sfc_main$9 from './DC3PvTXl.js';
import { u as useDataStore, s as seoFragment, g as groq, a as useSanityQuery } from './lMIEOdbu.js';
import _sfc_main$b from './CX2HBHKw.js';
import { u as usePageMixin, a as useSeo } from './zwo0n8NT.js';

const _hoisted_1$3 = { class: "home-hero__btn-label" };
const _sfc_main$5 = {
  __name: "HomeHero",
  props: {
  title: { type: Object, required: true },
  ctaLabel: { type: String, required: true }
},
  setup(__props, { expose: __expose }) {

const onCtaClick = () => {
  const investors = store.snapPoints.find((sp) => sp.id === 'investors');
  dispatcherSingleton.trigger({ name: 'scrollToY' }, { y: investors.value });
};



const { elementRef, animateIn, animateOut, show, hide, isVisible } =
  useSectionComponent('sectionIntro');

const { $soundManager } = useNuxtApp();

let prevSfxMuted = null;
const handleSfxIntroControl = ({ muted, volume }) => {
  $soundManager?.setSoundVolume('heroLoop', volume);
  if (muted !== prevSfxMuted) {
    prevSfxMuted = muted;
    if (muted) {
      $soundManager?.pauseSound('heroLoop');
    } else {
      $soundManager?.playSound('heroLoop');
    }
  }
};

let tlIn = null;
let titleSplit = null;
const onSplitDone = (split) => {
  titleSplit = split;

  tlIn = gsapWithCSS.timeline({ paused: true });
  tlIn.fromTo(
    titleSplit.lines[0],
    {
      x: 20
    },
    {
      x: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0
  );

  tlIn.fromTo(
    titleSplit.lines[1],
    {
      x: -20
    },
    {
      x: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0.1
  );
};
watch(isVisible, (val) => {
  if (val) tlIn?.play(0);
});

onMounted(() => {
  dispatcherSingleton.on('sfxIntroControl', handleSfxIntroControl);
});

onUnmounted(() => {
  dispatcherSingleton.off('sfxIntroControl', handleSfxIntroControl);
  tlIn?.kill();
});

__expose({
  animateIn,
  animateOut,
  show,
  hide
});

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$6;
  const _directive_sound = resolveDirective("sound");

  return (openBlock(), createElementBlock("div", {
    ref_key: "elementRef",
    ref: elementRef,
    class: normalizeClass([{ 'is-visible': unref(isVisible) }, "home-hero gutters fixed-section"])
  }, [
    createVNode(_component_TextSplitter, {
      class: "home-hero__title",
      content: __props.title,
      "content-tag": "h1",
      "split-tag": "div",
      type: "lines, chars",
      "char-class": "anim-fade",
      "is-rich-text": true,
      callback: onSplitDone,
      "should-restore": false,
      "should-resize": false
    }, null, 8, ["content"]),
    withDirectives((openBlock(), createElementBlock("button", {
      class: "home-hero__btn btn-label ttu",
      onClick: onCtaClick
    }, [
      createBaseVNode("span", _hoisted_1$3, toDisplayString(__props.ctaLabel), 1),
      _cache[0] || (_cache[0] = createBaseVNode("span", { class: "home-hero__btn-line" }, null, -1))
    ])), [
      [_directive_sound, { click: 'click', hover: 'hover' }]
    ])
  ], 2))
}
}

};

const _hoisted_1$2 = { class: "home-investors__wrapper" };
const _hoisted_2$2 = { class: "home-investors__copy-wrapper" };
const _hoisted_3$2 = { class: "home-investors__copy body-copy" };
const _hoisted_4$2 = { class: "home-investors__copy-cta" };
const _hoisted_5$1 = { class: "home-investors__cta" };
const _sfc_main$4 = {
  __name: "HomeInvestors",
  props: {
  sectionLabel: { type: String, required: true },
  title: { type: Object, required: true },
  copy: { type: String, required: true }
},
  setup(__props, { expose: __expose }) {



const isMobileCopyVisible = ref(false);
const onReadMoreClick = () => {
  isMobileCopyVisible.value = !isMobileCopyVisible.value;
};

const { elementRef, animateIn, animateOut, show, hide, isVisible } =
  useSectionComponent('sectionInvestors');

const { $soundManager } = useNuxtApp();

let prevSfxMuted = null;
const handleSfxInvestorsControl = ({ muted, volume }) => {
  $soundManager?.setSoundVolume('investorsLoop', volume);
  if (muted !== prevSfxMuted) {
    prevSfxMuted = muted;
    if (muted) {
      $soundManager?.pauseSound('investorsLoop');
    } else {
      $soundManager?.playSound('investorsLoop');
    }
  }
};

let tlIn = null;
let titleSplit = null;
const onSplitDone = (split) => {
  titleSplit = split;

  tlIn = gsapWithCSS.timeline({ paused: true });
  tlIn.fromTo(
    titleSplit.lines[0],
    {
      xPercent: 20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'exPercentpoOut'
    },
    0
  );

  tlIn.fromTo(
    titleSplit.lines[1],
    {
      xPercent: -20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0.1
  );
};
watch(isVisible, (val) => {
  if (val) tlIn?.play(0);
});

onMounted(() => {
  dispatcherSingleton.on('sfxInvestorsControl', handleSfxInvestorsControl);
});

onUnmounted(() => {
  dispatcherSingleton.off('sfxInvestorsControl', handleSfxInvestorsControl);
  tlIn?.kill();
});

__expose({
  animateIn,
  animateOut,
  show,
  hide
});

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$6;
  const _component_BaseButton = _sfc_main$7;
  const _component_SectionTitle = _sfc_main$8;

  return (openBlock(), createElementBlock("div", {
    ref_key: "elementRef",
    ref: elementRef,
    class: normalizeClass([{
      'is-visible': unref(isVisible),
      'home-investors--xs-toggled': unref(isMobileCopyVisible)
    }, "home-investors grid fixed-section"])
  }, [
    createBaseVNode("div", _hoisted_1$2, [
      createVNode(_component_TextSplitter, {
        class: "home-investors__title h1",
        content: __props.title,
        "content-tag": "h2",
        "split-tag": "div",
        type: "lines, chars",
        "char-class": "anim-fade",
        "is-rich-text": true,
        "should-restore": false,
        "should-resize": false,
        callback: onSplitDone
      }, null, 8, ["content"]),
      createBaseVNode("div", _hoisted_2$2, [
        createBaseVNode("p", _hoisted_3$2, [
          createVNode(_component_TextSplitter, {
            content: __props.copy,
            "base-delay": 0.1,
            "split-tag": "div",
            type: "lines",
            "line-class": "anim-fade",
            "should-restore": false
          }, null, 8, ["content"])
        ]),
        createBaseVNode("div", _hoisted_4$2, [
          createVNode(_component_BaseButton, {
            label: "Back to homepage",
            "on-click": onReadMoreClick
          })
        ])
      ])
    ]),
    createBaseVNode("div", _hoisted_5$1, [
      createVNode(_component_BaseButton, {
        label: "Read more",
        "on-click": onReadMoreClick,
        "is-small": true
      })
    ]),
    createVNode(_component_SectionTitle, {
      label: __props.sectionLabel,
      "section-id": "1"
    }, null, 8, ["label"])
  ], 2))
}
}

};

const _hoisted_1$1 = { class: "home-portfolio__copy-wrapper" };
const _hoisted_2$1 = { class: "home-portfolio__copy body-copy" };
const _hoisted_3$1 = { class: "home-portfolio__copy-cta" };
const _hoisted_4$1 = { class: "home-portfolio__mobile-cta" };
const _sfc_main$3 = {
  __name: "HomePortfolio",
  props: {
  sectionLabel: { type: String, required: true },
  title: { type: Object, required: true },
  copy: { type: String, required: true },
  cta: { type: Object, required: true }
},
  setup(__props, { expose: __expose }) {



const splitPromise = createPromise();
const visiblePromise = createPromise();

const {
  elementRef,
  animateIn,
  animateOut,
  show,
  hide,
  isVisible,
  cachedVisible
} = useSectionComponent('sectionPortfolio', { awaitPromise: visiblePromise });

const { $soundManager } = useNuxtApp();

const isMobileCopyVisible = ref(false);
const onReadMoreClick = () => {
  isMobileCopyVisible.value = !isMobileCopyVisible.value;
};

let prevSfxMuted = null;
const handleSfxPortfolioControl = ({ muted, volume }) => {
  $soundManager?.setSoundVolume('portfolioLoop', volume);
  if (muted !== prevSfxMuted) {
    prevSfxMuted = muted;
    if (muted) {
      $soundManager?.pauseSound('portfolioLoop');
    } else {
      $soundManager?.playSound('portfolioLoop');
    }
  }
};

let tlIn = null;
let titleSplit = null;
const onSplitDone = async (split) => {
  titleSplit = split;

  tlIn = gsapWithCSS.timeline({ paused: true });
  tlIn.fromTo(
    titleSplit.lines[0],
    {
      xPercent: 20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0
  );

  tlIn.fromTo(
    titleSplit.lines[1],
    {
      xPercent: -20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0.1
  );

  if (titleSplit.lines[2]) {
    tlIn.fromTo(
      titleSplit.lines[2],
      {
        xPercent: 20
      },
      {
        xPercent: 0,
        duration: 1.2,
        ease: 'expoOut'
      },
      0.2
    );
  }

  await nextTick();
  splitPromise?.resolve();
};
watch(isVisible, (newVal) => {
  if (newVal) {
    tlIn?.play(0);
  }
});

const ctaEl = ref(null);
let splitCopy = null;
const onCopySplitDone = (split) => {
  splitCopy = split;
  gsapWithCSS.set(ctaEl.value, {
    transitionDelay: splitCopy?.lines?.length * 0.1 || 0.2
  });
};

onMounted(async () => {
  dispatcherSingleton.on('sfxPortfolioControl', handleSfxPortfolioControl);

  // ? if we're coming back from company detail page, we're already scrolled to that section,
  // ? so needs to anim in
  if (cachedVisible) {
    await splitPromise;
    await Sleep(800);

    visiblePromise.resolve();

    // ? once anim in is done, reset delays for future anim in when scrolling normally
    tlIn?.then(() => {
      gsapWithCSS.set(ctaEl.value, {
        transitionDelay: splitCopy?.lines?.length * 0.1 || 0.2
      });
    });
  }
});

onUnmounted(() => {
  dispatcherSingleton.off('sfxPortfolioControl', handleSfxPortfolioControl);
  tlIn?.kill();
});

__expose({
  animateIn,
  animateOut,
  show,
  hide
});

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$6;
  const _component_BaseButton = _sfc_main$7;
  const _component_SectionTitle = _sfc_main$8;

  return (openBlock(), createElementBlock("div", {
    ref_key: "elementRef",
    ref: elementRef,
    class: normalizeClass([{
      'home-portfolio--xs-toggled': unref(isMobileCopyVisible),
      'is-visible': unref(isVisible)
    }, "home-portfolio grid fixed-section"])
  }, [
    createVNode(_component_TextSplitter, {
      class: "home-portfolio__title h1",
      content: __props.title,
      "content-tag": "h2",
      "split-tag": "div",
      type: "lines, chars",
      "char-class": "anim-fade",
      "is-rich-text": true,
      callback: onSplitDone,
      "should-restore": false,
      "should-resize": false
    }, null, 8, ["content"]),
    createBaseVNode("div", _hoisted_1$1, [
      createBaseVNode("p", _hoisted_2$1, [
        createVNode(_component_TextSplitter, {
          content: __props.copy,
          "base-delay": 0.1,
          "split-tag": "div",
          type: "lines",
          "line-class": "anim-fade",
          "should-restore": false,
          callback: onCopySplitDone
        }, null, 8, ["content"])
      ]),
      createBaseVNode("div", {
        ref_key: "ctaEl",
        ref: ctaEl,
        class: "home-portfolio__cta anim-fade"
      }, [
        createVNode(_component_BaseButton, mergeProps(__props.cta, { "has-shimmer": true }), null, 16)
      ], 512),
      createBaseVNode("div", _hoisted_3$1, [
        createVNode(_component_BaseButton, {
          label: "Back to homepage",
          "on-click": onReadMoreClick
        })
      ])
    ]),
    createBaseVNode("div", _hoisted_4$1, [
      createVNode(_component_BaseButton, {
        label: "Read more",
        "on-click": onReadMoreClick,
        "is-small": true
      })
    ]),
    createVNode(_component_SectionTitle, {
      label: __props.sectionLabel,
      "section-id": "2"
    }, null, 8, ["label"])
  ], 2))
}
}

};

const _sfc_main$2 = {
  __name: "HomeTeamMember",
  props: {
  name: { type: String, required: true },
  position: { type: String, required: true },
  isActive: { type: Boolean, default: false }
},
  setup(__props) {

const props = __props;

const nameEl = ref(null);
let nameChars = null;
const onNameSplitDone = (split) => {
  nameChars = split.chars;
};

const positionEl = ref(null);
let positionChars = null;
const onPositionSplitDone = (split) => {
  positionChars = split.chars;
};

let tl = null;
watch(
  () => props.isActive,
  (newVal) => {
    gsapWithCSS.killTweensOf([nameEl.value, positionEl.value]);

    tl?.kill();
    tl = gsapWithCSS.timeline();

    if (newVal) {
      gsapWithCSS.set([nameEl.value, positionEl.value], {
        autoAlpha: 1
      });

      nameChars = gsapWithCSS.utils.shuffle(nameChars);
      tl.fromTo(
        nameChars,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          duration: 0.6,
          stagger: 0.06
        },
        0.1
      );
      tl.fromTo(
        nameEl.value,
        { x: 60 },
        {
          x: 0,
          duration: 1.2,
          ease: 'expoOut'
        },
        0
      );

      positionChars = gsapWithCSS.utils.shuffle(positionChars);
      tl.fromTo(
        positionChars,
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          duration: 0.6,
          stagger: 0.06
        },
        0.15
      );
      tl.fromTo(
        positionEl.value,
        { x: 60 },
        {
          x: 0,
          duration: 1.2,
          ease: 'expoOut'
        },
        0.15
      );
    } else {
      tl.to(
        [nameEl.value, positionEl.value],
        {
          autoAlpha: 0,
          stagger: 0.1
        },
        0
      );
    }
  }
);

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$6;

  return (openBlock(), createElementBlock("div", {
    class: normalizeClass([{ 'home-team-member--active': __props.isActive }, "home-team-member"])
  }, [
    createBaseVNode("p", {
      ref_key: "nameEl",
      ref: nameEl,
      class: "h2"
    }, [
      createVNode(_component_TextSplitter, {
        content: __props.name,
        type: "chars",
        "char-class": "home-team-member__char",
        "should-restore": false,
        "should-set-delay": false,
        "should-resize": false,
        callback: onNameSplitDone
      }, null, 8, ["content"])
    ], 512),
    createBaseVNode("p", {
      ref_key: "positionEl",
      ref: positionEl,
      class: "home-team-member__position btn-label ttu"
    }, [
      createVNode(_component_TextSplitter, {
        content: __props.position,
        type: "chars",
        "char-class": "home-team-member__char",
        "should-restore": false,
        "should-set-delay": false,
        "should-resize": false,
        callback: onPositionSplitDone
      }, null, 8, ["content"])
    ], 512)
  ], 2))
}
}

};

const _hoisted_1 = { class: "home-team__wrapper" };
const _hoisted_2 = { class: "home-team__copy-wrapper" };
const _hoisted_3 = { class: "home-team__copy body-copy" };
const _hoisted_4 = { class: "home-team__copy-cta" };
const _hoisted_5 = { class: "home-team__inner" };
const _hoisted_6 = { class: "home-team__members" };
const _hoisted_7 = { class: "home-team__cta" };
const _sfc_main$1 = {
  __name: "HomeTeam",
  props: {
  sectionLabel: { type: String, required: true },
  title: { type: Object, required: true },
  copy: { type: Object, required: true }
},
  setup(__props, { expose: __expose }) {



const dataStore = useDataStore();
const { allTeamMembers, teamActiveIndex } = storeToRefs(dataStore);
const formattedUrls = computed(() =>
  allTeamMembers.value?.map(({ depthMap, normalMap, portrait }) => ({
    raw: portrait,
    depth: depthMap,
    normal: normalMap
  }))
);

const itemsLength = computed(() => allTeamMembers.value.length);
const currentActive = teamActiveIndex;
const isTransitioning = ref(false);

const { $soundManager } = useNuxtApp();

let prevSfxMuted = null;
const handleSfxTeamControl = ({ muted, volume }) => {
  $soundManager?.setSoundVolume('teamFooterLoop', volume);
  if (muted !== prevSfxMuted) {
    prevSfxMuted = muted;
    if (muted) {
      $soundManager?.pauseSound('teamFooterLoop');
    } else {
      $soundManager?.playSound('teamFooterLoop');
    }
  }
};

const getMorphSound = gsapWithCSS.utils.wrap([
  'faceMorph1',
  'faceMorph2',
  'faceMorph3'
]);
let morphSoundIndex = 0;

const getPrevId = () =>
  currentActive.value > 0 ? currentActive.value - 1 : itemsLength.value - 1;
const getNextId = () =>
  currentActive.value < itemsLength.value - 1 ? currentActive.value + 1 : 0;

const onPrevClick = () => {
  if (isTransitioning.value) return
  isTransitioning.value = true;
  currentActive.value = getPrevId();
  dispatcherSingleton.trigger({ name: 'portraitPrev' }, {});

  $soundManager?.playSound(getMorphSound(morphSoundIndex++));
};
const onNextClick = () => {
  if (isTransitioning.value) return
  isTransitioning.value = true;
  currentActive.value = getNextId();
  dispatcherSingleton.trigger({ name: 'portraitNext' }, {});

  $soundManager?.playSound(getMorphSound(morphSoundIndex++));
};

const onPortraitChanged = () => {
  isTransitioning.value = false;
};
onMounted(() => {
  dispatcherSingleton.on('portraitChanged', onPortraitChanged);
  dispatcherSingleton.on('sfxTeamControl', handleSfxTeamControl);

  dispatcherSingleton.trigger({ name: 'portraitUrls' }, formattedUrls.value);
});
onUnmounted(() => {
  dispatcherSingleton.off('portraitChanged', onPortraitChanged);
  dispatcherSingleton.off('sfxTeamControl', handleSfxTeamControl);

  tlIn?.kill();
});

const isMobileCopyVisible = ref(false);
const onReadMoreClick = () => {
  isMobileCopyVisible.value = !isMobileCopyVisible.value;
};

const { elementRef, animateIn, animateOut, show, hide, isVisible } =
  useSectionComponent('sectionTeam');

let tlIn = null;
let titleSplit = null;
const onSplitDone = (split) => {
  titleSplit = split;

  tlIn = gsapWithCSS.timeline({ paused: true });
  tlIn.fromTo(
    titleSplit.lines[0],
    {
      xPercent: 20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'exPercentpoOut'
    },
    0
  );

  tlIn.fromTo(
    titleSplit.lines[1],
    {
      xPercent: -20
    },
    {
      xPercent: 0,
      duration: 1.2,
      ease: 'expoOut'
    },
    0.1
  );
};
watch(isVisible, (val) => {
  if (val) tlIn?.play(0);
});

__expose({
  animateIn,
  animateOut,
  show,
  hide
});

return (_ctx, _cache) => {
  const _component_TextSplitter = _sfc_main$6;
  const _component_BaseButton = _sfc_main$7;
  const _component_NavPrevNext = _sfc_main$9;
  const _component_HomeTeamMember = _sfc_main$2;
  const _component_SectionTitle = _sfc_main$8;

  return (openBlock(), createElementBlock("div", {
    ref_key: "elementRef",
    ref: elementRef,
    class: normalizeClass([{
      'is-visible': unref(isVisible),
      'home-team--xs-toggled': unref(isMobileCopyVisible)
    }, "home-team grid fixed-section"])
  }, [
    createBaseVNode("div", _hoisted_1, [
      createVNode(_component_TextSplitter, {
        class: "home-team__title h1",
        content: __props.title,
        "content-tag": "h2",
        "split-tag": "div",
        type: "lines, chars",
        "char-class": "anim-fade",
        "is-rich-text": true,
        "should-restore": false,
        "should-resize": false,
        callback: onSplitDone
      }, null, 8, ["content"]),
      createBaseVNode("div", _hoisted_2, [
        createBaseVNode("div", _hoisted_3, [
          createVNode(_component_TextSplitter, {
            content: __props.copy,
            "base-delay": 0.1,
            "split-tag": "div",
            type: "lines",
            "is-rich-text": true,
            "line-class": "anim-fade",
            "should-restore": false
          }, null, 8, ["content"])
        ]),
        createBaseVNode("div", _hoisted_4, [
          createVNode(_component_BaseButton, {
            label: "Back to homepage",
            "on-click": onReadMoreClick
          })
        ])
      ])
    ]),
    createBaseVNode("div", _hoisted_5, [
      createVNode(_component_NavPrevNext, {
        "is-vertical": true,
        "prev-aria-label": "Show previous team member",
        "on-prev-click": onPrevClick,
        "next-aria-label": "Show next team member",
        "on-next-click": onNextClick,
        "is-disabled": unref(isTransitioning),
        "is-visible": unref(isVisible)
      }, null, 8, ["is-disabled", "is-visible"]),
      createBaseVNode("div", _hoisted_6, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(allTeamMembers), ({ name, position }, id) => {
          return (openBlock(), createBlock(_component_HomeTeamMember, {
            key: id,
            name: name,
            position: position,
            "is-active": unref(isVisible) && unref(currentActive) === id
          }, null, 8, ["name", "position", "is-active"]))
        }), 128))
      ])
    ]),
    createBaseVNode("div", _hoisted_7, [
      createVNode(_component_BaseButton, {
        label: "Read more",
        "on-click": onReadMoreClick,
        "is-small": true
      })
    ]),
    createVNode(_component_SectionTitle, {
      label: __props.sectionLabel,
      "section-id": "3"
    }, null, 8, ["label"])
  ], 2))
}
}

};

const homePageQuery = groq`
  *[_type == "homePage" && _id == "homePage"][0] {
    ${seoFragment},
    heroSection {
      hero_title,
      hero_cta_label
    },
    investorsSection {
      investors_section_label,
      investors_title,
      investors_copy
    },
    portfolioSection {
      portfolio_section_label,
      portfolio_title,
      portfolio_copy,
      portfolio_cta_label
    },
    teamSection {
      team_section_label,
      team_title,
      team_copy
    }
  }
`;

// ? Home data fetch

const _sfc_main = {
  __name: 'index',
  async setup(__props) {

let __temp, __restore;

const { data } = (
  ([__temp,__restore] = withAsyncContext(() => useSanityQuery(homePageQuery))),
  __temp = await __temp,
  __restore(),
  __temp
);

if (!data?.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

// ? SEO data
const seo = computed(() => {
  const { seo } = data.value.data;

  return {
    title: seo?.title,
    description: seo?.description,
    image: seo?.image?.asset?.url
  }
});

// ? Hero data
const hero = computed(() => {
  const { heroSection } = data.value.data;

  return {
    title: heroSection?.hero_title,
    ctaLabel: heroSection?.hero_cta_label
  }
});

// ? Investors data
const investors = computed(() => {
  const { investorsSection } = data.value.data;

  return {
    sectionLabel: investorsSection?.investors_section_label,
    title: investorsSection?.investors_title,
    copy: investorsSection?.investors_copy
  }
});

// ? Portfolio data
const { allCompanies } = storeToRefs(useDataStore());
const portfolio = computed(() => {
  const { portfolioSection } = data.value.data;

  return {
    sectionLabel: portfolioSection?.portfolio_section_label,
    title: portfolioSection?.portfolio_title,
    copy: portfolioSection?.portfolio_copy,
    cta: {
      label: portfolioSection?.portfolio_cta_label,
      url: allCompanies?.value[0]?.url || '/' // ? link to first company in the CMS
    }
  }
});

// ? Team data
const team = computed(() => {
  const { teamSection } = data.value.data;

  return {
    sectionLabel: teamSection?.team_section_label,
    title: teamSection?.team_title,
    copy: teamSection?.team_copy
  }
});

usePageMixin();
useSeo(seo?.value, 'Home');

return (_ctx, _cache) => {
  const _component_HomeHero = _sfc_main$5;
  const _component_HomeInvestors = _sfc_main$4;
  const _component_HomePortfolio = _sfc_main$3;
  const _component_HomeTeam = _sfc_main$1;
  const _component_Footer = _sfc_main$a;
  const _component_Scrollbar = _sfc_main$b;

  return (openBlock(), createElementBlock("div", null, [
    createVNode(_component_HomeHero, normalizeProps(guardReactiveProps(unref(hero))), null, 16),
    createVNode(_component_HomeInvestors, normalizeProps(guardReactiveProps(unref(investors))), null, 16),
    createVNode(_component_HomePortfolio, normalizeProps(guardReactiveProps(unref(portfolio))), null, 16),
    createVNode(_component_HomeTeam, normalizeProps(guardReactiveProps(unref(team))), null, 16),
    createVNode(_component_Footer),
    createVNode(_component_Scrollbar)
  ]))
}
}

};

export { _sfc_main as default };
