import { $ as useHead$1, b as useNuxtApp, a0 as hasInjectionContext, a1 as inject, a2 as headSymbol, a3 as onBeforeMount, d as onMounted, a4 as onBeforeUnmount, f as onUnmounted, H as storeToRefs, a5 as SOCIAL_SHARE_FALLBACK, a6 as DOMAIN_NAME } from '#entry';
import { u as useDataStore } from './lMIEOdbu.js';

function injectHead(nuxtApp) {
  const nuxt = nuxtApp || useNuxtApp();
  return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
    if (hasInjectionContext()) {
      const head = inject(headSymbol);
      if (!head) {
        throw new Error("[nuxt] [unhead] Missing Unhead instance.");
      }
      return head;
    }
  });
}
function useHead(input, options = {}) {
  const head = options.head || injectHead(options.nuxt);
  return useHead$1(input, { head, ...options });
}

const usePageMixin = () => {
  const { callHook } = useNuxtApp();

  onBeforeMount(() => {});

  onMounted(() => {
    callHook('PAGE:MOUNTED');
  });

  onBeforeUnmount(() => {
    callHook('PAGE:BEFORE-DESTROY');
  });

  onUnmounted(() => {
    callHook('PAGE:DESTROYED');
  });
};

const useSeo = (
  { title = '', description = '', image = null }, // ? seo
  pageTitle,
  slug = ''
) => {
  const { globalData } = storeToRefs(useDataStore());
  const { description: fallbackDescription = '', image: fallbackImage } =
    globalData.value.seo;

  const cptedTitle = title || pageTitle;
  const cptedDescription = description || fallbackDescription;
  const cptedSocialShareImg =
    image || fallbackImage?.url || SOCIAL_SHARE_FALLBACK;

  const descriptions = [
    {
      name: 'description',
      hid: 'description',
      content: cptedDescription
    },
    {
      property: 'og:description',
      hid: 'og_description',
      content: cptedDescription
    },
    {
      property: 'og:image:alt',
      hid: 'og_image_alt',
      content: cptedDescription
    },
    {
      name: 'twitter:description',
      hid: 'twitter_description',
      content: cptedDescription
    },
    {
      name: 'twitter:image:alt',
      hid: 'twitter_image_alt',
      content: cptedDescription
    }
  ];
  const images = [
    {
      property: 'og:image',
      hid: 'og_image',
      content: cptedSocialShareImg
    },
    {
      property: 'og:image:secure_url',
      hid: 'og_image_secure',
      content: cptedSocialShareImg
    },
    {
      name: 'twitter:image:src',
      hid: 'twitter_image',
      content: cptedSocialShareImg
    },
    { name: 'twitter:image', content: cptedSocialShareImg }
  ];
  const titles = [
    { name: 'keywords', content: cptedTitle },
    {
      property: 'og:title',
      hid: 'og_title',
      content: cptedTitle
    },
    {
      name: 'twitter:title',
      hid: 'twitter_title',
      content: cptedTitle
    }
  ];
  useHead({
    title: cptedTitle,
    meta: [
      ...(cptedTitle ? titles : []),
      ...(cptedDescription ? descriptions : []),
      ...(images )
    ],
    link: [{ rel: 'canonical', href: `${DOMAIN_NAME}/${slug}` }]
  });
};

export { useSeo as a, usePageMixin as u };
