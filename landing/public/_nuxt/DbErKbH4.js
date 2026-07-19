import { N as withAsyncContext, I as useRoute, J as createError, d as onMounted, e as dispatcherSingleton, f as onUnmounted, O as gsapWithCSS, S as ScrollTrigger, x as ref, c as createElementBlock, C as createBaseVNode, D as toDisplayString, u as unref, a as createVNode, n as computed, P as _sfc_main$1, Q as homeView, o as openBlock } from '#entry';
import _sfc_main$2 from './BoAlSyXz.js';
import { _ as _sfc_main$3 } from './DwgGGfV0.js';
import { s as seoFragment, g as groq, a as useSanityQuery } from './lMIEOdbu.js';
import { u as usePageMixin, a as useSeo } from './zwo0n8NT.js';

const legalPagesQuery = groq`
  *[_type == "legalPage"] {
    _id,
    title,
    content,
    "slug": slug.current,
    "lastUpdated": _updatedAt,
    ${seoFragment}
  }
`;

const _hoisted_1 = { class: "legal-page" };
const _hoisted_2 = { class: "legal__wrapper" };
const _hoisted_3 = { class: "legal__title ff-labor ttu" };
// ? Legal data fetch

const _sfc_main = {
  __name: '[slug]',
  async setup(__props) {

let __temp, __restore;

const { data } = (
  ([__temp,__restore] = withAsyncContext(() => useSanityQuery(legalPagesQuery))),
  __temp = await __temp,
  __restore(),
  __temp
);

// ? Find current company in array from store
const route = useRoute();
const currentPageData = computed(() =>
  data.value?.data?.find(({ slug }) => slug === route.params.slug)
);

// ? If it doesn't exist, throw 404
if (!currentPageData.value) throw createError({ statusCode: 404 })

// ? SEO data
const seo = computed(() => {
  const { seo } = currentPageData.value;

  return {
    title: seo?.title,
    description: seo?.description,
    image: seo?.image?.asset?.url
  }
});

const content = computed(() => {
  const { title, content } = currentPageData.value;

  return { title, copy: content }
});

onMounted(() => {
  dispatcherSingleton.trigger({ name: 'pause' }, {});
  homeView?.disableScroll();
  initTrigger();
});

onUnmounted(() => {
  dispatcherSingleton.trigger({ name: 'resume' }, {});
  homeView?.enableScroll();
  footerTrigger?.kill();
});

const footer = ref(null);
let mm;
let footerTrigger = null;
const initTrigger = () => {
  if (!footer.value.elementRef) return false

  mm = gsapWithCSS.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    footerTrigger = ScrollTrigger.create({
      trigger: footer.value.elementRef,
      start: 'top bottom+=200px',
      onToggle: onFooterToggle
    });

    return () => {
      footerTrigger?.kill();
      isBackButtonVisible.value = true;
    }
  });
};
const isBackButtonVisible = ref(true);
const onFooterToggle = () => {
  isBackButtonVisible.value = !isBackButtonVisible.value;
};

usePageMixin();
useSeo(seo?.value, currentPageData.value?.title);

return (_ctx, _cache) => {
  const _component_StructuredText = _sfc_main$1;
  const _component_BackButton = _sfc_main$2;
  const _component_Footer = _sfc_main$3;

  return (openBlock(), createElementBlock("div", _hoisted_1, [
    createBaseVNode("div", _hoisted_2, [
      createBaseVNode("h1", _hoisted_3, toDisplayString(unref(content).title), 1),
      createVNode(_component_StructuredText, {
        class: "legal__copy",
        content: unref(content).copy
      }, null, 8, ["content"])
    ]),
    createVNode(_component_BackButton, {
      "is-visible": unref(isBackButtonVisible),
      "is-in-xs-header": true
    }, null, 8, ["is-visible"]),
    createVNode(_component_Footer, {
      ref_key: "footer",
      ref: footer,
      "show-title": false
    }, null, 512)
  ]))
}
}

};

export { _sfc_main as default };
