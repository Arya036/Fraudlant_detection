import { h as defu, j as hasProtocol, w as withLeadingSlash, k as joinURL, p as parseURL, l as encodePath, b as useNuxtApp, m as useRuntimeConfig, n as computed, q as useAttrs, r as useTemplateRef, d as onMounted, o as openBlock, c as createElementBlock, s as mergeProps, t as renderSlot, v as normalizeProps, x as ref, y as watch, f as onUnmounted, S as ScrollTrigger, u as unref, z as createBlock, A as normalizeClass, B as createCommentVNode, C as createBaseVNode, D as toDisplayString, a as createVNode, _ as _sfc_main$4, E as normalizeStyle, F as isLoaderVisiblePromise, G as nextTick, H as storeToRefs, I as useRoute, J as createError, e as dispatcherSingleton, K as usePageTransition, L as onBeforeRouteLeave } from '#entry';
import { u as useDataStore } from './lMIEOdbu.js';
import { u as useCompanyNav } from './DYt7FIrk.js';
import { u as usePageMixin, a as useSeo } from './zwo0n8NT.js';

async function imageMeta(_ctx, url) {
  const meta = await _imageMeta(url).catch((err) => {
    console.error("Failed to get image meta for " + url, err + "");
    return {
      width: 0,
      height: 0,
      ratio: 0
    };
  });
  return meta;
}
async function _imageMeta(url) {
  if (typeof Image === "undefined") {
    throw new TypeError("Image not supported");
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const meta = {
        width: img.width,
        height: img.height,
        ratio: img.width / img.height
      };
      resolve(meta);
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function createMapper(map) {
  return ((key) => key !== void 0 ? map[key] || key : map.missingValue);
}
function createOperationsGenerator(config = {}) {
  const formatter = config.formatter;
  const keyMap = config.keyMap && typeof config.keyMap !== "function" ? createMapper(config.keyMap) : config.keyMap;
  const map = {};
  for (const key in config.valueMap) {
    const valueKey = key;
    const value = config.valueMap[valueKey];
    map[valueKey] = typeof value === "object" ? createMapper(value) : value;
  }
  return (modifiers) => {
    const operations = [];
    for (const _key in modifiers) {
      const key = _key;
      if (typeof modifiers[key] === "undefined") {
        continue;
      }
      const value = typeof map[key] === "function" ? map[key](modifiers[key]) : modifiers[key];
      operations.push([keyMap ? keyMap(key) : key, value]);
    }
    if (formatter) {
      return operations.map((entry) => formatter(...entry)).join(config.joinWith ?? "&");
    }
    return new URLSearchParams(operations).toString();
  };
}
function parseDensities(input = "") {
  if (input === void 0 || !input.length) {
    return [];
  }
  const densities = /* @__PURE__ */ new Set();
  for (const density of input.split(" ")) {
    const d = Number.parseInt(density.replace("x", ""));
    if (d) {
      densities.add(d);
    }
  }
  return Array.from(densities);
}
function checkDensities(densities) {
  if (densities.length === 0) {
    throw new Error("`densities` must not be empty, configure to `1` to render regular size only (DPR 1.0)");
  }
}
function parseSize(input = "") {
  if (typeof input === "number") {
    return input;
  }
  if (typeof input === "string") {
    if (input.replace("px", "").match(/^\d+$/g)) {
      return Number.parseInt(input, 10);
    }
  }
}
function parseSizes(input) {
  const sizes = {};
  if (typeof input === "string") {
    for (const entry of input.split(/[\s,]+/).filter((e) => e)) {
      const s = entry.split(":");
      if (s.length !== 2) {
        sizes["1px"] = s[0].trim();
      } else {
        sizes[s[0].trim()] = s[1].trim();
      }
    }
  } else {
    Object.assign(sizes, input);
  }
  return sizes;
}

function createImage(globalOptions) {
  const ctx = {
    options: globalOptions
  };
  const getImage = (input, options = {}) => {
    const image = resolveImage(ctx, input, options);
    return image;
  };
  const $img = ((input, modifiers, options) => getImage(input, defu({ modifiers }, options)).url);
  for (const presetName in globalOptions.presets) {
    $img[presetName] = ((source, modifiers, options) => $img(source, modifiers, { ...globalOptions.presets[presetName], ...options }));
  }
  $img.options = globalOptions;
  $img.getImage = getImage;
  $img.getMeta = ((input, options) => getMeta(ctx, input, options));
  $img.getSizes = ((input, options) => getSizes(ctx, input, options));
  ctx.$img = $img;
  return $img;
}
async function getMeta(ctx, input, options) {
  const image = resolveImage(ctx, input, { ...options });
  if (typeof image.getMeta === "function") {
    return await image.getMeta();
  } else {
    return await imageMeta(ctx, image.url);
  }
}
function resolveImage(ctx, input, options) {
  if (input && typeof input !== "string") {
    throw new TypeError(`input must be a string (received ${typeof input}: ${JSON.stringify(input)})`);
  }
  if (!input || input.startsWith("data:")) {
    return {
      url: input
    };
  }
  const { setup, defaults } = getProvider(ctx, options.provider || ctx.options.provider);
  const provider = setup();
  const preset = getPreset(ctx, options.preset);
  input = hasProtocol(input) ? input : withLeadingSlash(input);
  if (!provider.supportsAlias) {
    for (const base in ctx.options.alias) {
      if (input.startsWith(base)) {
        const alias = ctx.options.alias[base];
        if (alias) {
          input = joinURL(alias, input.slice(base.length));
        }
      }
    }
  }
  if (provider.validateDomains && hasProtocol(input)) {
    const inputHost = parseURL(input).host;
    if (!ctx.options.domains.find((d) => d === inputHost)) {
      return {
        url: input
      };
    }
  }
  const _options = defu(options, preset, defaults);
  const resolvedOptions = {
    ..._options,
    modifiers: {
      ..._options.modifiers,
      width: _options.modifiers?.width ? parseSize(_options.modifiers.width) : void 0,
      height: _options.modifiers?.height ? parseSize(_options.modifiers.height) : void 0
    }
  };
  const image = provider.getImage(input, resolvedOptions, ctx);
  image.format ||= resolvedOptions.modifiers.format || "";
  return image;
}
function getProvider(ctx, name) {
  const provider = ctx.options.providers[name];
  if (!provider) {
    throw new Error("Unknown provider: " + name);
  }
  return provider;
}
function getPreset(ctx, name) {
  if (!name) {
    return {};
  }
  if (!ctx.options.presets[name]) {
    throw new Error("Unknown preset: " + name);
  }
  return ctx.options.presets[name];
}
function getSizes(ctx, input, opts) {
  const preset = getPreset(ctx, opts.preset);
  const merged = defu(opts, preset);
  const width = parseSize(merged.modifiers?.width);
  const height = parseSize(merged.modifiers?.height);
  const sizes = merged.sizes ? parseSizes(merged.sizes) : {};
  const _densities = merged.densities?.trim();
  const densities = _densities ? parseDensities(_densities) : ctx.options.densities;
  checkDensities(densities);
  const hwRatio = width && height ? height / width : 0;
  const sizeVariants = [];
  const srcsetVariants = [];
  if (Object.keys(sizes).length >= 1) {
    for (const key in sizes) {
      const variant = getSizesVariant(key, String(sizes[key]), height, hwRatio, ctx);
      if (variant === void 0) {
        continue;
      }
      sizeVariants.push({
        size: variant.size,
        screenMaxWidth: variant.screenMaxWidth,
        media: `(max-width: ${variant.screenMaxWidth}px)`
      });
      for (const density of densities) {
        srcsetVariants.push({
          width: variant._cWidth * density,
          src: getVariantSrc(ctx, input, opts, variant, density)
        });
      }
    }
    finaliseSizeVariants(sizeVariants);
  } else {
    for (const density of densities) {
      const key = Object.keys(sizes)[0];
      let variant = key ? getSizesVariant(key, String(sizes[key]), height, hwRatio, ctx) : void 0;
      if (variant === void 0) {
        variant = {
          size: "",
          screenMaxWidth: 0,
          _cWidth: opts.modifiers?.width,
          _cHeight: opts.modifiers?.height
        };
      }
      srcsetVariants.push({
        width: density,
        src: getVariantSrc(ctx, input, opts, variant, density)
      });
    }
  }
  finaliseSrcsetVariants(srcsetVariants);
  const defaultVariant = srcsetVariants[srcsetVariants.length - 1];
  const sizesVal = sizeVariants.length ? sizeVariants.map((v) => `${v.media ? v.media + " " : ""}${v.size}`).join(", ") : void 0;
  const suffix = sizesVal ? "w" : "x";
  const srcsetVal = srcsetVariants.map((v) => `${v.src} ${v.width}${suffix}`).join(", ");
  return {
    sizes: sizesVal,
    srcset: srcsetVal,
    src: defaultVariant?.src
  };
}
function getSizesVariant(key, size, height, hwRatio, ctx) {
  const screenMaxWidth = ctx.options.screens && ctx.options.screens[key] || Number.parseInt(key);
  const isFluid = size.endsWith("vw");
  if (!isFluid && /^\d+$/.test(size)) {
    size = size + "px";
  }
  if (!isFluid && !size.endsWith("px")) {
    return void 0;
  }
  let _cWidth = Number.parseInt(size);
  if (!screenMaxWidth || !_cWidth) {
    return void 0;
  }
  if (isFluid) {
    _cWidth = Math.round(_cWidth / 100 * screenMaxWidth);
  }
  const _cHeight = hwRatio ? Math.round(_cWidth * hwRatio) : height;
  return {
    size,
    screenMaxWidth,
    _cWidth,
    _cHeight
  };
}
function getVariantSrc(ctx, input, opts, variant, density) {
  return ctx.$img(
    input,
    {
      ...opts.modifiers,
      width: variant._cWidth ? variant._cWidth * density : void 0,
      height: variant._cHeight ? variant._cHeight * density : void 0
    },
    opts
  );
}
function finaliseSizeVariants(sizeVariants) {
  sizeVariants.sort((v1, v2) => v1.screenMaxWidth - v2.screenMaxWidth);
  let previousMedia = null;
  for (let i = sizeVariants.length - 1; i >= 0; i--) {
    const sizeVariant = sizeVariants[i];
    if (sizeVariant.media === previousMedia) {
      sizeVariants.splice(i, 1);
    }
    previousMedia = sizeVariant.media;
  }
  for (let i = 0; i < sizeVariants.length; i++) {
    sizeVariants[i].media = sizeVariants[i + 1]?.media || "";
  }
}
function finaliseSrcsetVariants(srcsetVariants) {
  srcsetVariants.sort((v1, v2) => v1.width - v2.width);
  let previousWidth = null;
  for (let i = srcsetVariants.length - 1; i >= 0; i--) {
    const sizeVariant = srcsetVariants[i];
    if (sizeVariant.width === previousWidth) {
      srcsetVariants.splice(i, 1);
    }
    previousWidth = sizeVariant.width;
  }
}

function defineProvider(setup) {
  let result;
  return () => {
    if (result) {
      return result;
    }
    result = typeof setup === "function" ? setup() : setup;
    return result;
  };
}

const sanityCDN = "/sanity/images";
const operationsGenerator = createOperationsGenerator({
  keyMap: {
    "format": "fm",
    "height": "h",
    "quality": "q",
    "width": "w",
    // Convenience modifiers
    "background": "bg",
    "download": "dl",
    "dpr": "dpr",
    "sharpen": "sharp",
    "orientation": "or",
    "min-height": "min-h",
    "max-height": "max-h",
    "min-width": "min-w",
    "max-width": "max-w",
    "minHeight": "min-h",
    "maxHeight": "max-h",
    "minWidth": "min-w",
    "maxWidth": "max-w",
    "saturation": "sat"
  },
  valueMap: {
    format: {
      jpeg: "jpg"
    },
    fit: {
      cover: "crop",
      contain: "fill",
      fill: "scale",
      inside: "min",
      outside: "max"
    }
  },
  formatter: (key, value) => String(value) === "true" ? key : encodePath(`${key}=${value}`)
});
const getMetadata = (id) => {
  const result = id.match(/-(?<width>\d*)x(?<height>\d*)-(?<format>.*)$/);
  if (!result || !result.groups) {
    return { width: void 0, height: void 0, format: void 0 };
  }
  const width = Number(result.groups.width);
  const height = Number(result.groups.height);
  return {
    width,
    height,
    format: result.groups.format
  };
};
const sanityRuntime$_1_j8g_3SeyucR_45aipknYRUyL6q0OE0IVeLgQOuox3wQ = defineProvider({
  getImage: (src, { modifiers, projectId, dataset = "production" }) => {
    const { height: sourceHeight, width: sourceWidth } = getMetadata(src);
    if (modifiers.crop && typeof modifiers.crop !== "string" && sourceWidth && sourceHeight) {
      const left = modifiers.crop.left * sourceWidth;
      const top = modifiers.crop.top * sourceHeight;
      const right = sourceWidth - modifiers.crop.right * sourceWidth;
      const bottom = sourceHeight - modifiers.crop.bottom * sourceHeight;
      modifiers.rect = [left, top, right - left, bottom - top].map((i) => i.toFixed(0)).join(",");
      delete modifiers.crop;
    }
    if (modifiers.hotspot && typeof modifiers.hotspot !== "string") {
      modifiers["fp-x"] = modifiers.hotspot.x;
      modifiers["fp-y"] = modifiers.hotspot.y;
      delete modifiers.hotspot;
    }
    if (!modifiers.format || modifiers.format === "auto") {
      if (modifiers.format === "auto") {
        delete modifiers.format;
      }
      modifiers.auto = "format";
    }
    if (modifiers.fit === "contain" && !modifiers.bg) {
      modifiers.bg = "ffffff";
    }
    const operations = operationsGenerator(modifiers);
    const parts = src.split("-").slice(1);
    const format = parts.pop();
    const filenameAndQueries = parts.join("-") + "." + format + (operations ? "?" + operations : "");
    return {
      url: joinURL(sanityCDN, projectId, dataset, filenameAndQueries)
    };
  }
});

const imageOptions = {
    ...{
  "screens": {
    "sm": 768,
    "md": 1024,
    "lg": 2048,
    "xl": 2880,
    "2xl": 1536,
    "xs": 375,
    "xxl": 3840
  },
  "presets": {},
  "provider": "sanity",
  "domains": [
    "localhost"
  ],
  "alias": {},
  "densities": [
    1,
    2
  ],
  "format": [
    "webp"
  ]
},
    /** @type {"sanity"} */
    provider: "sanity",
    providers: {
        ['sanity']: { setup: sanityRuntime$_1_j8g_3SeyucR_45aipknYRUyL6q0OE0IVeLgQOuox3wQ, defaults: {"projectId":"diak0tmr"} }
    }
  };

const useImage = (event) => {
  const config = useRuntimeConfig();
  const nuxtApp = useNuxtApp();
  return nuxtApp.$img || nuxtApp._img || (nuxtApp._img = createImage({
    ...imageOptions,
    event: nuxtApp.ssrContext?.event,
    nuxt: {
      baseURL: config.app.baseURL
    },
    runtimeConfig: config
  }));
};

function markFeatureUsage(featureName) {
  performance?.mark?.("mark_feature_usage", {
    detail: {
      feature: featureName
    }
  });
}

const useImageProps = (props) => {
  const $img = useImage();
  const providerOptions = computed(() => ({
    provider: props.provider,
    preset: props.preset
  }));
  const normalizedAttrs = computed(() => ({
    width: parseSize(props.width),
    height: parseSize(props.height),
    crossorigin: props.crossorigin === true ? "anonymous" : props.crossorigin || void 0,
    nonce: props.nonce
  }));
  const imageModifiers = computed(() => {
    return {
      ...props.modifiers,
      width: props.width,
      height: props.height,
      format: props.format,
      quality: props.quality || $img.options.quality,
      background: props.background,
      fit: props.fit
    };
  });
  return { providerOptions, normalizedAttrs, imageModifiers };
};

const _hoisted_1$2 = ["src"];
const _sfc_main$3 = {
  __name: "NuxtImg",
  props: {
    custom: { type: Boolean, required: false },
    placeholder: { type: [Boolean, String, Number, Array], required: false },
    placeholderClass: { type: String, required: false },
    src: { type: String, required: false },
    format: { type: String, required: false },
    quality: { type: [String, Number], required: false },
    background: { type: String, required: false },
    fit: { type: String, required: false },
    modifiers: { type: Object, required: false },
    preset: { type: String, required: false },
    provider: { type: null, required: false },
    sizes: { type: [String, Object], required: false },
    densities: { type: String, required: false },
    preload: { type: [Boolean, Object], required: false },
    width: { type: [String, Number], required: false },
    height: { type: [String, Number], required: false },
    crossorigin: { type: [String, Boolean], required: false },
    nonce: { type: String, required: false }
  },
  emits: ["load", "error"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const $img = useImage();
    const { providerOptions, normalizedAttrs, imageModifiers } = useImageProps(props);
    const sizes = computed(() => $img.getSizes(props.src, {
      ...providerOptions.value,
      sizes: props.sizes,
      densities: props.densities,
      modifiers: imageModifiers.value
    }));
    const placeholderLoaded = ref(false);
    const attrs = useAttrs();
    const imgAttrs = computed(() => ({
      ...normalizedAttrs.value,
      "data-nuxt-img": "",
      ...!props.placeholder || placeholderLoaded.value ? { sizes: sizes.value.sizes, srcset: sizes.value.srcset } : {},
      ...{},
      ...attrs
    }));
    const placeholder = computed(() => {
      if (placeholderLoaded.value) {
        return false;
      }
      const placeholder2 = props.placeholder === "" ? [10, 10] : props.placeholder;
      if (!placeholder2) {
        return false;
      }
      if (typeof placeholder2 === "string") {
        return placeholder2;
      }
      const [width = 10, height = width, quality = 50, blur = 3] = Array.isArray(placeholder2) ? placeholder2 : typeof placeholder2 === "number" ? [placeholder2] : [];
      return $img(props.src, {
        ...imageModifiers.value,
        width,
        height,
        quality,
        blur
      }, providerOptions.value);
    });
    const mainSrc = computed(
      () => props.sizes ? sizes.value.src : $img(props.src, imageModifiers.value, providerOptions.value)
    );
    const src = computed(() => placeholder.value || mainSrc.value);
    const initialLoad = useNuxtApp().isHydrating;
    const imgEl = useTemplateRef("imgEl");
    __expose({ imgEl });
    onMounted(() => {
      if (placeholder.value || props.custom) {
        const img = new Image();
        if (mainSrc.value) {
          img.src = mainSrc.value;
        }
        if (props.sizes) {
          img.sizes = sizes.value.sizes || "";
          img.srcset = sizes.value.srcset;
        }
        if (img.decode) {
          img.decode().then(() => {
            placeholderLoaded.value = true;
            emit("load", new Event("load"));
          }).catch((error) => {
            emit("error", error);
          });
        } else {
          img.onload = (event) => {
            placeholderLoaded.value = true;
            emit("load", event);
          };
          img.onerror = (event) => {
            emit("error", event);
          };
        }
        markFeatureUsage("nuxt-image");
        return;
      }
      if (!imgEl.value) {
        return;
      }
      if (imgEl.value.complete && initialLoad) {
        if (imgEl.value.getAttribute("data-error")) {
          emit("error", new Event("error"));
        } else {
          emit("load", new Event("load"));
        }
      }
      imgEl.value.onload = (event) => {
        emit("load", event);
      };
      imgEl.value.onerror = (event) => {
        emit("error", event);
      };
    });
    return (_ctx, _cache) => {
      return !__props.custom ? (openBlock(), createElementBlock("img", mergeProps({
        key: 0,
        ref_key: "imgEl",
        ref: imgEl,
        class: placeholder.value ? __props.placeholderClass : void 0
      }, imgAttrs.value, { src: src.value }), null, 16, _hoisted_1$2)) : renderSlot(_ctx.$slots, "default", normalizeProps(mergeProps({ key: 1 }, {
        imgAttrs: imgAttrs.value,
        isLoaded: placeholderLoaded.value,
        src: src.value
      })));
    };
  }
};
const __nuxt_component_0 = Object.assign(_sfc_main$3, { __name: "NuxtImg" });

const _hoisted_1$1 = ["src", "alt", "width", "height"];
const _hoisted_2$1 = ["src", "width", "height", "alt"];
const _sfc_main$2 = {
  __name: "BaseImage",
  props: {
  data: { type: Object, default: () => {} },
  alt: { type: String, default: '' },
  lazyType: { type: String, default: 'scroll' }, // ? scroll, force
  imageSizes: { type: String, default: null },
  isFit: { type: Boolean, default: false },
  onLoaded: { type: Function, default: () => {} },
  lazyThreshold: { type: String, default: '0% 0% 100%' },
  shouldLoad: { type: Boolean, default: true }
},
  setup(__props) {

const props = __props;

const container = ref(null);

const isLoading = ref(false);
const isLoaded = ref(false);

watch(
  () => props.shouldLoad,
  (newVal) => {
    if (isLoaded.value) return

    if (newVal) {
      observer?.cleanUp();
      loadImage();
    }
  }
);

const isSvg = computed(() => props.data?.src?.includes('.svg'));
const sizes = computed(() => {
  return (
    props.imageSizes ||
    'xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw xxxl:100vw'
  )
});
const placeholderSrc = computed(() => {
  const { width, height, responsiveImage } = props.data;

  const placeholderWidth = responsiveImage?.width || width;
  const placeholderHeight = responsiveImage?.height || height;

  return `data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20${placeholderWidth}%20${placeholderHeight}%22%3E%3Crect%20width=%22${placeholderWidth}%22%20height=%22${placeholderHeight}%22%20style=%22fill:%23000000%22%3E%3C/rect%3E%3C/svg%3E`
});

onMounted(() => {
  if (props.shouldLoad) initTrigger();
});

onUnmounted(() => {
  trigger?.kill();
});

let trigger = null;
const initTrigger = () => {
  if (props.lazyType !== 'scroll') loadImage();
  else {
    trigger = ScrollTrigger.create({
      trigger: container.value,
      start: props.lazyThreshold,
      once: true,
      onEnter: loadImage
    });
  }
};

const loadImage = () => {
  isLoading.value = true;
};
const onLoad = () => {
  isLoaded.value = true;
  if (props.onLoaded) props.onLoaded();
};

return (_ctx, _cache) => {
  const _component_NuxtImg = __nuxt_component_0;

  return (openBlock(), createElementBlock("picture", {
    ref_key: "container",
    ref: container,
    class: normalizeClass([{ 'base-image--fit': __props.isFit }, "base-image"])
  }, [
    (!unref(isLoading))
      ? (openBlock(), createElementBlock("img", {
          key: 0,
          class: "base-image__placeholder",
          src: unref(placeholderSrc),
          alt: __props.alt || '',
          width: __props.data.width,
          height: __props.data.height
        }, null, 8, _hoisted_1$1))
      : ((unref(isLoading) || unref(isLoaded)) && !unref(isSvg))
        ? (openBlock(), createBlock(_component_NuxtImg, {
            key: 1,
            class: normalizeClass([{
        'base-image__img--loaded': unref(isLoaded)
      }, "base-image__img"]),
            src: __props.data.src,
            width: __props.data.width,
            height: __props.data.height,
            fetchpriority: __props.lazyType === 'scroll' ? 'auto' : 'high',
            alt: __props.alt || '',
            sizes: unref(sizes),
            densities: "x1 x2",
            onLoad: onLoad
          }, null, 8, ["class", "src", "width", "height", "fetchpriority", "alt", "sizes"]))
        : ((unref(isLoading) || unref(isLoaded)) && unref(isSvg))
          ? (openBlock(), createElementBlock("img", {
              key: 2,
              src: __props.data.src,
              width: __props.data.width,
              height: __props.data.height,
              alt: __props.alt || ''
            }, null, 8, _hoisted_2$1))
          : createCommentVNode("", true)
  ], 2))
}
}

};

const _hoisted_1 = { class: "company-content__wrapper" };
const _hoisted_2 = {
  key: 0,
  class: "company-content__fig anim-fade"
};
const _hoisted_3 = ["href"];
const _hoisted_4 = {
  key: 0,
  class: "company-content__info-col anim-fade"
};
const _hoisted_5 = {
  key: 1,
  class: "company-content__info-col anim-fade"
};
const _hoisted_6 = {
  key: 2,
  class: "company-content__info-col anim-fade"
};
const _sfc_main$1 = {
  __name: "CompanyContent",
  props: {
  name: { type: String, required: true },
  logo: { type: String, default: '' },
  copy: { type: Object, default: () => {} },
  founded: { type: String, default: '' },
  invested: { type: String, default: '' },
  stage: { type: String, default: '' },
  websiteUrl: { type: String, default: '' },
  isVisible: { type: Boolean, default: false }
},
  setup(__props) {

const props = __props;

const hasLogo = computed(() => props.logo);

const formattedUrl = computed(
  () =>
    props.websiteUrl?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') ||
    null
);

const baseDelay = ref('0s');
const isSplitDone = ref(false);
const onSplitDone = async (split) => {
  await isLoaderVisiblePromise;

  baseDelay.value = `${split.lines.length * 0.1}s`;

  await nextTick();
  isSplitDone.value = true;
};

return (_ctx, _cache) => {
  const _component_BaseImage = _sfc_main$2;
  const _component_TextSplitter = _sfc_main$4;

  return (openBlock(), createElementBlock("div", {
    class: normalizeClass([{ 'is-visible': unref(isSplitDone) && __props.isVisible }, "company-content"])
  }, [
    createBaseVNode("div", _hoisted_1, [
      createBaseVNode("h1", {
        class: normalizeClass([{ 'company-content__title--hidden': unref(hasLogo) }, "company-content__title anim-fade"])
      }, toDisplayString(__props.name), 3),
      (unref(hasLogo))
        ? (openBlock(), createElementBlock("figure", _hoisted_2, [
            createVNode(_component_BaseImage, {
              data: { src: __props.logo, widht: 1, height: 1 },
              "lazy-type": "force",
              alt: __props.name
            }, null, 8, ["data", "alt"])
          ]))
        : createCommentVNode("", true),
      (__props.websiteUrl)
        ? (openBlock(), createElementBlock("a", {
            key: 1,
            class: "company-content__url anim-fade ttu btn-label",
            target: "_blank",
            rel: "noreferrer noopener",
            href: __props.websiteUrl
          }, toDisplayString(unref(formattedUrl)), 9, _hoisted_3))
        : createCommentVNode("", true),
      (__props.copy)
        ? (openBlock(), createBlock(_component_TextSplitter, {
            key: 2,
            class: "body-copy",
            content: __props.copy,
            "line-class": "anim-fade",
            "is-rich-text": true,
            "should-restore": false,
            "base-delay": 0.2,
            callback: onSplitDone
          }, null, 8, ["content"]))
        : createCommentVNode("", true),
      createBaseVNode("div", {
        style: normalizeStyle({ '--base-delay': unref(baseDelay) }),
        class: "company-content__info ttu btn-label"
      }, [
        (__props.founded)
          ? (openBlock(), createElementBlock("div", _hoisted_4, [
              _cache[0] || (_cache[0] = createBaseVNode("p", { class: "company-content__info-title" }, "Founded", -1)),
              createBaseVNode("p", null, toDisplayString(__props.founded), 1)
            ]))
          : createCommentVNode("", true),
        (__props.invested)
          ? (openBlock(), createElementBlock("div", _hoisted_5, [
              _cache[1] || (_cache[1] = createBaseVNode("p", { class: "company-content__info-title" }, "Invested", -1)),
              createBaseVNode("p", null, toDisplayString(__props.invested), 1)
            ]))
          : createCommentVNode("", true),
        (__props.stage)
          ? (openBlock(), createElementBlock("div", _hoisted_6, [
              _cache[2] || (_cache[2] = createBaseVNode("p", { class: "company-content__info-title" }, "Stage", -1)),
              createBaseVNode("p", null, toDisplayString(__props.stage), 1)
            ]))
          : createCommentVNode("", true)
      ], 4)
    ])
  ], 2))
}
}

};

const _sfc_main = {
  __name: '[slug]',
  setup(__props) {

const { allCompanies } = storeToRefs(useDataStore());

// ? Find current company in array from store
const route = useRoute();
const currentCompany = computed(() =>
  allCompanies.value?.find(({ slug }) => slug === route.params.slug)
);

// ? If it doesn't exist, throw 404
if (!currentCompany.value) throw createError({ statusCode: 404 })

// ? SEO fallback title
const formattedTitle = computed(() =>
  currentCompany.value?.name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
);

const { prevUrl, nextUrl, isVisible } = useCompanyNav();

// ? Prev/Next nav settings
const currentIndex = computed(() =>
  allCompanies.value.findIndex((c) => c.slug === route.params.slug)
);
prevUrl.value = computed(() => {
  const prevCompany = allCompanies.value.at(
    currentIndex.value === 0 ? -1 : currentIndex.value - 1
  );

  return prevCompany?.url
});
nextUrl.value = computed(() => {
  const nextCompany = allCompanies.value.at(
    currentIndex.value === allCompanies.value.length - 1
      ? 0
      : currentIndex.value + 1
  );

  return nextCompany?.url
});

onMounted(async () => {
  dispatcherSingleton.trigger({ name: 'portfolioCompanyEnter' }, {});

  await isLoaderVisiblePromise;

  const transition = usePageTransition();
  await transition.value.promise;

  isVisible.value = true;
});

onBeforeRouteLeave((to) => {
  if (!to.name !== 'companies-slug') {
    dispatcherSingleton.trigger({ name: 'portfolioCompanyLeave' }, {});

    isVisible.value = false;
  }
});

usePageMixin();
useSeo(
  currentCompany.value?.seo,
  currentCompany.value?.seo?.title || formattedTitle.value,
  currentCompany.value?.url
);

return (_ctx, _cache) => {
  const _component_CompanyContent = _sfc_main$1;

  return (openBlock(), createElementBlock("div", null, [
    createVNode(_component_CompanyContent, {
      name: unref(currentCompany).name,
      logo: unref(currentCompany).logo,
      copy: unref(currentCompany).copy,
      founded: unref(currentCompany).founded,
      invested: unref(currentCompany).invested,
      stage: unref(currentCompany).stage,
      "website-url": unref(currentCompany).websiteUrl,
      "is-visible": unref(isVisible)
    }, null, 8, ["name", "logo", "copy", "founded", "invested", "stage", "website-url", "is-visible"])
  ]))
}
}

};

export { _sfc_main as default };
