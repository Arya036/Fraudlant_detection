const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./cVTnJKQ3.js","./Bz19uxUR.js","./CEHeSSSx.js","./entry.D6d7nGTd.css","./Cwgn2g5d.js"])))=>i.map(i=>d[i]);
import { x as ref, ab as onScopeDispose, y as watch, ac as getCurrentScope, ad as customRef, G as nextTick, ae as isEqual, h as defu, m as useRuntimeConfig, af as __vitePreload, b as useNuxtApp, M as useState, n as computed, ag as reactive, ah as refreshNuxtData, ai as hash, aj as useAsyncData, ak as defineStore } from '#entry';

function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = {};
  const opt = options || {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

function parseCookieValue(value) {
  if (value === "undefined") {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "number" && String(parsed) !== value) {
      return value;
    }
    return parsed;
  } catch {
    return value;
  }
}
const CookieDefaults = {
  path: "/",
  watch: true,
  decode: (val) => parseCookieValue(decodeURIComponent(val)),
  encode: (val) => {
    if (typeof val !== "string" || val === "undefined") {
      return encodeURIComponent(JSON.stringify(val));
    }
    try {
      if (typeof JSON.parse(val) !== "string") {
        return encodeURIComponent(JSON.stringify(val));
      }
    } catch {
    }
    return encodeURIComponent(val);
  },
  refresh: false
};
const store = globalThis.cookieStore ;
function useCookie(name, _opts) {
  const opts = { ...CookieDefaults, ..._opts };
  opts.filter ??= (key) => key === name;
  const cookies = readRawCookies(opts) || {};
  let delay;
  if (opts.maxAge !== void 0) {
    delay = opts.maxAge * 1e3;
  } else if (opts.expires) {
    delay = opts.expires.getTime() - Date.now();
  }
  const hasExpired = delay !== void 0 && delay <= 0;
  const shouldSetInitialClientCookie = hasExpired || cookies[name] === void 0 || cookies[name] === null;
  const cookieValue = klona(hasExpired ? void 0 : cookies[name] ?? opts.default?.());
  const cookie = delay && !hasExpired ? cookieRef(cookieValue, delay, opts.watch && opts.watch !== "shallow") : ref(cookieValue);
  {
    let channel = null;
    try {
      if (!store && typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(`nuxt:cookies:${name}`);
      }
    } catch {
    }
    const callback = (force = false) => {
      if (!force) {
        if (opts.readonly || isEqual(cookie.value, cookies[name])) {
          return;
        }
      }
      writeClientCookie(name, cookie.value, opts);
      cookies[name] = klona(cookie.value);
      channel?.postMessage({ value: opts.encode(cookie.value) });
    };
    const handleChange = (data) => {
      const value = data.refresh ? readRawCookies(opts)?.[name] : opts.decode(data.value);
      watchPaused = true;
      cookie.value = value;
      cookies[name] = klona(value);
      nextTick(() => {
        watchPaused = false;
      });
    };
    let watchPaused = false;
    const hasScope = !!getCurrentScope();
    if (hasScope) {
      onScopeDispose(() => {
        watchPaused = true;
        callback();
        channel?.close();
      });
    }
    if (store) {
      const changeHandler = (event) => {
        const changedCookie = event.changed.find((c) => c.name === name);
        const removedCookie = event.deleted.find((c) => c.name === name);
        if (changedCookie) {
          handleChange({ value: changedCookie.value });
        }
        if (removedCookie) {
          handleChange({ value: null });
        }
      };
      store.addEventListener("change", changeHandler);
      if (hasScope) {
        onScopeDispose(() => store.removeEventListener("change", changeHandler));
      }
    } else if (channel) {
      channel.onmessage = ({ data }) => handleChange(data);
    }
    if (opts.watch) {
      watch(
        cookie,
        () => {
          if (watchPaused) {
            return;
          }
          callback(opts.refresh);
        },
        { deep: opts.watch !== "shallow" }
      );
    }
    if (shouldSetInitialClientCookie) {
      callback(shouldSetInitialClientCookie);
    }
  }
  return cookie;
}
function readRawCookies(opts = {}) {
  {
    return parse(document.cookie, opts);
  }
}
function serializeCookie(name, value, opts = {}) {
  if (value === null || value === void 0) {
    return serialize(name, value, { ...opts, maxAge: -1 });
  }
  return serialize(name, value, opts);
}
function writeClientCookie(name, value, opts = {}) {
  {
    document.cookie = serializeCookie(name, value, opts);
  }
}
const MAX_TIMEOUT_DELAY = 2147483647;
function cookieRef(value, delay, shouldWatch) {
  let timeout;
  let unsubscribe;
  let elapsed = 0;
  const internalRef = shouldWatch ? ref(value) : { value };
  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe?.();
      clearTimeout(timeout);
    });
  }
  return customRef((track, trigger) => {
    if (shouldWatch) {
      unsubscribe = watch(internalRef, trigger);
    }
    function scheduleTimeout() {
      const timeRemaining = delay - elapsed;
      const timeoutLength = timeRemaining < MAX_TIMEOUT_DELAY ? timeRemaining : MAX_TIMEOUT_DELAY;
      timeout = setTimeout(() => {
        elapsed += timeoutLength;
        if (elapsed < delay) {
          return scheduleTimeout();
        }
        internalRef.value = void 0;
        trigger();
      }, timeoutLength);
    }
    function createExpirationTimeout() {
      elapsed = 0;
      clearTimeout(timeout);
      scheduleTimeout();
    }
    return {
      get() {
        track();
        return internalRef.value;
      },
      set(newValue) {
        createExpirationTimeout();
        internalRef.value = newValue;
        trigger();
      }
    };
  });
}

const linkFragment = `
  label,
  type,
  url,
  openInNewTab
`;

const seoFragment = `
  seo {
    title,
    description,
    image {
      asset->{ url, metadata { dimensions } },
      alt
    }
  }
`;

const companyDetailPagesQuery = `
  *[_type == "companyDetailPage"] | order(orderRank) {
    _id,
    ${seoFragment},
    companyName,
    logo { asset->{ url } },
    slug,
    websiteUrl,
    copy,
    founded,
    invested,
    stage
  }
`;

const portraitFragment = `
  portrait {
    asset->{ url, metadata { dimensions } },
    alt
  }
`;

const teamMembersQuery = `
  *[_type == "teamMember"] | order(orderRank) {
    _id,
    name,
    position,
    depthMap {
      asset->{ url },
    },
    normalMap {
      asset->{ url },
    },
    ${portraitFragment}
  }
`;

function groq(strings, ...keys) {
  const lastIndex = strings.length - 1;
  return strings.slice(0, lastIndex).reduce((acc, str, i) => acc + str + keys[i], "") + strings[lastIndex];
}

const globalDataQuery = groq`
{
  "globalData": *[_type == "globalData" && _id == "globalData"][0] {
    socials[] { ${linkFragment} },
    footer_title,
    footer_copyrights,
    legalNav[] { ${linkFragment} },
    seo {
      title,
      description,
      image { asset->{ url } }
    }
  },
  "allCompanies": ${companyDetailPagesQuery},
  "allTeamMembers": ${teamMembersQuery}
}
`;

const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, reKeySegment = /_key\s*==\s*['"](.*)['"]/, reIndexTuple = /^\d*:\d*$/;
function isIndexSegment(segment) {
  return typeof segment == "number" || typeof segment == "string" && /^\[\d+\]$/.test(segment);
}
function isKeySegment(segment) {
  return typeof segment == "string" ? reKeySegment.test(segment.trim()) : typeof segment == "object" && "_key" in segment;
}
function isIndexTuple(segment) {
  if (typeof segment == "string" && reIndexTuple.test(segment))
    return true;
  if (!Array.isArray(segment) || segment.length !== 2)
    return false;
  const [from, to] = segment;
  return (typeof from == "number" || from === "") && (typeof to == "number" || to === "");
}
function get(obj, path, defaultVal) {
  const select = typeof path == "string" ? fromString(path) : path;
  if (!Array.isArray(select))
    throw new Error("Path must be an array or a string");
  let acc = obj;
  for (let i = 0; i < select.length; i++) {
    const segment = select[i];
    if (isIndexSegment(segment)) {
      if (!Array.isArray(acc))
        return defaultVal;
      acc = acc[segment];
    }
    if (isKeySegment(segment)) {
      if (!Array.isArray(acc))
        return defaultVal;
      acc = acc.find((item) => item._key === segment._key);
    }
    if (typeof segment == "string" && (acc = typeof acc == "object" && acc !== null ? acc[segment] : void 0), typeof acc > "u")
      return defaultVal;
  }
  return acc;
}
function toString(path) {
  if (!Array.isArray(path))
    throw new Error("Path is not an array");
  return path.reduce((target, segment, i) => {
    const segmentType = typeof segment;
    if (segmentType === "number")
      return `${target}[${segment}]`;
    if (segmentType === "string")
      return `${target}${i === 0 ? "" : "."}${segment}`;
    if (isKeySegment(segment) && segment._key)
      return `${target}[_key=="${segment._key}"]`;
    if (Array.isArray(segment)) {
      const [from, to] = segment;
      return `${target}[${from}:${to}]`;
    }
    throw new Error(`Unsupported path segment \`${JSON.stringify(segment)}\``);
  }, "");
}
function fromString(path) {
  if (typeof path != "string")
    throw new Error("Path is not a string");
  const segments = path.match(rePropName);
  if (!segments)
    throw new Error("Invalid path string");
  return segments.map(parsePathSegment);
}
function parsePathSegment(segment) {
  return isIndexSegment(segment) ? parseIndexSegment(segment) : isKeySegment(segment) ? parseKeySegment(segment) : isIndexTuple(segment) ? parseIndexTupleSegment(segment) : segment;
}
function parseIndexSegment(segment) {
  return Number(segment.replace(/[^\d]/g, ""));
}
function parseKeySegment(segment) {
  return { _key: segment.match(reKeySegment)[1] };
}
function parseIndexTupleSegment(segment) {
  const [from, to] = segment.split(":").map((seg) => seg === "" ? seg : Number(seg));
  return [from, to];
}
var studioPath = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  fromString,
  get,
  isIndexSegment,
  isIndexTuple,
  isKeySegment,
  reKeySegment,
  toString
});
const DRAFTS_FOLDER = "drafts", VERSION_FOLDER = "versions", PATH_SEPARATOR = ".", DRAFTS_PREFIX = `${DRAFTS_FOLDER}${PATH_SEPARATOR}`, VERSION_PREFIX = `${VERSION_FOLDER}${PATH_SEPARATOR}`;
function isDraftId(id) {
  return id.startsWith(DRAFTS_PREFIX);
}
function isVersionId(id) {
  return id.startsWith(VERSION_PREFIX);
}
function getDraftId(id) {
  if (isVersionId(id)) {
    const publishedId = getPublishedId(id);
    return DRAFTS_PREFIX + publishedId;
  }
  return isDraftId(id) ? id : DRAFTS_PREFIX + id;
}
function getVersionId(id, version) {
  if (version === "drafts" || version === "published")
    throw new Error('Version can not be "published" or "drafts"');
  return `${VERSION_PREFIX}${version}${PATH_SEPARATOR}${getPublishedId(id)}`;
}
function getVersionFromId(id) {
  if (!isVersionId(id)) return;
  const [_versionPrefix, versionId] = id.split(PATH_SEPARATOR);
  return versionId;
}
function getPublishedId(id) {
  return isVersionId(id) ? id.split(PATH_SEPARATOR).slice(2).join(PATH_SEPARATOR) : isDraftId(id) ? id.slice(DRAFTS_PREFIX.length) : id;
}
const ESCAPE = {
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "'": "\\'",
  "\\": "\\\\"
}, UNESCAPE = {
  "\\f": "\f",
  "\\n": `
`,
  "\\r": "\r",
  "\\t": "	",
  "\\'": "'",
  "\\\\": "\\"
};
function jsonPath(path) {
  return `$${path.map((segment) => typeof segment == "string" ? `['${segment.replace(/[\f\n\r\t'\\]/g, (match) => ESCAPE[match])}']` : typeof segment == "number" ? `[${segment}]` : segment._key !== "" ? `[?(@._key=='${segment._key.replace(/['\\]/g, (match) => ESCAPE[match])}')]` : `[${segment._index}]`).join("")}`;
}
function jsonPathArray(path) {
  return path.map((segment) => typeof segment == "string" ? `['${segment.replace(/[\f\n\r\t'\\]/g, (match) => ESCAPE[match])}']` : typeof segment == "number" ? `[${segment}]` : segment._key !== "" ? `[?(@._key=='${segment._key.replace(/['\\]/g, (match) => ESCAPE[match])}')]` : `[${segment._index}]`);
}
function parseJsonPath(path) {
  const parsed = [], parseRe = /\['(.*?)'\]|\[(\d+)\]|\[\?\(@\._key=='(.*?)'\)\]/g;
  let match;
  for (; (match = parseRe.exec(path)) !== null; ) {
    if (match[1] !== void 0) {
      const key = match[1].replace(/\\(\\|f|n|r|t|')/g, (m) => UNESCAPE[m]);
      parsed.push(key);
      continue;
    }
    if (match[2] !== void 0) {
      parsed.push(parseInt(match[2], 10));
      continue;
    }
    if (match[3] !== void 0) {
      const _key = match[3].replace(/\\(\\')/g, (m) => UNESCAPE[m]);
      parsed.push({
        _key,
        _index: -1
      });
      continue;
    }
  }
  return parsed;
}
function jsonPathToStudioPath(path) {
  return path.map((segment) => {
    if (typeof segment == "string" || typeof segment == "number")
      return segment;
    if (segment._key !== "")
      return { _key: segment._key };
    if (segment._index !== -1)
      return segment._index;
    throw new Error(`invalid segment:${JSON.stringify(segment)}`);
  });
}
function studioPathToJsonPath(path) {
  return (typeof path == "string" ? fromString(path) : path).map((segment) => {
    if (typeof segment == "string" || typeof segment == "number")
      return segment;
    if (Array.isArray(segment))
      throw new Error(`IndexTuple segments aren't supported:${JSON.stringify(segment)}`);
    if (isContentSourceMapParsedPathKeyedSegment(segment))
      return segment;
    if (segment._key)
      return { _key: segment._key, _index: -1 };
    throw new Error(`invalid segment:${JSON.stringify(segment)}`);
  });
}
function isContentSourceMapParsedPathKeyedSegment(segment) {
  return typeof segment == "object" && "_key" in segment && "_index" in segment;
}
function jsonPathToMappingPath(path) {
  return path.map((segment) => {
    if (typeof segment == "string" || typeof segment == "number")
      return segment;
    if (segment._index !== -1)
      return segment._index;
    throw new Error(`invalid segment:${JSON.stringify(segment)}`);
  });
}
function resolveMapping(resultPath, csm) {
  if (!csm?.mappings)
    return;
  const resultMappingPath = jsonPath(jsonPathToMappingPath(resultPath));
  if (csm.mappings[resultMappingPath] !== void 0)
    return {
      mapping: csm.mappings[resultMappingPath],
      matchedPath: resultMappingPath,
      pathSuffix: ""
    };
  const resultMappingPathArray = jsonPathArray(jsonPathToMappingPath(resultPath));
  for (let i = resultMappingPathArray.length - 1; i >= 0; i--) {
    const key = `$${resultMappingPathArray.slice(0, i).join("")}`, mappingFound = csm.mappings[key];
    if (mappingFound) {
      const pathSuffix = resultMappingPath.substring(key.length);
      return { mapping: mappingFound, matchedPath: key, pathSuffix };
    }
  }
}
function resolveEditInfo(options) {
  const { resultSourceMap: csm, resultPath } = options, { mapping, pathSuffix } = resolveMapping(resultPath, csm) || {};
  if (!mapping || mapping.source.type === "literal" || mapping.source.type === "unknown")
    return;
  const sourceDoc = csm.documents[mapping.source.document], sourcePath = csm.paths[mapping.source.path];
  if (sourceDoc && sourcePath) {
    const { baseUrl, workspace, tool } = resolveStudioBaseRoute(
      typeof options.studioUrl == "function" ? options.studioUrl(sourceDoc) : options.studioUrl
    );
    if (!baseUrl) return;
    const { _id, _type, _projectId, _dataset } = sourceDoc;
    return {
      baseUrl,
      workspace,
      tool,
      id: _id,
      type: _type,
      path: parseJsonPath(sourcePath + pathSuffix),
      projectId: _projectId,
      dataset: _dataset
    };
  }
}
function resolveStudioBaseRoute(studioUrl) {
  let baseUrl = typeof studioUrl == "string" ? studioUrl : studioUrl.baseUrl;
  return baseUrl !== "/" && (baseUrl = baseUrl.replace(/\/$/, "")), typeof studioUrl == "string" ? { baseUrl } : { ...studioUrl, baseUrl };
}

//#region src/storages/globalConfig/globalConfig.ts
let store$4;
/**
* Returns the global configuration.
*
* @param config The config to merge.
*
* @returns The configuration.
*/
/* @__NO_SIDE_EFFECTS__ */
function getGlobalConfig(config$1) {
	return {
		lang: config$1?.lang ?? store$4?.lang,
		message: config$1?.message,
		abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
		abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
	};
}

//#endregion
//#region src/storages/globalMessage/globalMessage.ts
let store$3;
/**
* Returns a global error message.
*
* @param lang The language of the message.
*
* @returns The error message.
*/
/* @__NO_SIDE_EFFECTS__ */
function getGlobalMessage(lang) {
	return store$3?.get(lang);
}

//#endregion
//#region src/storages/schemaMessage/schemaMessage.ts
let store$2;
/**
* Returns a schema error message.
*
* @param lang The language of the message.
*
* @returns The error message.
*/
/* @__NO_SIDE_EFFECTS__ */
function getSchemaMessage(lang) {
	return store$2?.get(lang);
}

//#endregion
//#region src/storages/specificMessage/specificMessage.ts
let store$1;
/**
* Returns a specific error message.
*
* @param reference The identifier reference.
* @param lang The language of the message.
*
* @returns The error message.
*/
/* @__NO_SIDE_EFFECTS__ */
function getSpecificMessage(reference, lang) {
	return store$1?.get(reference)?.get(lang);
}

//#endregion
//#region src/utils/_stringify/_stringify.ts
/**
* Stringifies an unknown input to a literal or type string.
*
* @param input The unknown input.
*
* @returns A literal or type string.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _stringify(input) {
	const type = typeof input;
	if (type === "string") return `"${input}"`;
	if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
	if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
	return type;
}

//#endregion
//#region src/utils/_addIssue/_addIssue.ts
/**
* Adds an issue to the dataset.
*
* @param context The issue context.
* @param label The issue label.
* @param dataset The input dataset.
* @param config The configuration.
* @param other The optional props.
*
* @internal
*/
function _addIssue(context, label, dataset, config$1, other) {
	const input = other && "input" in other ? other.input : dataset.value;
	const expected = other?.expected ?? context.expects ?? null;
	const received = other?.received ?? /* @__PURE__ */ _stringify(input);
	const issue = {
		kind: context.kind,
		type: context.type,
		input,
		expected,
		received,
		message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
		requirement: context.requirement,
		path: other?.path,
		issues: other?.issues,
		lang: config$1.lang,
		abortEarly: config$1.abortEarly,
		abortPipeEarly: config$1.abortPipeEarly
	};
	const isSchema = context.kind === "schema";
	const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
	if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
	if (isSchema) dataset.typed = false;
	if (dataset.issues) dataset.issues.push(issue);
	else dataset.issues = [issue];
}

//#endregion
//#region src/utils/_getStandardProps/_getStandardProps.ts
/**
* Returns the Standard Schema properties.
*
* @param context The schema context.
*
* @returns The Standard Schema properties.
*/
/* @__NO_SIDE_EFFECTS__ */
function _getStandardProps(context) {
	return {
		version: 1,
		vendor: "valibot",
		validate(value$1) {
			return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
		}
	};
}

//#endregion
//#region src/actions/minLength/minLength.ts
/* @__NO_SIDE_EFFECTS__ */
function minLength(requirement, message$1) {
	return {
		kind: "validation",
		type: "min_length",
		reference: minLength,
		async: false,
		expects: `>=${requirement}`,
		requirement,
		message: message$1,
		"~run"(dataset, config$1) {
			if (dataset.typed && dataset.value.length < this.requirement) _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
			return dataset;
		}
	};
}

//#endregion
//#region src/methods/getFallback/getFallback.ts
/**
* Returns the fallback value of the schema.
*
* @param schema The schema to get it from.
* @param dataset The output dataset if available.
* @param config The config if available.
*
* @returns The fallback value.
*/
/* @__NO_SIDE_EFFECTS__ */
function getFallback(schema, dataset, config$1) {
	return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
}

//#endregion
//#region src/methods/fallback/fallback.ts
/**
* Returns a fallback value as output if the input does not match the schema.
*
* @param schema The schema to catch.
* @param fallback The fallback value.
*
* @returns The passed schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function fallback(schema, fallback$1) {
	return {
		...schema,
		fallback: fallback$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const outputDataset = schema["~run"](dataset, config$1);
			return outputDataset.issues ? {
				typed: true,
				value: /* @__PURE__ */ getFallback(this, outputDataset, config$1)
			} : outputDataset;
		}
	};
}

//#endregion
//#region src/methods/getDefault/getDefault.ts
/**
* Returns the default value of the schema.
*
* @param schema The schema to get it from.
* @param dataset The input dataset if available.
* @param config The config if available.
*
* @returns The default value.
*/
/* @__NO_SIDE_EFFECTS__ */
function getDefault(schema, dataset, config$1) {
	return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
}

//#endregion
//#region src/methods/is/is.ts
/**
* Checks if the input matches the schema. By using a type predicate, this
* function can be used as a type guard.
*
* @param schema The schema to be used.
* @param input The input to be tested.
*
* @returns Whether the input matches the schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function is(schema, input) {
	return !schema["~run"]({ value: input }, { abortEarly: true }).issues;
}

//#endregion
//#region src/schemas/object/object.ts
/* @__NO_SIDE_EFFECTS__ */
function object(entries$1, message$1) {
	return {
		kind: "schema",
		type: "object",
		reference: object,
		expects: "Object",
		async: false,
		entries: entries$1,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value$1
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config$1.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config$1, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config$1.abortEarly) break;
					}
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}

//#endregion
//#region src/schemas/optional/optional.ts
/* @__NO_SIDE_EFFECTS__ */
function optional(wrapped, default_) {
	return {
		kind: "schema",
		type: "optional",
		reference: optional,
		expects: `(${wrapped.expects} | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
				if (dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config$1);
		}
	};
}

//#endregion
//#region src/schemas/string/string.ts
/* @__NO_SIDE_EFFECTS__ */
function string(message$1) {
	return {
		kind: "schema",
		type: "string",
		reference: string,
		expects: "string",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (typeof dataset.value === "string") dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}

//#endregion
//#region src/methods/pipe/pipe.ts
/* @__NO_SIDE_EFFECTS__ */
function pipe$1(...pipe$1) {
	return {
		...pipe$1[0],
		pipe: pipe$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			for (const item of pipe$1) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
			}
			return dataset;
		}
	};
}

const lengthyStr$1 = pipe$1(string(), minLength(1)), optionalLengthyStr = optional(lengthyStr$1), sanityNodeSchema = object({
  baseUrl: lengthyStr$1,
  dataset: optionalLengthyStr,
  id: lengthyStr$1,
  path: lengthyStr$1,
  projectId: optionalLengthyStr,
  tool: optionalLengthyStr,
  type: optionalLengthyStr,
  workspace: optionalLengthyStr,
  perspective: fallback(string(), "drafts")
});
function isValidSanityNode(node) {
  return is(sanityNodeSchema, node);
}
function isArray$2(value) {
  return value !== null && Array.isArray(value);
}
function pathToUrlString(path) {
  let str = "";
  for (const segment of path) {
    if (typeof segment == "string") {
      str && (str += "."), str += segment;
      continue;
    }
    if (typeof segment == "number") {
      str && (str += ":"), str += `${segment}`;
      continue;
    }
    if (isArray$2(segment)) {
      str && (str += ":"), str += `${segment.join(",")}}`;
      continue;
    }
    if (segment._key) {
      str && (str += ":"), str += `${segment._key}`;
      continue;
    }
  }
  return str;
}
function encodeSanityNodeData(node) {
  const { id: _id, path, baseUrl, tool, workspace, type } = node;
  return isValidSanityNode(node) ? [
    ["id", getPublishedId(_id)],
    ["type", type],
    ["path", pathToUrlString(studioPath.fromString(path))],
    ["base", encodeURIComponent(baseUrl)],
    ["workspace", workspace],
    ["tool", tool]
  ].filter(([, value]) => !!value).map((part) => part.join("=")).join(";") : void 0;
}

const encodeDataAttribute = (result, sourceMap, studioUrl, studioPathLike) => {
  if (!sourceMap || !studioUrl)
    return;
  const resultPath = studioPathToJsonPath(studioPathLike), editInfo = resolveEditInfo({
    resultPath,
    resultSourceMap: sourceMap,
    studioUrl
  });
  if (editInfo)
    return encodeSanityNodeData({
      baseUrl: editInfo.baseUrl,
      workspace: editInfo.workspace,
      tool: editInfo.tool,
      type: editInfo.type,
      id: editInfo.id,
      path: typeof editInfo.path == "string" ? editInfo.path : studioPath.toString(jsonPathToStudioPath(editInfo.path))
    });
};
function defineEncodeDataAttribute(result, sourceMap, studioUrl, basePath) {
  const parse = (path) => path ? typeof path == "string" ? studioPath.fromString(path) : path : [], parsedBasePath = parse(basePath);
  return Object.assign(
    (path) => encodeDataAttribute(result, sourceMap, studioUrl, [...parsedBasePath, ...parse(path)]),
    // The scope method creates a scoped version of encodeDataAttribute
    {
      scope: (scope) => defineEncodeDataAttribute(result, sourceMap, studioUrl, [
        ...parsedBasePath,
        ...parse(scope)
      ])
    }
  );
}

const useSanityConfig = () => {
  const $config = useRuntimeConfig();
  return defu(
    {},
    $config.public.sanity
  );
};

const createLiveStore = (liveContent) => {
  if (!liveContent) return void 0;
  const entries = /* @__PURE__ */ new Map();
  return {
    notify(tags, lastLiveEventId) {
      entries.forEach((entry) => {
        const updateLastLiveEventId = () => {
          entry.lastLiveEventId = lastLiveEventId;
        };
        entry.callback(tags, updateLastLiveEventId);
      });
    },
    subscribe(queryKey, callback) {
      entries.set(queryKey, {
        lastLiveEventId: void 0,
        callback
      });
      return {
        getLastLiveEventId: () => entries.get(queryKey)?.lastLiveEventId,
        unsubscribe: () => {
          entries.delete(queryKey);
        }
      };
    }
  };
};

var cache = {}, symbol, hasRequiredSymbol;
function requireSymbol() {
  return hasRequiredSymbol || (hasRequiredSymbol = 1, symbol = { kValues: /* @__PURE__ */ Symbol("values"), kStorage: /* @__PURE__ */ Symbol("kStorage"), kStorages: /* @__PURE__ */ Symbol("kStorages"), kTransfromer: /* @__PURE__ */ Symbol("kTransformer"), kTTL: /* @__PURE__ */ Symbol("kTTL"), kOnDedupe: /* @__PURE__ */ Symbol("kOnDedupe"), kOnError: /* @__PURE__ */ Symbol("kOnError"), kOnHit: /* @__PURE__ */ Symbol("kOnHit"), kOnMiss: /* @__PURE__ */ Symbol("kOnMiss"), kStale: /* @__PURE__ */ Symbol("kStale") }), symbol;
}
var safeStableStringify = { exports: {} }, hasRequiredSafeStableStringify;
function requireSafeStableStringify() {
  return hasRequiredSafeStableStringify || (hasRequiredSafeStableStringify = 1, (function(module, exports$1) {
    const { hasOwnProperty } = Object.prototype, stringify = configure();
    stringify.configure = configure, stringify.stringify = stringify, stringify.default = stringify, exports$1.stringify = stringify, exports$1.configure = configure, module.exports = stringify;
    const strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;
    function strEscape(str) {
      return str.length < 5e3 && !strEscapeSequencesRegExp.test(str) ? `"${str}"` : JSON.stringify(str);
    }
    function sort(array, comparator) {
      if (array.length > 200 || comparator)
        return array.sort(comparator);
      for (let i = 1; i < array.length; i++) {
        const currentValue = array[i];
        let position = i;
        for (; position !== 0 && array[position - 1] > currentValue; )
          array[position] = array[position - 1], position--;
        array[position] = currentValue;
      }
      return array;
    }
    const typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(
        Object.getPrototypeOf(
          new Int8Array()
        )
      ),
      Symbol.toStringTag
    ).get;
    function isTypedArrayWithEntries(value) {
      return typedArrayPrototypeGetSymbolToStringTag.call(value) !== void 0 && value.length !== 0;
    }
    function stringifyTypedArray(array, separator, maximumBreadth) {
      array.length < maximumBreadth && (maximumBreadth = array.length);
      const whitespace = separator === "," ? "" : " ";
      let res = `"0":${whitespace}${array[0]}`;
      for (let i = 1; i < maximumBreadth; i++)
        res += `${separator}"${i}":${whitespace}${array[i]}`;
      return res;
    }
    function getCircularValueOption(options) {
      if (hasOwnProperty.call(options, "circularValue")) {
        const circularValue = options.circularValue;
        if (typeof circularValue == "string")
          return `"${circularValue}"`;
        if (circularValue == null)
          return circularValue;
        if (circularValue === Error || circularValue === TypeError)
          return {
            toString() {
              throw new TypeError("Converting circular structure to JSON");
            }
          };
        throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined');
      }
      return '"[Circular]"';
    }
    function getDeterministicOption(options) {
      let value;
      if (hasOwnProperty.call(options, "deterministic") && (value = options.deterministic, typeof value != "boolean" && typeof value != "function"))
        throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');
      return value === void 0 ? true : value;
    }
    function getBooleanOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key) && (value = options[key], typeof value != "boolean"))
        throw new TypeError(`The "${key}" argument must be of type boolean`);
      return value === void 0 ? true : value;
    }
    function getPositiveIntegerOption(options, key) {
      let value;
      if (hasOwnProperty.call(options, key)) {
        if (value = options[key], typeof value != "number")
          throw new TypeError(`The "${key}" argument must be of type number`);
        if (!Number.isInteger(value))
          throw new TypeError(`The "${key}" argument must be an integer`);
        if (value < 1)
          throw new RangeError(`The "${key}" argument must be >= 1`);
      }
      return value === void 0 ? 1 / 0 : value;
    }
    function getItemCount(number) {
      return number === 1 ? "1 item" : `${number} items`;
    }
    function getUniqueReplacerSet(replacerArray) {
      const replacerSet = /* @__PURE__ */ new Set();
      for (const value of replacerArray)
        (typeof value == "string" || typeof value == "number") && replacerSet.add(String(value));
      return replacerSet;
    }
    function getStrictOption(options) {
      if (hasOwnProperty.call(options, "strict")) {
        const value = options.strict;
        if (typeof value != "boolean")
          throw new TypeError('The "strict" argument must be of type boolean');
        if (value)
          return (value2) => {
            let message = `Object can not safely be stringified. Received type ${typeof value2}`;
            throw typeof value2 != "function" && (message += ` (${value2.toString()})`), new Error(message);
          };
      }
    }
    function configure(options) {
      options = { ...options };
      const fail = getStrictOption(options);
      fail && (options.bigint === void 0 && (options.bigint = false), "circularValue" in options || (options.circularValue = Error));
      const circularValue = getCircularValueOption(options), bigint = getBooleanOption(options, "bigint"), deterministic = getDeterministicOption(options), comparator = typeof deterministic == "function" ? deterministic : void 0, maximumDepth = getPositiveIntegerOption(options, "maximumDepth"), maximumBreadth = getPositiveIntegerOption(options, "maximumBreadth");
      function stringifyFnReplacer(key, parent, stack, replacer, spacer, indentation) {
        let value = parent[key];
        switch (typeof value == "object" && value !== null && typeof value.toJSON == "function" && (value = value.toJSON(key)), value = replacer.call(parent, key, value), typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null)
              return "null";
            if (stack.indexOf(value) !== -1)
              return circularValue;
            let res = "", join = ",";
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0)
                return "[]";
              if (maximumDepth < stack.length + 1)
                return '"[Array]"';
              stack.push(value), spacer !== "" && (indentation += spacer, res += `
${indentation}`, join = `,
${indentation}`);
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null", res += join;
              }
              const tmp = stringifyFnReplacer(String(i), value, stack, replacer, spacer, indentation);
              if (res += tmp !== void 0 ? tmp : "null", value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              return spacer !== "" && (res += `
${originalIndentation}`), stack.pop(), `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0)
              return "{}";
            if (maximumDepth < stack.length + 1)
              return '"[Object]"';
            let whitespace = "", separator = "";
            spacer !== "" && (indentation += spacer, join = `,
${indentation}`, whitespace = " ");
            const maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            deterministic && !isTypedArrayWithEntries(value) && (keys = sort(keys, comparator)), stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i], tmp = stringifyFnReplacer(key2, value, stack, replacer, spacer, indentation);
              tmp !== void 0 && (res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`, separator = join);
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":${whitespace}"${getItemCount(removedKeys)} not stringified"`, separator = join;
            }
            return spacer !== "" && separator.length > 1 && (res = `
${indentation}${res}
${originalIndentation}`), stack.pop(), `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return;
          case "bigint":
            if (bigint)
              return String(value);
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyArrayReplacer(key, value, stack, replacer, spacer, indentation) {
        switch (typeof value == "object" && value !== null && typeof value.toJSON == "function" && (value = value.toJSON(key)), typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null)
              return "null";
            if (stack.indexOf(value) !== -1)
              return circularValue;
            const originalIndentation = indentation;
            let res = "", join = ",";
            if (Array.isArray(value)) {
              if (value.length === 0)
                return "[]";
              if (maximumDepth < stack.length + 1)
                return '"[Array]"';
              stack.push(value), spacer !== "" && (indentation += spacer, res += `
${indentation}`, join = `,
${indentation}`);
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
                res += tmp2 !== void 0 ? tmp2 : "null", res += join;
              }
              const tmp = stringifyArrayReplacer(String(i), value[i], stack, replacer, spacer, indentation);
              if (res += tmp !== void 0 ? tmp : "null", value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `${join}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              return spacer !== "" && (res += `
${originalIndentation}`), stack.pop(), `[${res}]`;
            }
            stack.push(value);
            let whitespace = "";
            spacer !== "" && (indentation += spacer, join = `,
${indentation}`, whitespace = " ");
            let separator = "";
            for (const key2 of replacer) {
              const tmp = stringifyArrayReplacer(key2, value[key2], stack, replacer, spacer, indentation);
              tmp !== void 0 && (res += `${separator}${strEscape(key2)}:${whitespace}${tmp}`, separator = join);
            }
            return spacer !== "" && separator.length > 1 && (res = `
${indentation}${res}
${originalIndentation}`), stack.pop(), `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return;
          case "bigint":
            if (bigint)
              return String(value);
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifyIndent(key, value, stack, spacer, indentation) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null)
              return "null";
            if (typeof value.toJSON == "function") {
              if (value = value.toJSON(key), typeof value != "object")
                return stringifyIndent(key, value, stack, spacer, indentation);
              if (value === null)
                return "null";
            }
            if (stack.indexOf(value) !== -1)
              return circularValue;
            const originalIndentation = indentation;
            if (Array.isArray(value)) {
              if (value.length === 0)
                return "[]";
              if (maximumDepth < stack.length + 1)
                return '"[Array]"';
              stack.push(value), indentation += spacer;
              let res2 = `
${indentation}`;
              const join2 = `,
${indentation}`, maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifyIndent(String(i), value[i], stack, spacer, indentation);
                res2 += tmp2 !== void 0 ? tmp2 : "null", res2 += join2;
              }
              const tmp = stringifyIndent(String(i), value[i], stack, spacer, indentation);
              if (res2 += tmp !== void 0 ? tmp : "null", value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res2 += `${join2}"... ${getItemCount(removedKeys)} not stringified"`;
              }
              return res2 += `
${originalIndentation}`, stack.pop(), `[${res2}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0)
              return "{}";
            if (maximumDepth < stack.length + 1)
              return '"[Object]"';
            indentation += spacer;
            const join = `,
${indentation}`;
            let res = "", separator = "", maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            isTypedArrayWithEntries(value) && (res += stringifyTypedArray(value, join, maximumBreadth), keys = keys.slice(value.length), maximumPropertiesToStringify -= value.length, separator = join), deterministic && (keys = sort(keys, comparator)), stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i], tmp = stringifyIndent(key2, value[key2], stack, spacer, indentation);
              tmp !== void 0 && (res += `${separator}${strEscape(key2)}: ${tmp}`, separator = join);
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...": "${getItemCount(removedKeys)} not stringified"`, separator = join;
            }
            return separator !== "" && (res = `
${indentation}${res}
${originalIndentation}`), stack.pop(), `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return;
          case "bigint":
            if (bigint)
              return String(value);
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringifySimple(key, value, stack) {
        switch (typeof value) {
          case "string":
            return strEscape(value);
          case "object": {
            if (value === null)
              return "null";
            if (typeof value.toJSON == "function") {
              if (value = value.toJSON(key), typeof value != "object")
                return stringifySimple(key, value, stack);
              if (value === null)
                return "null";
            }
            if (stack.indexOf(value) !== -1)
              return circularValue;
            let res = "";
            const hasLength = value.length !== void 0;
            if (hasLength && Array.isArray(value)) {
              if (value.length === 0)
                return "[]";
              if (maximumDepth < stack.length + 1)
                return '"[Array]"';
              stack.push(value);
              const maximumValuesToStringify = Math.min(value.length, maximumBreadth);
              let i = 0;
              for (; i < maximumValuesToStringify - 1; i++) {
                const tmp2 = stringifySimple(String(i), value[i], stack);
                res += tmp2 !== void 0 ? tmp2 : "null", res += ",";
              }
              const tmp = stringifySimple(String(i), value[i], stack);
              if (res += tmp !== void 0 ? tmp : "null", value.length - 1 > maximumBreadth) {
                const removedKeys = value.length - maximumBreadth - 1;
                res += `,"... ${getItemCount(removedKeys)} not stringified"`;
              }
              return stack.pop(), `[${res}]`;
            }
            let keys = Object.keys(value);
            const keyLength = keys.length;
            if (keyLength === 0)
              return "{}";
            if (maximumDepth < stack.length + 1)
              return '"[Object]"';
            let separator = "", maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
            hasLength && isTypedArrayWithEntries(value) && (res += stringifyTypedArray(value, ",", maximumBreadth), keys = keys.slice(value.length), maximumPropertiesToStringify -= value.length, separator = ","), deterministic && (keys = sort(keys, comparator)), stack.push(value);
            for (let i = 0; i < maximumPropertiesToStringify; i++) {
              const key2 = keys[i], tmp = stringifySimple(key2, value[key2], stack);
              tmp !== void 0 && (res += `${separator}${strEscape(key2)}:${tmp}`, separator = ",");
            }
            if (keyLength > maximumBreadth) {
              const removedKeys = keyLength - maximumBreadth;
              res += `${separator}"...":"${getItemCount(removedKeys)} not stringified"`;
            }
            return stack.pop(), `{${res}}`;
          }
          case "number":
            return isFinite(value) ? String(value) : fail ? fail(value) : "null";
          case "boolean":
            return value === true ? "true" : "false";
          case "undefined":
            return;
          case "bigint":
            if (bigint)
              return String(value);
          // fallthrough
          default:
            return fail ? fail(value) : void 0;
        }
      }
      function stringify2(value, replacer, space) {
        if (arguments.length > 1) {
          let spacer = "";
          if (typeof space == "number" ? spacer = " ".repeat(Math.min(space, 10)) : typeof space == "string" && (spacer = space.slice(0, 10)), replacer != null) {
            if (typeof replacer == "function")
              return stringifyFnReplacer("", { "": value }, [], replacer, spacer, "");
            if (Array.isArray(replacer))
              return stringifyArrayReplacer("", value, [], getUniqueReplacerSet(replacer), spacer, "");
          }
          if (spacer.length !== 0)
            return stringifyIndent("", value, [], spacer, "");
        }
        return stringifySimple("", value, []);
      }
      return stringify2;
    }
  })(safeStableStringify, safeStableStringify.exports)), safeStableStringify.exports;
}
var util, hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  function findMatchingIndexes(arrayA, arrayB) {
    const found = [];
    let lastIndexB = 0;
    for (let indexA = 0; indexA < arrayA.length; indexA++)
      for (let indexB = lastIndexB; indexB < arrayB.length; indexB++)
        arrayA[indexA] === arrayB[indexB] && (found.push(indexB), lastIndexB = indexB + 1);
    return found;
  }
  function findNotMatching(arrayA, arrayB) {
    const found = [];
    let lastIndexB = 0;
    for (let indexA = 0; indexA < arrayA.length; indexA++)
      for (let indexB = lastIndexB; indexB < arrayB.length; indexB++)
        arrayA[indexA] !== arrayB[indexB] && (found.push(arrayB[indexB]), lastIndexB = indexB + 1);
    return found;
  }
  function bsearchIndex(array, value) {
    let start = 0, end = array.length - 1;
    for (; start <= end; ) {
      const index = (start + end) / 2 | 0;
      if (array[index] === value)
        return index;
      array[index] < value ? start = index + 1 : end = index - 1;
    }
    return -1;
  }
  function randomNumber(max) {
    return max * Math.random() | 0;
  }
  function randomInRange(min, max) {
    return min = Math.floor(min), max = Math.floor(max), min + randomNumber(1 + max - min);
  }
  function randomSubset(array, size) {
    if (array.length < 1 || size < 1) return [];
    const limit = Math.min(array.length, size), n = randomInRange(1, limit), indexes = /* @__PURE__ */ new Set();
    for (let i = 0; i < n; i++)
      indexes.add(randomNumber(array.length));
    const result = [];
    for (const i of indexes)
      result.push(array[i]);
    return result;
  }
  function wildcardMatch(value, content) {
    if (value === "*" || value.length === content.length && value === content) return true;
    let i = 0, j = 0;
    for (; i < value.length && j < content.length; ) {
      if (value[i] === content[j]) {
        i++, j++;
        continue;
      }
      if (value[i] === "*") {
        if (value[i + 1] === content[j]) {
          i++;
          continue;
        }
        j++;
        continue;
      }
      return false;
    }
    return i >= value.length - 1;
  }
  function abstractLogging() {
    const noop = () => {
    };
    return {
      fatal: noop,
      error: noop,
      warn: noop,
      info: noop,
      debug: noop,
      trace: noop
    };
  }
  return util = {
    findNotMatching,
    findMatchingIndexes,
    bsearchIndex,
    wildcardMatch,
    randomSubset,
    abstractLogging,
    isServerSide: typeof window > "u"
  }, util;
}
var _interface, hasRequired_interface;
function require_interface() {
  if (hasRequired_interface) return _interface;
  hasRequired_interface = 1;
  class StorageInterface {
    constructor(options) {
      this.options = options;
    }
    /**
     * @param {string} key
     * @returns {undefined|*} undefined if key not found
     */
    async get(key) {
      throw new Error("storage get method not implemented");
    }
    /**
     * @param {string} key
     * @param {*} value
     * @param {number} ttl - ttl in seconds; zero means key will not be stored
     * @param {?string[]} references
     */
    async set(key, value, ttl, references) {
      throw new Error("storage set method not implemented");
    }
    /**
     * @param {string} key
     */
    async remove(key) {
      throw new Error("storage remove method not implemented");
    }
    /**
     * @param {string[]} references
     */
    async invalidate(references) {
      throw new Error("storage invalidate method not implemented");
    }
    /**
     * @param {string} name
     */
    async clear(name) {
      throw new Error("storage clear method not implemented");
    }
    async refresh() {
      throw new Error("storage refresh method not implemented");
    }
  }
  return _interface = StorageInterface, _interface;
}
var redis, hasRequiredRedis;
function requireRedis() {
  if (hasRequiredRedis) return redis;
  hasRequiredRedis = 1;
  const stringify = requireSafeStableStringify(), StorageInterface = require_interface(), { findNotMatching, randomSubset, abstractLogging } = requireUtil(), GC_DEFAULT_CHUNK = 64, GC_DEFAULT_LAZY_CHUNK = 64, REFERENCES_DEFAULT_TTL = 60;
  class StorageRedis extends StorageInterface {
    /**
     * @param {?StorageRedisOptions} options
     */
    constructor(options = {}) {
      if (!options.client || typeof options.client != "object")
        throw new Error("Redis client is required");
      if (super(options), options.invalidation && options.invalidation.referencesTTL && (typeof options.invalidation.referencesTTL != "number" || options.invalidation.referencesTTL < 1))
        throw new Error("invalidation.referencesTTL must be a positive integer greater than 1");
      this.log = options.log || abstractLogging(), this.store = options.client, this.invalidation = !!options.invalidation, this.referencesTTL = options.invalidation && options.invalidation.referencesTTL || REFERENCES_DEFAULT_TTL;
    }
    getReferenceKeyLabel(reference) {
      return `r:${reference}`;
    }
    getKeyReferenceLabel(key) {
      return `k:${key}`;
    }
    /**
     * @param {string} key
     * @returns {undefined|*} undefined if key not found
     */
    async get(key) {
      this.log.debug({ msg: "acd/storage/redis.get", key });
      try {
        const value = await this.store.get(key);
        if (!value) {
          if (!this.invalidation)
            return;
          this.clearReferences(key);
          return;
        }
        return JSON.parse(value);
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.get error", err, key });
      }
    }
    /**
     * retrieve the remaining TTL value by key
     * @param {string} key
     * @returns {undefined|*} undefined if key not found or expired
     */
    async getTTL(key) {
      this.log.debug({ msg: "acd/storage/memory.getTTL", key });
      let pttl = await this.store.pttl(key);
      return pttl < 0 ? 0 : (pttl = Math.ceil(pttl / 1e3), pttl);
    }
    /**
     * set value by key
     * @param {string} key
     * @param {*} value
     * @param {number} ttl - ttl in seconds; zero means key will not be stored
     * @param {?string[]} references
     */
    async set(key, value, ttl, references) {
      if (this.log.debug({ msg: "acd/storage/redis.set key", key, value, ttl, references }), ttl = Number(ttl), !(!ttl || ttl < 0))
        try {
          if (await this.store.set(key, stringify(value), "EX", ttl), !references || references.length < 1)
            return;
          if (!this.invalidation) {
            this.log.warn({ msg: "acd/storage/redis.set, invalidation is disabled, references are useless", key, references });
            return;
          }
          const writes = [], currentReferences = await this.store.smembers(this.getKeyReferenceLabel(key));
          if (this.log.debug({ msg: "acd/storage/redis.set current references", key, currentReferences }), currentReferences.length > 1) {
            currentReferences.sort(), references.sort();
            const referencesToRemove = findNotMatching(references, currentReferences);
            for (const reference of referencesToRemove)
              writes.push(["srem", this.getReferenceKeyLabel(reference), key]);
            writes.push(["del", this.getKeyReferenceLabel(key)]);
          }
          const referencesToAdd = currentReferences.length > 1 ? findNotMatching(currentReferences, references) : references;
          this.log.debug({ msg: "acd/storage/redis.set references to add", key, referencesToAdd });
          for (let i = 0; i < referencesToAdd.length; i++) {
            const reference = referencesToAdd[i], referenceKeyLabel = this.getReferenceKeyLabel(reference);
            writes.push(["sadd", referenceKeyLabel, key]), writes.push(["expire", referenceKeyLabel, this.referencesTTL]);
          }
          const keyReferenceLabel = this.getKeyReferenceLabel(key);
          writes.push(["sadd", keyReferenceLabel, references]), writes.push(["expire", keyReferenceLabel, ttl]), this.log.debug({ msg: "acd/storage/redis.set references writes", writes }), await this.store.pipeline(writes).exec();
        } catch (err) {
          this.log.error({ msg: "acd/storage/redis.set error", err, key, ttl, references });
        }
    }
    /**
     * remove an entry by key
     * @param {string} key
     * @returns {boolean} indicates if key was removed
     */
    async remove(key) {
      this.log.debug({ msg: "acd/storage/redis.remove", key });
      try {
        const removed = await this.store.del(key) > 0;
        return removed && this.invalidation && await this.clearReferences(key), removed;
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.remove error", err, key });
      }
    }
    /**
     * @param {string|string[]} references
     * @returns {string[]} removed keys
     */
    async invalidate(references) {
      if (!this.invalidation)
        return this.log.warn({ msg: "acd/storage/redis.invalidate, exit due invalidation is disabled" }), [];
      this.log.debug({ msg: "acd/storage/redis.invalidate", references });
      try {
        return Array.isArray(references) ? await this._invalidateReferences(references) : await this._invalidateReference(references);
      } catch (err) {
        return this.log.error({ msg: "acd/storage/redis.invalidate error", err, references }), [];
      }
    }
    /**
     * @param {string[]} references
     * @param {[bool=true]} mapReferences
     * @returns {string[]} removed keys
     */
    async _invalidateReferences(references, mapReferences = true) {
      const reads = references.map((reference) => ["smembers", mapReferences ? this.getReferenceKeyLabel(reference) : reference]), keys = await this.store.pipeline(reads).exec();
      this.log.debug({ msg: "acd/storage/redis._invalidateReferences keys", keys });
      const writes = [], removed = [];
      for (let i = 0; i < keys.length; i++) {
        const key0 = keys[i][1];
        if (key0) {
          this.log.debug({ msg: "acd/storage/redis._invalidateReferences got keys to be invalidated", keys: key0 });
          for (let j = 0; j < key0.length; j++) {
            const key1 = key0[j];
            this.log.debug({ msg: "acd/storage/redis._invalidateReferences del key" + key1 }), removed.push(key1), writes.push(["del", key1]);
          }
        }
      }
      return await this.store.pipeline(writes).exec(), await this.clearReferences(removed), removed;
    }
    /**
     * @param {string} reference
     * @returns {string[]} removed keys
     */
    async _invalidateReference(reference) {
      let keys;
      if (reference.includes("*")) {
        const references = await this.store.keys(this.getReferenceKeyLabel(reference));
        return this._invalidateReferences(references, false);
      } else
        keys = await this.store.smembers(this.getReferenceKeyLabel(reference));
      this.log.debug({ msg: "acd/storage/redis._invalidateReference keys", keys });
      const writes = [], removed = [];
      for (let i = 0; i < keys.length; i++) {
        const key0 = keys[i];
        this.log.debug({ msg: "acd/storage/redis._invalidateReference del key" + key0 }), removed.push(key0), writes.push(["del", key0]);
      }
      return await this.store.pipeline(writes).exec(), await this.clearReferences(removed), removed;
    }
    /**
     * @param {string} name
     */
    async clear(name) {
      this.log.debug({ msg: "acd/storage/redis.clear", name });
      try {
        if (!name) {
          await this.store.flushall();
          return;
        }
        const keys = await this.store.keys(`${name}*`);
        this.log.debug({ msg: "acd/storage/redis.clear keys", keys });
        const removes = keys.map((key) => ["del", key]);
        if (await this.store.pipeline(removes).exec(), !this.invalidation)
          return;
        await this.clearReferences(keys);
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.clear error", err, name });
      }
    }
    async refresh() {
      try {
        await this.store.flushall();
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.refresh error", err });
      }
    }
    /**
     * note: does not throw on error
     * @param {string|string[]} keys
     */
    async clearReferences(keys) {
      try {
        if (!keys) {
          this.log.warn({ msg: "acd/storage/redis.clearReferences invalid call due to empty key" });
          return;
        }
        Array.isArray(keys) || (keys = [keys]);
        const reads = keys.map((key) => ["smembers", this.getKeyReferenceLabel(key)]), referencesKeys = await this.store.pipeline(reads).exec();
        this.log.debug({ msg: "acd/storage/redis.clearReferences references", keys, referencesKeys });
        const writes = {};
        for (let i = 0; i < keys.length; i++) {
          for (let j = 0; j < referencesKeys[i][1].length; j++) {
            const reference = this.getReferenceKeyLabel(referencesKeys[i][1][j]);
            writes[reference] || (writes[reference] = ["srem", reference, keys]);
          }
          const key = this.getKeyReferenceLabel(keys[i]);
          writes[key] = ["del", key];
        }
        this.log.debug({ msg: "acd/storage/redis.clearReferences writes pipeline", writes }), await this.store.pipeline(Object.values(writes)).exec();
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.clearReferences error", err });
      }
    }
    /**
     * scan references and clean expired/evicted keys
     * @param {?string} [mode=lazy] lazy or strict
     * - in lazy mode, only `options.max` references are scanned every time, picking keys to check randomly
     *   so this operation is lighter while does not ensure references full clean up
     * - in strict mode, all references and keys are checked
     *   this operation scan the whole db and is slow
     * @param {?object} options
     * @param {number} [options.chunk=64] number of references to retrieve at once
     * @param {number|undefined} [options.lazy.cursor] cursor to start the scan; should be last cursor returned by scan; default start from the beginning
     * @param {number} [lazyChunk=64] number of references to check per gc cycle
     * @return {Object} report information of the operation
     *   references scanned/removed, keys scanned/removed, loops, cursor, error if any
     */
    async gc(mode = "lazy", options = {}) {
      if (this.log.debug({ msg: "acd/storage/redis.gc", mode, options }), !this.invalidation) {
        this.log.warn({ msg: "acd/storage/redis.gc does not run due to invalidation is disabled" });
        return;
      }
      mode !== "strict" && mode !== "lazy" && (mode = "lazy");
      const report = {
        references: { scanned: [], removed: [] },
        keys: { scanned: /* @__PURE__ */ new Set(), removed: /* @__PURE__ */ new Set() },
        loops: 0,
        cursor: 0,
        error: null
      };
      try {
        let cursor = 0, lazyChunk = GC_DEFAULT_LAZY_CHUNK;
        if (options.chunk && (typeof options.chunk != "number" || options.chunk < 1))
          return report.error = new Error("chunk must be a positive integer greater than 1"), report;
        if (options.lazy) {
          if (options.lazy.chunk) {
            if (typeof options.lazy.chunk != "number" || options.lazy.chunk < 1)
              return report.error = new Error("lazy.chunk must be a positive integer greater than 1"), report;
            lazyChunk = options.lazy.chunk;
          }
          if (options.lazy.cursor) {
            if (typeof options.lazy.cursor != "number" || options.lazy.cursor < 0)
              return report.error = new Error("lazy.cursor must be a positive integer greater than 0"), report;
            cursor = options.lazy.cursor;
          }
        }
        const chunk = options.chunk || GC_DEFAULT_CHUNK, scanCount = Math.min(lazyChunk, chunk), startingCursor = cursor;
        let lastScanLength = -1, lastRemoved = -1;
        do {
          report.loops++;
          const scan = await this.store.scan(cursor, "match", "r:*", "count", scanCount);
          cursor = Number(scan[0]), lastScanLength = scan[1].length;
          const references = mode === "lazy" ? randomSubset(scan[1], lazyChunk) : scan[1];
          report.references.scanned = report.references.scanned.concat(references);
          let reads = [];
          for (let i = 0; i < references.length; i++) {
            const reference = references[i];
            reads.push(["smembers", reference]);
          }
          const referencesKeys = await this.store.pipeline(reads).exec(), keysMap = {}, referencesKeysMap = {};
          for (let i = 0; i < referencesKeys.length; i++) {
            const keys2 = referencesKeys[i], reference = references[i];
            referencesKeysMap[reference] = keys2[1];
            for (let j = 0; j < keys2[1].length; j++) {
              const key = keys2[1][j];
              keysMap[key] ? keysMap[key].push(reference) : keysMap[key] = [reference], report.keys.scanned.add(key);
            }
          }
          const keys = Object.keys(keysMap);
          reads = keys.map((key) => ["exists", key]);
          const existingKeys = await this.store.pipeline(reads).exec(), removingKeys = {};
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (existingKeys[i][1] !== 1)
              for (let j = 0; j < keysMap[key].length; j++) {
                const reference = keysMap[key][j];
                removingKeys[reference] ? removingKeys[reference].push(key) : removingKeys[reference] = [key], report.keys.removed.add(key);
              }
          }
          const writeReferences = Object.keys(removingKeys), writes = [];
          for (let i = 0; i < writeReferences.length; i++) {
            const reference = writeReferences[i];
            referencesKeysMap[reference].length === removingKeys[reference].length ? (writes.push(["del", reference]), report.references.removed.push(reference)) : writes.push(["srem", reference, removingKeys[reference]]);
          }
          if (await this.store.pipeline(writes).exec(), lastRemoved = writes.length, mode === "lazy" && report.references.scanned.length >= lazyChunk)
            break;
        } while (startingCursor !== cursor && lastScanLength > 0 && lastRemoved > 0);
        report.cursor = cursor, report.keys.scanned = Array.from(report.keys.scanned), report.keys.removed = Array.from(report.keys.removed);
      } catch (err) {
        this.log.error({ msg: "acd/storage/redis.gc error", err }), report.error = err;
      }
      return report;
    }
  }
  return redis = StorageRedis, redis;
}
var iterator$1, hasRequiredIterator;
function requireIterator() {
  if (hasRequiredIterator) return iterator$1;
  hasRequiredIterator = 1;
  function Iterator(next) {
    if (typeof next != "function")
      throw new Error("obliterator/iterator: expecting a function!");
    this.next = next;
  }
  return typeof Symbol < "u" && (Iterator.prototype[Symbol.iterator] = function() {
    return this;
  }), Iterator.of = function() {
    var args = arguments, l = args.length, i = 0;
    return new Iterator(function() {
      return i >= l ? { done: true } : { done: false, value: args[i++] };
    });
  }, Iterator.empty = function() {
    var iterator2 = new Iterator(function() {
      return { done: true };
    });
    return iterator2;
  }, Iterator.fromSequence = function(sequence) {
    var i = 0, l = sequence.length;
    return new Iterator(function() {
      return i >= l ? { done: true } : { done: false, value: sequence[i++] };
    });
  }, Iterator.is = function(value) {
    return value instanceof Iterator ? true : typeof value == "object" && value !== null && typeof value.next == "function";
  }, iterator$1 = Iterator, iterator$1;
}
var support = {}, hasRequiredSupport;
function requireSupport() {
  return hasRequiredSupport || (hasRequiredSupport = 1, support.ARRAY_BUFFER_SUPPORT = typeof ArrayBuffer < "u", support.SYMBOL_SUPPORT = typeof Symbol < "u"), support;
}
var foreach, hasRequiredForeach;
function requireForeach() {
  if (hasRequiredForeach) return foreach;
  hasRequiredForeach = 1;
  var support2 = requireSupport(), ARRAY_BUFFER_SUPPORT = support2.ARRAY_BUFFER_SUPPORT, SYMBOL_SUPPORT = support2.SYMBOL_SUPPORT;
  return foreach = function(iterable, callback) {
    var iterator2, k, i, l, s;
    if (!iterable) throw new Error("obliterator/forEach: invalid iterable.");
    if (typeof callback != "function")
      throw new Error("obliterator/forEach: expecting a callback.");
    if (Array.isArray(iterable) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable) || typeof iterable == "string" || iterable.toString() === "[object Arguments]") {
      for (i = 0, l = iterable.length; i < l; i++) callback(iterable[i], i);
      return;
    }
    if (typeof iterable.forEach == "function") {
      iterable.forEach(callback);
      return;
    }
    if (SYMBOL_SUPPORT && Symbol.iterator in iterable && typeof iterable.next != "function" && (iterable = iterable[Symbol.iterator]()), typeof iterable.next == "function") {
      for (iterator2 = iterable, i = 0; s = iterator2.next(), s.done !== true; )
        callback(s.value, i), i++;
      return;
    }
    for (k in iterable)
      iterable.hasOwnProperty(k) && callback(iterable[k], k);
  }, foreach;
}
var typedArrays = {}, hasRequiredTypedArrays;
function requireTypedArrays() {
  return hasRequiredTypedArrays || (hasRequiredTypedArrays = 1, (function(exports$1) {
    var MAX_8BIT_INTEGER = Math.pow(2, 8) - 1, MAX_16BIT_INTEGER = Math.pow(2, 16) - 1, MAX_32BIT_INTEGER = Math.pow(2, 32) - 1, MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1, MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1, MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;
    exports$1.getPointerArray = function(size) {
      var maxIndex = size - 1;
      if (maxIndex <= MAX_8BIT_INTEGER)
        return Uint8Array;
      if (maxIndex <= MAX_16BIT_INTEGER)
        return Uint16Array;
      if (maxIndex <= MAX_32BIT_INTEGER)
        return Uint32Array;
      throw new Error("mnemonist: Pointer Array of size > 4294967295 is not supported.");
    }, exports$1.getSignedPointerArray = function(size) {
      var maxIndex = size - 1;
      return maxIndex <= MAX_SIGNED_8BIT_INTEGER ? Int8Array : maxIndex <= MAX_SIGNED_16BIT_INTEGER ? Int16Array : maxIndex <= MAX_SIGNED_32BIT_INTEGER ? Int32Array : Float64Array;
    }, exports$1.getNumberType = function(value) {
      return value === (value | 0) ? Math.sign(value) === -1 ? value <= 127 && value >= -128 ? Int8Array : value <= 32767 && value >= -32768 ? Int16Array : Int32Array : value <= 255 ? Uint8Array : value <= 65535 ? Uint16Array : Uint32Array : Float64Array;
    };
    var TYPE_PRIORITY = {
      Uint8Array: 1,
      Int8Array: 2,
      Uint16Array: 3,
      Int16Array: 4,
      Uint32Array: 5,
      Int32Array: 6,
      Float32Array: 7,
      Float64Array: 8
    };
    exports$1.getMinimalRepresentation = function(array, getter) {
      var maxType = null, maxPriority = 0, p, t, v, i, l;
      for (i = 0, l = array.length; i < l; i++)
        v = getter ? getter(array[i]) : array[i], t = exports$1.getNumberType(v), p = TYPE_PRIORITY[t.name], p > maxPriority && (maxPriority = p, maxType = t);
      return maxType;
    }, exports$1.isTypedArray = function(value) {
      return typeof ArrayBuffer < "u" && ArrayBuffer.isView(value);
    }, exports$1.concat = function() {
      var length = 0, i, o, l;
      for (i = 0, l = arguments.length; i < l; i++)
        length += arguments[i].length;
      var array = new arguments[0].constructor(length);
      for (i = 0, o = 0; i < l; i++)
        array.set(arguments[i], o), o += arguments[i].length;
      return array;
    }, exports$1.indices = function(length) {
      for (var PointerArray = exports$1.getPointerArray(length), array = new PointerArray(length), i = 0; i < length; i++)
        array[i] = i;
      return array;
    };
  })(typedArrays)), typedArrays;
}
var iterables = {}, hasRequiredIterables;
function requireIterables() {
  if (hasRequiredIterables) return iterables;
  hasRequiredIterables = 1;
  var forEach = requireForeach(), typed = requireTypedArrays();
  function isArrayLike(target) {
    return Array.isArray(target) || typed.isTypedArray(target);
  }
  function guessLength(target) {
    if (typeof target.length == "number")
      return target.length;
    if (typeof target.size == "number")
      return target.size;
  }
  function toArray(target) {
    var l = guessLength(target), array = typeof l == "number" ? new Array(l) : [], i = 0;
    return forEach(target, function(value) {
      array[i++] = value;
    }), array;
  }
  function toArrayWithIndices(target) {
    var l = guessLength(target), IndexArray = typeof l == "number" ? typed.getPointerArray(l) : Array, array = typeof l == "number" ? new Array(l) : [], indices = typeof l == "number" ? new IndexArray(l) : [], i = 0;
    return forEach(target, function(value) {
      array[i] = value, indices[i] = i++;
    }), [array, indices];
  }
  return iterables.isArrayLike = isArrayLike, iterables.guessLength = guessLength, iterables.toArray = toArray, iterables.toArrayWithIndices = toArrayWithIndices, iterables;
}
var lruCache, hasRequiredLruCache;
function requireLruCache() {
  if (hasRequiredLruCache) return lruCache;
  hasRequiredLruCache = 1;
  var Iterator = requireIterator(), forEach = requireForeach(), typed = requireTypedArrays(), iterables2 = requireIterables();
  function LRUCache(Keys, Values, capacity) {
    if (arguments.length < 2 && (capacity = Keys, Keys = null, Values = null), this.capacity = capacity, typeof this.capacity != "number" || this.capacity <= 0)
      throw new Error("mnemonist/lru-cache: capacity should be positive number.");
    if (!isFinite(this.capacity) || Math.floor(this.capacity) !== this.capacity)
      throw new Error("mnemonist/lru-cache: capacity should be a finite positive integer.");
    var PointerArray = typed.getPointerArray(capacity);
    this.forward = new PointerArray(capacity), this.backward = new PointerArray(capacity), this.K = typeof Keys == "function" ? new Keys(capacity) : new Array(capacity), this.V = typeof Values == "function" ? new Values(capacity) : new Array(capacity), this.size = 0, this.head = 0, this.tail = 0, this.items = {};
  }
  return LRUCache.prototype.clear = function() {
    this.size = 0, this.head = 0, this.tail = 0, this.items = {};
  }, LRUCache.prototype.splayOnTop = function(pointer) {
    var oldHead = this.head;
    if (this.head === pointer)
      return this;
    var previous = this.backward[pointer], next = this.forward[pointer];
    return this.tail === pointer ? this.tail = previous : this.backward[next] = previous, this.forward[previous] = next, this.backward[oldHead] = pointer, this.head = pointer, this.forward[pointer] = oldHead, this;
  }, LRUCache.prototype.set = function(key, value) {
    var pointer = this.items[key];
    if (typeof pointer < "u") {
      this.splayOnTop(pointer), this.V[pointer] = value;
      return;
    }
    this.size < this.capacity ? pointer = this.size++ : (pointer = this.tail, this.tail = this.backward[pointer], delete this.items[this.K[pointer]]), this.items[key] = pointer, this.K[pointer] = key, this.V[pointer] = value, this.forward[pointer] = this.head, this.backward[this.head] = pointer, this.head = pointer;
  }, LRUCache.prototype.setpop = function(key, value) {
    var oldValue = null, oldKey = null, pointer = this.items[key];
    return typeof pointer < "u" ? (this.splayOnTop(pointer), oldValue = this.V[pointer], this.V[pointer] = value, { evicted: false, key, value: oldValue }) : (this.size < this.capacity ? pointer = this.size++ : (pointer = this.tail, this.tail = this.backward[pointer], oldValue = this.V[pointer], oldKey = this.K[pointer], delete this.items[oldKey]), this.items[key] = pointer, this.K[pointer] = key, this.V[pointer] = value, this.forward[pointer] = this.head, this.backward[this.head] = pointer, this.head = pointer, oldKey ? { evicted: true, key: oldKey, value: oldValue } : null);
  }, LRUCache.prototype.has = function(key) {
    return key in this.items;
  }, LRUCache.prototype.get = function(key) {
    var pointer = this.items[key];
    if (!(typeof pointer > "u"))
      return this.splayOnTop(pointer), this.V[pointer];
  }, LRUCache.prototype.peek = function(key) {
    var pointer = this.items[key];
    if (!(typeof pointer > "u"))
      return this.V[pointer];
  }, LRUCache.prototype.forEach = function(callback, scope) {
    scope = arguments.length > 1 ? scope : this;
    for (var i = 0, l = this.size, pointer = this.head, keys = this.K, values = this.V, forward = this.forward; i < l; )
      callback.call(scope, values[pointer], keys[pointer], this), pointer = forward[pointer], i++;
  }, LRUCache.prototype.keys = function() {
    var i = 0, l = this.size, pointer = this.head, keys = this.K, forward = this.forward;
    return new Iterator(function() {
      if (i >= l)
        return { done: true };
      var key = keys[pointer];
      return i++, i < l && (pointer = forward[pointer]), {
        done: false,
        value: key
      };
    });
  }, LRUCache.prototype.values = function() {
    var i = 0, l = this.size, pointer = this.head, values = this.V, forward = this.forward;
    return new Iterator(function() {
      if (i >= l)
        return { done: true };
      var value = values[pointer];
      return i++, i < l && (pointer = forward[pointer]), {
        done: false,
        value
      };
    });
  }, LRUCache.prototype.entries = function() {
    var i = 0, l = this.size, pointer = this.head, keys = this.K, values = this.V, forward = this.forward;
    return new Iterator(function() {
      if (i >= l)
        return { done: true };
      var key = keys[pointer], value = values[pointer];
      return i++, i < l && (pointer = forward[pointer]), {
        done: false,
        value: [key, value]
      };
    });
  }, typeof Symbol < "u" && (LRUCache.prototype[Symbol.iterator] = LRUCache.prototype.entries), LRUCache.prototype.inspect = function() {
    for (var proxy = /* @__PURE__ */ new Map(), iterator2 = this.entries(), step; step = iterator2.next(), !step.done; )
      proxy.set(step.value[0], step.value[1]);
    return Object.defineProperty(proxy, "constructor", {
      value: LRUCache,
      enumerable: false
    }), proxy;
  }, typeof Symbol < "u" && (LRUCache.prototype[/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")] = LRUCache.prototype.inspect), LRUCache.from = function(iterable, Keys, Values, capacity) {
    if (arguments.length < 2) {
      if (capacity = iterables2.guessLength(iterable), typeof capacity != "number")
        throw new Error("mnemonist/lru-cache.from: could not guess iterable length. Please provide desired capacity as last argument.");
    } else arguments.length === 2 && (capacity = Keys, Keys = null, Values = null);
    var cache2 = new LRUCache(Keys, Values, capacity);
    return forEach(iterable, function(value, key) {
      cache2.set(key, value);
    }), cache2;
  }, lruCache = LRUCache, lruCache;
}
var memory, hasRequiredMemory;
function requireMemory() {
  if (hasRequiredMemory) return memory;
  hasRequiredMemory = 1;
  const LRUCache = requireLruCache(), { abstractLogging } = requireUtil(), StorageInterface = require_interface(), { findMatchingIndexes, findNotMatching, bsearchIndex, wildcardMatch } = requireUtil(), setImmediate = typeof globalThis.setImmediate < "u" ? globalThis.setImmediate : (fn, ...args) => setTimeout(fn, 0, ...args), DEFAULT_CACHE_SIZE = 1024;
  class StorageMemory extends StorageInterface {
    /**
     * in-memory storage
     * @param {StorageMemoryOptions} options
     */
    constructor(options = {}) {
      if (options.size && (typeof options.size != "number" || options.size < 1))
        throw new Error("size must be a positive integer greater than 0");
      super(options), this.size = options.size || DEFAULT_CACHE_SIZE, this.log = options.log || abstractLogging(), this.invalidation = options.invalidation || false, this.init();
    }
    init() {
      this.store = new LRUCache(this.size), this.invalidation && (this.keysReferences = /* @__PURE__ */ new Map(), this.referencesKeys = /* @__PURE__ */ new Map());
    }
    /**
     * retrieve the value by key
     * @param {string} key
     * @returns {undefined|*} undefined if key not found or expired
     */
    get(key) {
      this.log.debug({ msg: "acd/storage/memory.get", key });
      const entry = this.store.get(key);
      if (entry) {
        if (this.log.debug({ msg: "acd/storage/memory.get, entry", entry, now: now() }), entry.start + entry.ttl > now())
          return this.log.debug({ msg: "acd/storage/memory.get, key is NOT expired", key, entry }), entry.value;
        this.log.debug({ msg: "acd/storage/memory.get, key is EXPIRED", key, entry }), setImmediate(() => this.remove(key));
      }
    }
    /**
     * retrieve the remaining TTL value by key
     * @param {string} key
     * @returns {undefined|*} undefined if key not found or expired
     */
    getTTL(key) {
      this.log.debug({ msg: "acd/storage/memory.getTTL", key });
      const entry = this.store.peek(key);
      let ttl = 0;
      return entry && (ttl = entry.start + entry.ttl - now(), ttl < 0 && (ttl = 0)), ttl;
    }
    /**
     * set value by key
     * @param {string} key
     * @param {*} value
     * @param {?number} [ttl=0] - ttl in seconds; zero means key will not be stored
     * @param {?string[]} references
     */
    set(key, value, ttl, references) {
      if (this.log.debug({ msg: "acd/storage/memory.set", key, value, ttl, references }), ttl = Number(ttl), !ttl || ttl < 0)
        return;
      const existingKey = this.store.has(key), removed = this.store.setpop(key, { value, ttl, start: now() });
      if (this.log.debug({ msg: "acd/storage/memory.set, evicted", removed }), removed && removed.evicted && (this.log.debug({ msg: "acd/storage/memory.set, remove evicted key", key: removed.key }), this._removeReferences([removed.key])), !references || references.length < 1)
        return;
      if (!this.invalidation) {
        this.log.warn({ msg: "acd/storage/memory.set, invalidation is disabled, references are useless" });
        return;
      }
      references = [...new Set(references)];
      let currentReferences;
      if (existingKey && (currentReferences = this.keysReferences.get(key), this.log.debug({ msg: "acd/storage/memory.set, current keys-references", key, references: currentReferences }), currentReferences)) {
        currentReferences.sort(), references.sort();
        const referencesToRemove = findNotMatching(references, currentReferences);
        for (const reference of referencesToRemove) {
          const keys = this.referencesKeys.get(reference);
          if (!keys)
            continue;
          const index = bsearchIndex(keys, key);
          if (!(index < 0)) {
            if (keys.splice(index, 1), keys.length < 1) {
              this.referencesKeys.delete(reference);
              continue;
            }
            this.referencesKeys.set(reference, keys);
          }
        }
      }
      const referencesToAdd = currentReferences ? findNotMatching(currentReferences, references) : references;
      for (let i = 0; i < referencesToAdd.length; i++) {
        const reference = referencesToAdd[i];
        let keys = this.referencesKeys.get(reference);
        keys ? (this.log.debug({ msg: "acd/storage/memory.set, add reference-key", key, reference }), keys.push(key)) : keys = [key], this.log.debug({ msg: "acd/storage/memory.set, set reference-keys", keys, reference }), this.referencesKeys.set(reference, keys);
      }
      this.keysReferences.set(key, references);
    }
    /**
     * remove an entry by key
     * @param {string} key
     * @returns {boolean} indicates if key was removed
     */
    remove(key) {
      this.log.debug({ msg: "acd/storage/memory.remove", key });
      const removed = this._removeKey(key);
      return this._removeReferences([key]), removed;
    }
    /**
     * @param {string} key
     * @returns {boolean}
     */
    _removeKey(key) {
      return this.log.debug({ msg: "acd/storage/memory._removeKey", key }), this.store.has(key) ? (this.store.set(key, void 0), true) : false;
    }
    /**
     * @param {string[]} keys
     */
    _removeReferences(keys) {
      if (!this.invalidation)
        return;
      this.log.debug({ msg: "acd/storage/memory._removeReferences", keys });
      const referencesToRemove = /* @__PURE__ */ new Set();
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i], references = this.keysReferences.get(key);
        if (references) {
          for (let j = 0; j < references.length; j++)
            referencesToRemove.add(references[j]);
          this.log.debug({ msg: "acd/storage/memory._removeReferences, delete key-references", key }), this.keysReferences.delete(key);
        }
      }
      this._removeReferencesKeys([...referencesToRemove], keys);
    }
    /**
     * @param {!string[]} references
     * @param {string[]} keys
     */
    _removeReferencesKeys(references, keys) {
      keys.sort(), this.log.debug({ msg: "acd/storage/memory._removeReferencesKeys", references, keys });
      for (let i = 0; i < references.length; i++) {
        const reference = references[i], referencesKeys = this.referencesKeys.get(reference);
        if (this.log.debug({ msg: "acd/storage/memory._removeReferencesKeys, get reference-key", reference, keys, referencesKeys }), !referencesKeys) continue;
        const referencesToRemove = findMatchingIndexes(keys, referencesKeys);
        if (this.log.debug({ msg: "acd/storage/memory._removeReferencesKeys, removing", reference, referencesToRemove, referencesKeys }), referencesToRemove.length === referencesKeys.length) {
          this.log.debug({ msg: "acd/storage/memory._removeReferencesKeys, delete", reference }), this.referencesKeys.delete(reference);
          continue;
        }
        for (let j = referencesToRemove.length - 1; j >= 0; j--)
          this.log.debug({ msg: "acd/storage/memory._removeReferencesKeys, remove", reference, referencesKeys, at: referencesToRemove[j] }), referencesKeys.splice(referencesToRemove[j], 1);
      }
    }
    /**
     * @param {string|string[]} references
     * @returns {string[]} removed keys
     */
    invalidate(references) {
      return this.invalidation ? (this.log.debug({ msg: "acd/storage/memory.invalidate", references }), Array.isArray(references) ? this._invalidateReferences(references) : this._invalidateReference(references)) : (this.log.warn({ msg: "acd/storage/memory.invalidate, exit due invalidation is disabled" }), []);
    }
    /**
     * @param {string[]} references
     * @returns {string[]} removed keys
     */
    _invalidateReferences(references) {
      const removed = [];
      for (let i = 0; i < references.length; i++) {
        const reference = references[i], keys = this.referencesKeys.get(reference);
        if (this.log.debug({ msg: "acd/storage/memory._invalidateReferences, remove keys on reference", reference, keys }), !!keys) {
          for (let j = 0; j < keys.length; j++) {
            const key = keys[j];
            this.log.debug({ msg: "acd/storage/memory._invalidateReferences, remove key on reference", reference, key }), this._removeKey(key) && removed.push(key);
          }
          this.log.debug({ msg: "acd/storage/memory._invalidateReferences, remove references of", reference, keys }), this._removeReferences([...keys]);
        }
      }
      return removed;
    }
    /**
     * @param {string} reference
     * @returns {string[]} removed keys
     */
    _invalidateReference(reference) {
      if (reference.includes("*")) {
        const references = [];
        for (const key of this.referencesKeys.keys())
          wildcardMatch(reference, key) && references.push(key);
        return this._invalidateReferences(references);
      }
      const keys = this.referencesKeys.get(reference), removed = [];
      if (this.log.debug({ msg: "acd/storage/memory._invalidateReference, remove keys on reference", reference, keys }), !keys)
        return removed;
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        this.log.debug({ msg: "acd/storage/memory._invalidateReference, remove key on reference", reference, key }), this._removeKey(key) && removed.push(key);
      }
      return this.log.debug({ msg: "acd/storage/memory._invalidateReference, remove references of", reference, keys }), this._removeReferences([...keys]), removed;
    }
    /**
     * remove all entries if name is not provided
     * remove entries where key starts with name if provided
     * @param {?string} name
     * @return {string[]} removed keys
     */
    clear(name) {
      if (this.log.debug({ msg: "acd/storage/memory.clear", name }), !name) {
        if (this.store.clear(), !this.invalidation)
          return;
        this.referencesKeys.clear(), this.keysReferences.clear();
        return;
      }
      const keys = [];
      this.store.forEach((value, key) => {
        this.log.debug({ msg: "acd/storage/memory.clear, iterate key", key }), key.indexOf(name) === 0 && (this.log.debug({ msg: "acd/storage/memory.clear, remove key", key }), keys.push(key));
      });
      const removed = [];
      for (let i = 0; i < keys.length; i++)
        this._removeKey(keys[i]) && removed.push(keys[i]);
      return this._removeReferences(removed), removed;
    }
    refresh() {
      this.log.debug({ msg: "acd/storage/memory.refresh" }), this.init();
    }
  }
  let _timer;
  function now() {
    if (_timer !== void 0)
      return _timer;
    _timer = Math.floor(Date.now() / 1e3);
    const timeout = setTimeout(_clearTimer, 1e3);
    return typeof timeout.unref == "function" && timeout.unref(), _timer;
  }
  function _clearTimer() {
    _timer = void 0;
  }
  return memory = StorageMemory, memory;
}
var storage, hasRequiredStorage;
function requireStorage() {
  if (hasRequiredStorage) return storage;
  hasRequiredStorage = 1;
  const { isServerSide } = requireUtil();
  let StorageRedis;
  isServerSide && (StorageRedis = requireRedis());
  const StorageMemory = requireMemory(), StorageOptionsType = {
    redis: "redis"
  };
  function createStorage(type, options) {
    if (!isServerSide && type === StorageOptionsType.redis)
      throw new Error("Redis storage is not supported in the browser");
    return type === StorageOptionsType.redis ? new StorageRedis(options) : new StorageMemory(options);
  }
  return storage = createStorage, storage;
}
var hasRequiredCache;
function requireCache() {
  if (hasRequiredCache) return cache;
  hasRequiredCache = 1;
  const { kValues, kStorage, kStorages, kTransfromer, kTTL, kOnDedupe, kOnError, kOnHit, kOnMiss, kStale } = requireSymbol(), stringify = requireSafeStableStringify(), createStorage = requireStorage();
  class Cache {
    /**
     * @param {!Object} opts
     * @param {!Storage} opts.storage - the storage to use
     * @param {?Object} opts.transformer - the transformer to use
     * @param {?number} [opts.ttl=0] - in seconds; default is 0 seconds, so it only does dedupe without cache
     * @param {?function} opts.onDedupe
     * @param {?function} opts.onError
     * @param {?function} opts.onHit
     * @param {?function} opts.onMiss
     */
    constructor(options = {}) {
      if (!options.storage)
        throw new Error("storage is required");
      if (options.ttl && typeof options.ttl == "number" && (options.ttl < 0 || !Number.isInteger(options.ttl)))
        throw new Error("ttl must be a positive integer greater than 0");
      if (options.onDedupe && typeof options.onDedupe != "function")
        throw new Error("onDedupe must be a function");
      if (options.onError && typeof options.onError != "function")
        throw new Error("onError must be a function");
      if (options.onHit && typeof options.onHit != "function")
        throw new Error("onHit must be a function");
      if (options.onMiss && typeof options.onMiss != "function")
        throw new Error("onMiss must be a function");
      if (typeof options.stale == "number" && !(Math.floor(options.stale) === options.stale && options.stale >= 0))
        throw new Error("stale must be an integer greater or equal to 0");
      this[kValues] = {}, this[kStorage] = options.storage, this[kStorages] = /* @__PURE__ */ new Map(), this[kStorages].set("_default", options.storage), this[kTransfromer] = options.transformer, this[kTTL] = options.ttl || 0, this[kOnDedupe] = options.onDedupe || noop, this[kOnError] = options.onError || noop, this[kOnHit] = options.onHit || noop, this[kOnMiss] = options.onMiss || noop, this[kStale] = options.stale || 0;
    }
    /**
     * add a new function to dedupe (and cache)
     * @param {!string} name name of the function
     * @param {?Object} [opts]
     * @param {?Object} [opts.storage] storage to use; default is the main one
     * @param {?Object} opts.transformer - the transformer to use
     * @param {?number} [opts.ttl] ttl for the results; default ttl is the one passed to the constructor
     * @param {?function} [opts.onDedupe] function to call on dedupe; default is the one passed to the constructor
     * @param {?function} [opts.onError] function to call on error; default is the one passed to the constructor
     * @param {?function} [opts.onHit] function to call on hit; default is the one passed to the constructor
     * @param {?function} [opts.onMiss] function to call on miss; default is the one passed to the constructor
     * @param {?function} [opts.serialize] custom function to serialize the arguments of `func`, in order to create the key for deduping and caching
     * @param {?function} [opts.references] function to generate references
     * @param {!function} func the function to dedupe (and cache)
     **/
    define(name, opts, func) {
      if (typeof opts == "function" && (func = opts, opts = {}), name && this[name])
        throw new Error(`${name} is already defined in the cache or it is a forbidden name`);
      if (opts = opts || {}, typeof func != "function")
        throw new TypeError(`Missing the function parameter for '${name}'`);
      const serialize = opts.serialize;
      if (serialize && typeof serialize != "function")
        throw new TypeError("serialize must be a function");
      const references = opts.references;
      if (references && typeof references != "function")
        throw new TypeError("references must be a function");
      if (typeof opts.ttl != "function" && opts.ttl && (typeof opts.ttl != "number" || opts.ttl < 0 || !Number.isInteger(opts.ttl)))
        throw new Error("ttl must be a positive integer greater than 0");
      let storage2;
      opts.storage ? (storage2 = createStorage(opts.storage.type, opts.storage.options), this[kStorages].set(name, storage2)) : storage2 = this[kStorage];
      const ttl = opts.ttl !== void 0 ? opts.ttl : this[kTTL], stale = opts.stale !== void 0 ? opts.stale : this[kStale], onDedupe = opts.onDedupe || this[kOnDedupe], onError = opts.onError || this[kOnError], onHit = opts.onHit || this[kOnHit], onMiss = opts.onMiss || this[kOnMiss], transformer = opts.transformer || this[kTransfromer], wrapper = new Wrapper(func, name, serialize, references, storage2, transformer, ttl, onDedupe, onError, onHit, onMiss, stale);
      return this[kValues][name] = wrapper, this[name] = wrapper.add.bind(wrapper), this;
    }
    async clear(name, value) {
      if (name) {
        if (!this[kValues][name])
          throw new Error(`${name} is not defined in the cache`);
        await this[kValues][name].clear(value);
        return;
      }
      const clears = [];
      for (const wrapper of Object.values(this[kValues]))
        clears.push(wrapper.clear());
      await Promise.all(clears);
    }
    async get(name, key) {
      if (!this[kValues][name])
        throw new Error(`${name} is not defined in the cache`);
      return this[kValues][name].get(key);
    }
    async set(name, key, value, ttl, references) {
      if (!this[kValues][name])
        throw new Error(`${name} is not defined in the cache`);
      return this[kValues][name].set(key, value, ttl, references);
    }
    async invalidate(name, references) {
      if (!this[kValues][name])
        throw new Error(`${name} is not defined in the cache`);
      return this[kValues][name].invalidate(references);
    }
    async invalidateAll(references, storage2 = "_default") {
      if (!this[kStorages].has(storage2))
        throw new Error(`${storage2} storage is not defined in the cache`);
      await this[kStorages].get(storage2).invalidate(references);
    }
  }
  class Wrapper {
    /**
     * @param {function} func
     * @param {string} name
     * @param {function} serialize
     * @param {function} references
     * @param {Storage} storage
     * @param {Object} transformer
     * @param {number} ttl
     * @param {function} onDedupe
     * @param {function} onError
     * @param {function} onHit
     * @param {function} onMiss
     * @param {stale} ttl
     */
    constructor(func, name, serialize, references, storage2, transformer, ttl, onDedupe, onError, onHit, onMiss, stale) {
      this.dedupes = /* @__PURE__ */ new Map(), this.func = func, this.name = name, this.serialize = serialize, this.references = references, this.storage = storage2, this.transformer = transformer, this.ttl = ttl, this.onDedupe = onDedupe, this.onError = onError, this.onHit = onHit, this.onMiss = onMiss, this.stale = stale;
    }
    getKey(args) {
      const id = this.serialize ? this.serialize(args) : args;
      return typeof id == "string" ? id : stringify(id);
    }
    getStorageKey(key) {
      return `${this.name}~${key}`;
    }
    getStorageName() {
      return `${this.name}~`;
    }
    add(args) {
      try {
        const key = this.getKey(args);
        let query = this.dedupes.get(key);
        return query ? this.onDedupe(key) : (query = new Query(), this.buildPromise(query, args, key), this.dedupes.set(key, query)), query.promise;
      } catch (err) {
        this.onError(err);
      }
    }
    /**
     * wrap the original func to sync storage
     */
    async wrapFunction(args, key) {
      const storageKey = this.getStorageKey(key);
      if (this.ttl > 0 || typeof this.ttl == "function") {
        const data = await this.get(storageKey);
        if (data !== void 0) {
          this.onHit(key);
          const stale = typeof this.stale == "function" ? this.stale(data) : this.stale;
          return stale > 0 && await this.storage.getTTL(storageKey) <= stale && this._wrapFunction(storageKey, args, key).catch(noop), data;
        } else
          this.onMiss(key);
      }
      return this._wrapFunction(storageKey, args, key);
    }
    async _wrapFunction(storageKey, args, key) {
      const result = await this.func(args, key), stale = typeof this.stale == "function" ? this.stale(result) : this.stale;
      let ttl = typeof this.ttl == "function" ? this.ttl(result) : this.ttl;
      if (ttl == null || typeof ttl != "number" || !Number.isInteger(ttl))
        return this.onError(new Error("ttl must be an integer")), result;
      if (ttl += stale, ttl < 1)
        return result;
      if (!this.references)
        return await this.set(storageKey, result, ttl), result;
      try {
        let references = this.references(args, key, result), value = result;
        references && typeof references.then == "function" && (references = await references), this.transformer && (value = this.transformer.serialize(result)), await this.storage.set(storageKey, value, ttl, references);
      } catch (err) {
        this.onError(err);
      }
      return result;
    }
    buildPromise(query, args, key) {
      query.promise = this.wrapFunction(args, key), query.promise.then((result) => (this.dedupes.delete(key), result)).catch((err) => {
        this.onError(err), this.dedupes.delete(key);
        const r = this.storage.remove(this.getStorageKey(key));
        r && typeof r.catch == "function" && r.catch(noop);
      });
    }
    async clear(value) {
      if (value) {
        const key = this.getKey(value);
        this.dedupes.delete(key), await this.storage.remove(this.getStorageKey(key));
        return;
      }
      await this.storage.clear(this.getStorageName()), this.dedupes.clear();
    }
    async get(key) {
      const data = await this.storage.get(key);
      return this.transformer && data ? await this.transformer.deserialize(data) : data;
    }
    async set(key, value, ttl, references) {
      return this.transformer && (value = this.transformer.serialize(value)), this.storage.set(key, value, ttl, references);
    }
    async invalidate(references) {
      return this.storage.invalidate(references);
    }
  }
  class Query {
    constructor() {
      this.promise = null;
    }
  }
  function noop() {
  }
  return cache.Cache = Cache, cache;
}
var asyncCacheDedupe, hasRequiredAsyncCacheDedupe;
function requireAsyncCacheDedupe() {
  if (hasRequiredAsyncCacheDedupe) return asyncCacheDedupe;
  hasRequiredAsyncCacheDedupe = 1;
  const { Cache } = requireCache(), createStorage = requireStorage();
  function createCache(options) {
    options ? options.storage || (options.storage = { type: "memory" }) : options = { storage: { type: "memory" } };
    const storage2 = createStorage(options.storage.type, options.storage.options);
    return new Cache({
      ...options,
      storage: storage2
    });
  }
  return asyncCacheDedupe = {
    Cache,
    createCache,
    createStorage
  }, asyncCacheDedupe;
}
var asyncCacheDedupeExports = requireAsyncCacheDedupe();
let tasks = 0, resolves = [];
function startTask() {
  return tasks += 1, () => {
    if (tasks -= 1, tasks === 0) {
      let prevResolves = resolves;
      resolves = [];
      for (let i of prevResolves) i();
    }
  };
}
let listenerQueue = [], lqIndex = 0;
const QUEUE_ITEMS_PER_LISTENER = 4;
let atom = (initialValue) => {
  let listeners = [], $atom = {
    get() {
      return $atom.lc || $atom.listen(() => {
      })(), $atom.value;
    },
    lc: 0,
    listen(listener) {
      return $atom.lc = listeners.push(listener), () => {
        for (let i = lqIndex + QUEUE_ITEMS_PER_LISTENER; i < listenerQueue.length; )
          listenerQueue[i] === listener ? listenerQueue.splice(i, QUEUE_ITEMS_PER_LISTENER) : i += QUEUE_ITEMS_PER_LISTENER;
        let index = listeners.indexOf(listener);
        ~index && (listeners.splice(index, 1), --$atom.lc || $atom.off());
      };
    },
    notify(oldValue, changedKey) {
      let runListenerQueue = !listenerQueue.length;
      for (let listener of listeners)
        listenerQueue.push(listener, $atom.value, oldValue, changedKey);
      if (runListenerQueue) {
        for (lqIndex = 0; lqIndex < listenerQueue.length; lqIndex += QUEUE_ITEMS_PER_LISTENER)
          listenerQueue[lqIndex](
            listenerQueue[lqIndex + 1],
            listenerQueue[lqIndex + 2],
            listenerQueue[lqIndex + 3]
          );
        listenerQueue.length = 0;
      }
    },
    /* It will be called on last listener unsubscribing.
       We will redefine it in onMount and onStop. */
    off() {
    },
    set(newValue) {
      let oldValue = $atom.value;
      oldValue !== newValue && ($atom.value = newValue, $atom.notify(oldValue));
    },
    subscribe(listener) {
      let unbind = $atom.listen(listener);
      return listener($atom.value), unbind;
    },
    value: initialValue
  };
  return $atom;
};
const MOUNT = 5, UNMOUNT = 6, REVERT_MUTATION = 10;
let on = (object, listener, eventKey, mutateStore) => (object.events = object.events || {}, object.events[eventKey + REVERT_MUTATION] || (object.events[eventKey + REVERT_MUTATION] = mutateStore((eventProps) => {
  object.events[eventKey].reduceRight((event, l) => (l(event), event), {
    shared: {},
    ...eventProps
  });
})), object.events[eventKey] = object.events[eventKey] || [], object.events[eventKey].push(listener), () => {
  let currentListeners = object.events[eventKey], index = currentListeners.indexOf(listener);
  currentListeners.splice(index, 1), currentListeners.length || (delete object.events[eventKey], object.events[eventKey + REVERT_MUTATION](), delete object.events[eventKey + REVERT_MUTATION]);
}), STORE_UNMOUNT_DELAY = 1e3, onMount = ($store, initialize) => on($store, (payload) => {
  let destroy = initialize(payload);
  destroy && $store.events[UNMOUNT].push(destroy);
}, MOUNT, (runListeners) => {
  let originListen = $store.listen;
  $store.listen = (...args) => (!$store.lc && !$store.active && ($store.active = true, runListeners()), originListen(...args));
  let originOff = $store.off;
  if ($store.events[UNMOUNT] = [], $store.off = () => {
    originOff(), setTimeout(() => {
      if ($store.active && !$store.lc) {
        $store.active = false;
        for (let destroy of $store.events[UNMOUNT]) destroy();
        $store.events[UNMOUNT] = [];
      }
    }, STORE_UNMOUNT_DELAY);
  }, false) ;
  return () => {
    $store.listen = originListen, $store.off = originOff;
  };
}), map$1 = (initial = {}) => {
  let $map = atom(initial);
  return $map.setKey = function(key, value) {
    let oldMap = $map.value;
    typeof value > "u" && key in $map.value ? ($map.value = { ...$map.value }, delete $map.value[key], $map.notify(oldMap, key)) : $map.value[key] !== value && ($map.value = {
      ...$map.value,
      [key]: value
    }, $map.notify(oldMap, key));
  }, $map;
};
const runtime = typeof document > "u" ? "server" : "browser", defineEnableLiveMode = (config) => {
  const { ssr, setFetcher } = config;
  return (options) => {
    if (runtime === "server")
      throw new Error("Live mode is not supported in server environments");
    if (ssr && !options.client)
      throw new Error("The `client` option in `enableLiveMode` is required");
    const client = options.client || config.client || void 0, controller = new AbortController();
    let disableLiveMode;
    return __vitePreload(async () => { const {enableLiveMode} = await import('./cVTnJKQ3.js');return { enableLiveMode }},true              ?__vite__mapDeps([0,1,2,3]):void 0,import.meta.url).then(({ enableLiveMode }) => {
      controller.signal.aborted || (disableLiveMode = enableLiveMode({ ...options, client, setFetcher, ssr }));
    }), () => {
      controller.abort(), disableLiveMode?.();
    };
  };
};
function cloneClientWithConfig(newClient) {
  return newClient.withConfig({
    allowReconfigure: false
  });
}
const createQueryStore$1 = (options) => {
  const { ssr = false, tag = "core-loader" } = options;
  if (ssr && options.client)
    throw new TypeError(
      "`client` option is not allowed when `ssr: true`, use `setServerClient` from your server entry point instead"
    );
  if (!ssr && options.client === false)
    throw new TypeError("You must set `ssr: true` when `client: false` is used");
  if (!ssr && !options.client)
    throw new TypeError("`client` is required");
  let client = ssr ? void 0 : cloneClientWithConfig(options.client);
  function createDefaultCache(client2) {
    return asyncCacheDedupeExports.createCache().define("fetch", async (key) => {
      if (!client2)
        throw new Error(
          "You have to set the Sanity client with `setServerClient` before any data fetching is done"
        );
      const { query, params = {}, perspective, useCdn, stega } = JSON.parse(key), { result, resultSourceMap } = await client2.fetch(query, params, {
        tag,
        filterResponse: false,
        perspective,
        useCdn,
        stega
      });
      return { result, resultSourceMap };
    });
  }
  function createDefaultFetcher() {
    const initialPerspective = client?.config().perspective || "published";
    return unstable__cache.instance = createDefaultCache(client), {
      hydrate: (_query, _params, initial) => ({
        loading: initial?.data === void 0 || initial?.sourceMap === void 0,
        error: void 0,
        data: initial?.data,
        sourceMap: initial?.sourceMap,
        perspective: initialPerspective
      }),
      fetch: (query, params, $fetch, controller) => {
        if (controller.signal.aborted) return;
        const finishTask = startTask();
        $fetch.setKey("loading", true), $fetch.setKey("error", void 0), unstable__cache.instance.fetch(JSON.stringify({ query, params })).then((response) => {
          controller.signal.aborted || ($fetch.setKey("data", response.result), $fetch.setKey("sourceMap", response.resultSourceMap), $fetch.setKey("perspective", initialPerspective));
        }).catch((reason) => {
          $fetch.setKey("error", reason);
        }).finally(() => {
          $fetch.setKey("loading", false), finishTask();
        });
      }
    };
  }
  const unstable__cache = {
    instance: createDefaultCache(client)
  }, $fetcher = atom(client ? createDefaultFetcher() : void 0), enableLiveMode = defineEnableLiveMode({
    client: client || void 0,
    ssr,
    setFetcher: (fetcher) => {
      const originalFetcher = $fetcher.get();
      return $fetcher.set(fetcher), () => $fetcher.set(originalFetcher);
    }
  }), createFetcherStore = (query, params = {}, initial) => {
    const fetcher = $fetcher.get(), $fetch = map$1(
      fetcher ? fetcher.hydrate(query, params, initial) : {
        loading: false,
        error: typeof initial?.data > "u" ? new Error(
          "The `initial` option is required when `ssr: true`"
        ) : void 0,
        data: initial?.data,
        sourceMap: initial?.sourceMap,
        perspective: initial?.perspective
      }
    );
    return onMount($fetch, () => {
      let controller = new AbortController();
      const unsubscribe = $fetcher.subscribe((fetcher2) => {
        !fetcher2 || controller.signal.aborted || (controller.abort(), controller = new AbortController(), fetcher2.fetch(query, params, $fetch, controller));
      });
      return () => {
        controller.abort(), unsubscribe();
      };
    }), $fetch;
  }, unstable__serverClient = {
    instance: void 0,
    canPreviewDrafts: false
  };
  return {
    createFetcherStore,
    enableLiveMode,
    setServerClient: (newClient) => {
      if (runtime !== "server")
        throw new Error(
          "`setServerClient` can only be called in server environments, detected: " + JSON.stringify(runtime)
        );
      if (!ssr)
        throw new Error("`setServerClient` can only be called when `ssr: true`");
      unstable__serverClient.instance = client = cloneClientWithConfig(newClient), unstable__serverClient.canPreviewDrafts = !!client.config().token, $fetcher.set(createDefaultFetcher());
    },
    unstable__cache,
    unstable__serverClient
  };
};

const createQueryStore = (visualEditing, client, tag) => {
  if (!visualEditing) return void 0;
  const queryStore = createQueryStore$1({
    tag: "nuxt-loader",
    client: false,
    ssr: true
  });
  return queryStore;
};

const e=!(typeof navigator>"u")&&"ReactNative"===navigator.product,t={timeout:e?6e4:12e4},r=function(r){const a={...t,..."string"==typeof r?{url:r}:r};if(a.timeout=n$1(a.timeout),a.query){const{url:t,searchParams:r}=function(t){const r=t.indexOf("?");if(-1===r)return {url:t,searchParams:new URLSearchParams};const n=t.slice(0,r),a=t.slice(r+1);if(!e)return {url:n,searchParams:new URLSearchParams(a)};if("function"!=typeof decodeURIComponent)throw new Error("Broken `URLSearchParams` implementation, and `decodeURIComponent` is not defined");const s=new URLSearchParams;for(const e of a.split("&")){const[t,r]=e.split("=");t&&s.append(o$1(t),o$1(r||""));}return {url:n,searchParams:s}}(a.url);for(const[e,o]of Object.entries(a.query)){if(void 0!==o)if(Array.isArray(o))for(const t of o)r.append(e,t);else r.append(e,o);const n=r.toString();n&&(a.url=`${t}?${n}`);}}return a.method=a.body&&!a.method?"POST":(a.method||"GET").toUpperCase(),a};function o$1(e){return decodeURIComponent(e.replace(/\+/g," "))}function n$1(e){if(false===e||0===e)return  false;if(e.connect||e.socket)return e;const r=Number(e);return isNaN(r)?n$1(t.timeout):{connect:r,socket:r}}const a$2=/^https?:\/\//i,s$1=function(e){if(!a$2.test(e.url))throw new Error(`"${e.url}" is not a valid URL`)};function c$2(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}

const o=["request","response","progress","error","abort"],n=["processOptions","validateOptions","interceptRequest","finalizeOptions","onRequest","onResponse","onError","onReturn","onHeaders"];function s(r$1,a){const i=[],u=n.reduce((e,t)=>(e[t]=e[t]||[],e),{processOptions:[r],validateOptions:[s$1]});function l(e){const t=o.reduce((e,t)=>(e[t]=function(){const e=/* @__PURE__ */Object.create(null);let t=0;return {publish:function(t){for(const r in e)e[r](t);},subscribe:function(r){const o=t++;return e[o]=r,function(){delete e[o];}}}}(),e),{}),r=(e=>function(t,r,...o){const n="onError"===t;let s=r;for(let r=0;r<e[t].length&&(s=(0, e[t][r])(s,...o),!n||s);r++);return s})(u),n=r("processOptions",e);r("validateOptions",n);const s={options:n,channels:t,applyMiddleware:r};let i;const l=t.request.subscribe(e=>{i=a(e,(o,n)=>((e,o,n)=>{let s=e,a=o;if(!s)try{a=r("onResponse",o,n);}catch(e){a=null,s=e;}s=s&&r("onError",s,n),s?t.error.publish(s):a&&t.response.publish(a);})(o,n,e));});t.abort.subscribe(()=>{l(),i&&i.abort();});const c=r("onReturn",t,s);return c===t&&t.request.publish(s),c}return l.use=function(e){if(!e)throw new Error("Tried to add middleware that resolved to falsey value");if("function"==typeof e)throw new Error("Tried to add middleware that was a function. It probably expects you to pass options to it.");if(e.onReturn&&u.onReturn.length>0)throw new Error("Tried to add new middleware with `onReturn` handler, but another handler has already been registered for this event");return n.forEach(t=>{e[t]&&u[t].push(e[t]);}),i.push(e),l},l.clone=()=>s(i,a),r$1.forEach(l.use),l}var a$1,i,u$2=/* @__PURE__ */c$2(function(){if(i)return a$1;i=1;var e=function(e){return e.replace(/^\s+|\s+$/g,"")},t=function(e){return "[object Array]"===Object.prototype.toString.call(e)};return a$1=function(r){if(!r)return {};for(var o=/* @__PURE__ */Object.create(null),n=e(r).split("\n"),s=0;s<n.length;s++){var a=n[s],i=a.indexOf(":"),u=e(a.slice(0,i)).toLowerCase(),l=e(a.slice(i+1));typeof o[u]>"u"?o[u]=l:t(o[u])?o[u].push(l):o[u]=[o[u],l];}return o}}());let l$2 = class l{onabort;onerror;onreadystatechange;ontimeout;readyState=0;response;responseText="";responseType="";status;statusText;withCredentials;#e;#t;#r;#o={};#n;#s={};#a;open(e,t,r){this.#e=e,this.#t=t,this.#r="",this.readyState=1,this.onreadystatechange?.(),this.#n=void 0;}abort(){this.#n&&this.#n.abort();}getAllResponseHeaders(){return this.#r}setRequestHeader(e,t){this.#o[e]=t;}setInit(e,t=true){this.#s=e,this.#a=t;}send(e){const t="arraybuffer"!==this.responseType,r={...this.#s,method:this.#e,headers:this.#o,body:e};"function"==typeof AbortController&&this.#a&&(this.#n=new AbortController,typeof EventTarget<"u"&&this.#n.signal instanceof EventTarget&&(r.signal=this.#n.signal)),typeof document<"u"&&(r.credentials=this.withCredentials?"include":"omit"),fetch(this.#t,r).then(e=>(e.headers.forEach((e,t)=>{this.#r+=`${t}: ${e}\r\n`;}),this.status=e.status,this.statusText=e.statusText,this.readyState=3,this.onreadystatechange?.(),t?e.text():e.arrayBuffer())).then(e=>{"string"==typeof e?this.responseText=e:this.response=e,this.readyState=4,this.onreadystatechange?.();}).catch(e=>{"AbortError"!==e.name?this.onerror?.(e):this.onabort?.();});}};const c$1="function"==typeof XMLHttpRequest?"xhr":"fetch",h$1="xhr"===c$1?XMLHttpRequest:l$2,d$2=(e,t)=>{const r=e.options,o=e.applyMiddleware("finalizeOptions",r),n={},s=e.applyMiddleware("interceptRequest",void 0,{adapter:c$1,context:e});if(s){const e=setTimeout(t,0,null,s);return {abort:()=>clearTimeout(e)}}let a=new h$1;a instanceof l$2&&"object"==typeof o.fetch&&a.setInit(o.fetch,o.useAbortSignal??true);const i=o.headers,d=o.timeout;let p=false,f=false,b=false;if(a.onerror=e=>{m(a instanceof l$2?e instanceof Error?e:new Error(`Request error while attempting to reach is ${o.url}`,{cause:e}):new Error(`Request error while attempting to reach is ${o.url}${e.lengthComputable?`(${e.loaded} of ${e.total} bytes transferred)`:""}`));},a.ontimeout=e=>{m(new Error(`Request timeout while attempting to reach ${o.url}${e.lengthComputable?`(${e.loaded} of ${e.total} bytes transferred)`:""}`));},a.onabort=()=>{w(true),p=true;},a.onreadystatechange=function(){d&&(w(),n.socket=setTimeout(()=>y("ESOCKETTIMEDOUT"),d.socket)),!p&&a&&4===a.readyState&&0!==a.status&&function(){if(!(p||f||b)){if(0===a.status)return void m(new Error("Unknown XHR error"));w(),f=true,t(null,{body:a.response||(""===a.responseType||"text"===a.responseType?a.responseText:""),url:o.url,method:o.method,headers:u$2(a.getAllResponseHeaders()),statusCode:a.status,statusMessage:a.statusText});}}();},a.open(o.method,o.url,true),a.withCredentials=!!o.withCredentials,i&&a.setRequestHeader)for(const e in i)i.hasOwnProperty(e)&&a.setRequestHeader(e,i[e]);return o.rawBody&&(a.responseType="arraybuffer"),e.applyMiddleware("onRequest",{options:o,adapter:c$1,request:a,context:e}),a.send(o.body||null),d&&(n.connect=setTimeout(()=>y("ETIMEDOUT"),d.connect)),{abort:function(){p=true,a&&a.abort();}};function y(t){b=true,a.abort();const r=new Error("ESOCKETTIMEDOUT"===t?`Socket timed out on request to ${o.url}`:`Connection timed out on request to ${o.url}`);r.code=t,e.channels.error.publish(r);}function w(e){(e||p||a&&a.readyState>=2&&n.connect)&&clearTimeout(n.connect),n.socket&&clearTimeout(n.socket);}function m(e){if(f)return;w(true),f=true,a=null;const r=e||new Error(`Network error while attempting to reach ${o.url}`);r.isNetworkError=true,r.request=o,t(r);}},p$2=(e=[],t=d$2)=>s(e,t);

var define_process_env_default = {};
var a, c, u$1, l$1, p$1, d$1 = { exports: {} }; /* @__PURE__ */ c$2((p$1 || (p$1 = 1, (function(e2, t2) {
  t2.formatArgs = function(t3) {
    if (t3[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + t3[0] + (this.useColors ? "%c " : " ") + "+" + e2.exports.humanize(this.diff), !this.useColors) return;
    const s3 = "color: " + this.color;
    t3.splice(1, 0, s3, "color: inherit");
    let n2 = 0, r2 = 0;
    t3[0].replace(/%[a-zA-Z%]/g, (e3) => {
      "%%" !== e3 && (n2++, "%c" === e3 && (r2 = n2));
    }), t3.splice(r2, 0, s3);
  }, t2.save = function(e3) {
    try {
      e3 ? t2.storage.setItem("debug", e3) : t2.storage.removeItem("debug");
    } catch {
    }
  }, t2.load = function() {
    let e3;
    try {
      e3 = t2.storage.getItem("debug") || t2.storage.getItem("DEBUG");
    } catch {
    }
    return !e3 && typeof process < "u" && "env" in process && (e3 = define_process_env_default.DEBUG), e3;
  }, t2.useColors = function() {
    if (typeof window < "u" && window.process && ("renderer" === window.process.type || window.process.__nwjs)) return true;
    if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
    let e3;
    return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator < "u" && navigator.userAgent && (e3 = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(e3[1], 10) >= 31 || typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }, t2.storage = (function() {
    try {
      return localStorage;
    } catch {
    }
  })(), t2.destroy = /* @__PURE__ */ (() => {
    let e3 = false;
    return () => {
      e3 || (e3 = true, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
    };
  })(), t2.colors = ["#0000CC", "#0000FF", "#0033CC", "#0033FF", "#0066CC", "#0066FF", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99", "#00CCCC", "#00CCFF", "#3300CC", "#3300FF", "#3333CC", "#3333FF", "#3366CC", "#3366FF", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66", "#33CC99", "#33CCCC", "#33CCFF", "#6600CC", "#6600FF", "#6633CC", "#6633FF", "#66CC00", "#66CC33", "#9900CC", "#9900FF", "#9933CC", "#9933FF", "#99CC00", "#99CC33", "#CC0000", "#CC0033", "#CC0066", "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399", "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC9900", "#CC9933", "#CCCC00", "#CCCC33", "#FF0000", "#FF0033", "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366", "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF9900", "#FF9933", "#FFCC00", "#FFCC33"], t2.log = console.debug || console.log || (() => {
  }), e2.exports = (l$1 ? u$1 : (l$1 = 1, u$1 = function(e3) {
    function t3(e4) {
      let n3, r2, o2, i2 = null;
      function a2(...e5) {
        if (!a2.enabled) return;
        const s4 = a2, r3 = Number(/* @__PURE__ */ new Date()), o3 = r3 - (n3 || r3);
        s4.diff = o3, s4.prev = n3, s4.curr = r3, n3 = r3, e5[0] = t3.coerce(e5[0]), "string" != typeof e5[0] && e5.unshift("%O");
        let i3 = 0;
        e5[0] = e5[0].replace(/%([a-zA-Z%])/g, (n4, r4) => {
          if ("%%" === n4) return "%";
          i3++;
          const o4 = t3.formatters[r4];
          if ("function" == typeof o4) {
            const t4 = e5[i3];
            n4 = o4.call(s4, t4), e5.splice(i3, 1), i3--;
          }
          return n4;
        }), t3.formatArgs.call(s4, e5), (s4.log || t3.log).apply(s4, e5);
      }
      return a2.namespace = e4, a2.useColors = t3.useColors(), a2.color = t3.selectColor(e4), a2.extend = s3, a2.destroy = t3.destroy, Object.defineProperty(a2, "enabled", { enumerable: true, configurable: false, get: () => null !== i2 ? i2 : (r2 !== t3.namespaces && (r2 = t3.namespaces, o2 = t3.enabled(e4)), o2), set: (e5) => {
        i2 = e5;
      } }), "function" == typeof t3.init && t3.init(a2), a2;
    }
    function s3(e4, s4) {
      const n3 = t3(this.namespace + (typeof s4 > "u" ? ":" : s4) + e4);
      return n3.log = this.log, n3;
    }
    function n2(e4, t4) {
      let s4 = 0, n3 = 0, r2 = -1, o2 = 0;
      for (; s4 < e4.length; ) if (n3 < t4.length && (t4[n3] === e4[s4] || "*" === t4[n3])) "*" === t4[n3] ? (r2 = n3, o2 = s4, n3++) : (s4++, n3++);
      else {
        if (-1 === r2) return false;
        n3 = r2 + 1, o2++, s4 = o2;
      }
      for (; n3 < t4.length && "*" === t4[n3]; ) n3++;
      return n3 === t4.length;
    }
    return t3.debug = t3, t3.default = t3, t3.coerce = function(e4) {
      return e4 instanceof Error ? e4.stack || e4.message : e4;
    }, t3.disable = function() {
      const e4 = [...t3.names, ...t3.skips.map((e5) => "-" + e5)].join(",");
      return t3.enable(""), e4;
    }, t3.enable = function(e4) {
      t3.save(e4), t3.namespaces = e4, t3.names = [], t3.skips = [];
      const s4 = ("string" == typeof e4 ? e4 : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const e5 of s4) "-" === e5[0] ? t3.skips.push(e5.slice(1)) : t3.names.push(e5);
    }, t3.enabled = function(e4) {
      for (const s4 of t3.skips) if (n2(e4, s4)) return false;
      for (const s4 of t3.names) if (n2(e4, s4)) return true;
      return false;
    }, t3.humanize = (function() {
      if (c) return a;
      c = 1;
      var e4 = 1e3, t4 = 60 * e4, s4 = 60 * t4, n3 = 24 * s4, r2 = 7 * n3;
      function o2(e5, t5, s5, n4) {
        var r3 = t5 >= 1.5 * s5;
        return Math.round(e5 / s5) + " " + n4 + (r3 ? "s" : "");
      }
      return a = function(i2, a2) {
        a2 = a2 || {};
        var c2, u2, l2 = typeof i2;
        if ("string" === l2 && i2.length > 0) return (function(o3) {
          if (!((o3 = String(o3)).length > 100)) {
            var i3 = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(o3);
            if (i3) {
              var a3 = parseFloat(i3[1]);
              switch ((i3[2] || "ms").toLowerCase()) {
                case "years":
                case "year":
                case "yrs":
                case "yr":
                case "y":
                  return 315576e5 * a3;
                case "weeks":
                case "week":
                case "w":
                  return a3 * r2;
                case "days":
                case "day":
                case "d":
                  return a3 * n3;
                case "hours":
                case "hour":
                case "hrs":
                case "hr":
                case "h":
                  return a3 * s4;
                case "minutes":
                case "minute":
                case "mins":
                case "min":
                case "m":
                  return a3 * t4;
                case "seconds":
                case "second":
                case "secs":
                case "sec":
                case "s":
                  return a3 * e4;
                case "milliseconds":
                case "millisecond":
                case "msecs":
                case "msec":
                case "ms":
                  return a3;
                default:
                  return;
              }
            }
          }
        })(i2);
        if ("number" === l2 && isFinite(i2)) return a2.long ? (c2 = i2, (u2 = Math.abs(c2)) >= n3 ? o2(c2, u2, n3, "day") : u2 >= s4 ? o2(c2, u2, s4, "hour") : u2 >= t4 ? o2(c2, u2, t4, "minute") : u2 >= e4 ? o2(c2, u2, e4, "second") : c2 + " ms") : (function(r3) {
          var o3 = Math.abs(r3);
          return o3 >= n3 ? Math.round(r3 / n3) + "d" : o3 >= s4 ? Math.round(r3 / s4) + "h" : o3 >= t4 ? Math.round(r3 / t4) + "m" : o3 >= e4 ? Math.round(r3 / e4) + "s" : r3 + "ms";
        })(i2);
        throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(i2));
      };
    })(), t3.destroy = function() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }, Object.keys(e3).forEach((s4) => {
      t3[s4] = e3[s4];
    }), t3.names = [], t3.skips = [], t3.formatters = {}, t3.selectColor = function(e4) {
      let s4 = 0;
      for (let t4 = 0; t4 < e4.length; t4++) s4 = (s4 << 5) - s4 + e4.charCodeAt(t4), s4 |= 0;
      return t3.colors[Math.abs(s4) % t3.colors.length];
    }, t3.enable(t3.load()), t3;
  }))(t2);
  const { formatters: s2 } = e2.exports;
  s2.j = function(e3) {
    try {
      return JSON.stringify(e3);
    } catch (e4) {
      return "[UnexpectedJSONParseError]: " + e4.message;
    }
  };
})(d$1, d$1.exports)), d$1.exports));
const F = typeof Buffer > "u" ? () => false : (e2) => Buffer.isBuffer(e2);
function O(e2) {
  return "[object Object]" === Object.prototype.toString.call(e2);
}
function j(e2) {
  if (false === O(e2)) return false;
  const t2 = e2.constructor;
  if (void 0 === t2) return true;
  const s2 = t2.prototype;
  return !(false === O(s2) || false === s2.hasOwnProperty("isPrototypeOf"));
}
const v = ["boolean", "string", "number"];
function x$1() {
  return { processOptions: (e2) => {
    const t2 = e2.body;
    return !t2 || "function" == typeof t2.pipe || F(t2) || -1 === v.indexOf(typeof t2) && !Array.isArray(t2) && !j(t2) ? e2 : Object.assign({}, e2, { body: JSON.stringify(e2.body), headers: Object.assign({}, e2.headers, { "Content-Type": "application/json" }) });
  } };
}
function E(e2) {
  return { onResponse: (s2) => {
    const n2 = s2.headers["content-type"] || "", r2 = e2 && e2.force || -1 !== n2.indexOf("application/json");
    return s2.body && n2 && r2 ? Object.assign({}, s2, { body: t2(s2.body) }) : s2;
  }, processOptions: (e3) => Object.assign({}, e3, { headers: Object.assign({ Accept: "application/json" }, e3.headers) }) };
  function t2(e3) {
    try {
      return JSON.parse(e3);
    } catch (e4) {
      throw e4.message = `Failed to parsed response body as JSON: ${e4.message}`, e4;
    }
  }
}
let R = {};
typeof globalThis < "u" ? R = globalThis : typeof window < "u" ? R = window : typeof global < "u" ? R = global : typeof self < "u" && (R = self);
var q = R;
function A$1(e2 = {}) {
  const t2 = e2.implementation || q.Observable;
  if (!t2) throw new Error("`Observable` is not available in global scope, and no implementation was passed");
  return { onReturn: (e3, s2) => new t2((t3) => (e3.error.subscribe((e4) => t3.error(e4)), e3.progress.subscribe((e4) => t3.next(Object.assign({ type: "progress" }, e4))), e3.response.subscribe((e4) => {
    t3.next(Object.assign({ type: "response" }, e4)), t3.complete();
  }), e3.request.publish(s2), () => e3.abort.publish())) };
}
function S$1() {
  return { onRequest: (e2) => {
    if ("xhr" !== e2.adapter) return;
    const t2 = e2.request, s2 = e2.context;
    function n2(e3) {
      return (t3) => {
        const n3 = t3.lengthComputable ? t3.loaded / t3.total * 100 : -1;
        s2.channels.progress.publish({ stage: e3, percent: n3, total: t3.total, loaded: t3.loaded, lengthComputable: t3.lengthComputable });
      };
    }
    "upload" in t2 && "onprogress" in t2.upload && (t2.upload.onprogress = n2("upload")), "onprogress" in t2 && (t2.onprogress = n2("download"));
  } };
}
var $ = (e2, t2, s2) => ("GET" === s2.method || "HEAD" === s2.method) && (e2.isNetworkError || false);
function _(e2) {
  return 100 * Math.pow(2, e2) + 100 * Math.random();
}
const P$1 = (e2 = {}) => ((e3) => {
  const t2 = e3.maxRetries || 5, s2 = e3.retryDelay || _, n2 = e3.shouldRetry;
  return { onError: (e4, r2) => {
    const o2 = r2.options, i2 = o2.maxRetries || t2, a2 = o2.retryDelay || s2, c2 = o2.shouldRetry || n2, u2 = o2.attemptNumber || 0;
    if (null !== (l2 = o2.body) && "object" == typeof l2 && "function" == typeof l2.pipe || !c2(e4, u2, o2) || u2 >= i2) return e4;
    var l2;
    const p2 = Object.assign({}, r2, { options: Object.assign({}, o2, { attemptNumber: u2 + 1 }) });
    return setTimeout(() => r2.channels.request.publish(p2), a2(u2)), null;
  } };
})({ shouldRetry: $, ...e2 });
P$1.shouldRetry = $;

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
  function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
  function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function isFunction(value) {
    return typeof value === 'function';
}

function createErrorClass(createImpl) {
    var _super = function (instance) {
        Error.call(instance);
        instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
}

var UnsubscriptionError = createErrorClass(function (_super) {
    return function UnsubscriptionErrorImpl(errors) {
        _super(this);
        this.message = errors
            ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
            : '';
        this.name = 'UnsubscriptionError';
        this.errors = errors;
    };
});

function arrRemove(arr, item) {
    if (arr) {
        var index = arr.indexOf(item);
        0 <= index && arr.splice(index, 1);
    }
}

var Subscription = (function () {
    function Subscription(initialTeardown) {
        this.initialTeardown = initialTeardown;
        this.closed = false;
        this._parentage = null;
        this._finalizers = null;
    }
    Subscription.prototype.unsubscribe = function () {
        var e_1, _a, e_2, _b;
        var errors;
        if (!this.closed) {
            this.closed = true;
            var _parentage = this._parentage;
            if (_parentage) {
                this._parentage = null;
                if (Array.isArray(_parentage)) {
                    try {
                        for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                            var parent_1 = _parentage_1_1.value;
                            parent_1.remove(this);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    _parentage.remove(this);
                }
            }
            var initialFinalizer = this.initialTeardown;
            if (isFunction(initialFinalizer)) {
                try {
                    initialFinalizer();
                }
                catch (e) {
                    errors = e instanceof UnsubscriptionError ? e.errors : [e];
                }
            }
            var _finalizers = this._finalizers;
            if (_finalizers) {
                this._finalizers = null;
                try {
                    for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
                        var finalizer = _finalizers_1_1.value;
                        try {
                            execFinalizer(finalizer);
                        }
                        catch (err) {
                            errors = errors !== null && errors !== void 0 ? errors : [];
                            if (err instanceof UnsubscriptionError) {
                                errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                            }
                            else {
                                errors.push(err);
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            if (errors) {
                throw new UnsubscriptionError(errors);
            }
        }
    };
    Subscription.prototype.add = function (teardown) {
        var _a;
        if (teardown && teardown !== this) {
            if (this.closed) {
                execFinalizer(teardown);
            }
            else {
                if (teardown instanceof Subscription) {
                    if (teardown.closed || teardown._hasParent(this)) {
                        return;
                    }
                    teardown._addParent(this);
                }
                (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
            }
        }
    };
    Subscription.prototype._hasParent = function (parent) {
        var _parentage = this._parentage;
        return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
    };
    Subscription.prototype._addParent = function (parent) {
        var _parentage = this._parentage;
        this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription.prototype._removeParent = function (parent) {
        var _parentage = this._parentage;
        if (_parentage === parent) {
            this._parentage = null;
        }
        else if (Array.isArray(_parentage)) {
            arrRemove(_parentage, parent);
        }
    };
    Subscription.prototype.remove = function (teardown) {
        var _finalizers = this._finalizers;
        _finalizers && arrRemove(_finalizers, teardown);
        if (teardown instanceof Subscription) {
            teardown._removeParent(this);
        }
    };
    Subscription.EMPTY = (function () {
        var empty = new Subscription();
        empty.closed = true;
        return empty;
    })();
    return Subscription;
}());
var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(value) {
    return (value instanceof Subscription ||
        (value && 'closed' in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe)));
}
function execFinalizer(finalizer) {
    if (isFunction(finalizer)) {
        finalizer();
    }
    else {
        finalizer.unsubscribe();
    }
}

var config = {
    Promise: undefined};

var timeoutProvider = {
    setTimeout: function (handler, timeout) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearTimeout: function (handle) {
        return (clearTimeout)(handle);
    },
    delegate: undefined,
};

function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function () {
        {
            throw err;
        }
    });
}

function noop() { }

function errorContext(cb) {
    {
        cb();
    }
}

var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(destination) {
        var _this = _super.call(this) || this;
        _this.isStopped = false;
        if (destination) {
            _this.destination = destination;
            if (isSubscription(destination)) {
                destination.add(_this);
            }
        }
        else {
            _this.destination = EMPTY_OBSERVER;
        }
        return _this;
    }
    Subscriber.create = function (next, error, complete) {
        return new SafeSubscriber(next, error, complete);
    };
    Subscriber.prototype.next = function (value) {
        if (this.isStopped) ;
        else {
            this._next(value);
        }
    };
    Subscriber.prototype.error = function (err) {
        if (this.isStopped) ;
        else {
            this.isStopped = true;
            this._error(err);
        }
    };
    Subscriber.prototype.complete = function () {
        if (this.isStopped) ;
        else {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function () {
        if (!this.closed) {
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
            this.destination = null;
        }
    };
    Subscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
        try {
            this.destination.error(err);
        }
        finally {
            this.unsubscribe();
        }
    };
    Subscriber.prototype._complete = function () {
        try {
            this.destination.complete();
        }
        finally {
            this.unsubscribe();
        }
    };
    return Subscriber;
}(Subscription));
var ConsumerObserver = (function () {
    function ConsumerObserver(partialObserver) {
        this.partialObserver = partialObserver;
    }
    ConsumerObserver.prototype.next = function (value) {
        var partialObserver = this.partialObserver;
        if (partialObserver.next) {
            try {
                partialObserver.next(value);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    ConsumerObserver.prototype.error = function (err) {
        var partialObserver = this.partialObserver;
        if (partialObserver.error) {
            try {
                partialObserver.error(err);
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
        else {
            handleUnhandledError(err);
        }
    };
    ConsumerObserver.prototype.complete = function () {
        var partialObserver = this.partialObserver;
        if (partialObserver.complete) {
            try {
                partialObserver.complete();
            }
            catch (error) {
                handleUnhandledError(error);
            }
        }
    };
    return ConsumerObserver;
}());
var SafeSubscriber = (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(observerOrNext, error, complete) {
        var _this = _super.call(this) || this;
        var partialObserver;
        if (isFunction(observerOrNext) || !observerOrNext) {
            partialObserver = {
                next: (observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined),
                error: error !== null && error !== void 0 ? error : undefined,
                complete: complete !== null && complete !== void 0 ? complete : undefined,
            };
        }
        else {
            {
                partialObserver = observerOrNext;
            }
        }
        _this.destination = new ConsumerObserver(partialObserver);
        return _this;
    }
    return SafeSubscriber;
}(Subscriber));
function handleUnhandledError(error) {
    {
        reportUnhandledError(error);
    }
}
function defaultErrorHandler(err) {
    throw err;
}
var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop,
};

var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();

function identity(x) {
    return x;
}

function pipe() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    return pipeFromArray(fns);
}
function pipeFromArray(fns) {
    if (fns.length === 0) {
        return identity;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return function piped(input) {
        return fns.reduce(function (prev, fn) { return fn(prev); }, input);
    };
}

var Observable = (function () {
    function Observable(subscribe) {
        if (subscribe) {
            this._subscribe = subscribe;
        }
    }
    Observable.prototype.lift = function (operator) {
        var observable = new Observable();
        observable.source = this;
        observable.operator = operator;
        return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
        var _this = this;
        var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
        errorContext(function () {
            var _a = _this, operator = _a.operator, source = _a.source;
            subscriber.add(operator
                ?
                    operator.call(subscriber, source)
                : source
                    ?
                        _this._subscribe(subscriber)
                    :
                        _this._trySubscribe(subscriber));
        });
        return subscriber;
    };
    Observable.prototype._trySubscribe = function (sink) {
        try {
            return this._subscribe(sink);
        }
        catch (err) {
            sink.error(err);
        }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var subscriber = new SafeSubscriber({
                next: function (value) {
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        subscriber.unsubscribe();
                    }
                },
                error: reject,
                complete: resolve,
            });
            _this.subscribe(subscriber);
        });
    };
    Observable.prototype._subscribe = function (subscriber) {
        var _a;
        return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable.prototype[observable] = function () {
        return this;
    };
    Observable.prototype.pipe = function () {
        var operations = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            operations[_i] = arguments[_i];
        }
        return pipeFromArray(operations)(this);
    };
    Observable.prototype.toPromise = function (promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var value;
            _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
        });
    };
    Observable.create = function (subscribe) {
        return new Observable(subscribe);
    };
    return Observable;
}());
function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
    return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
}
function isSubscriber(value) {
    return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
}

function hasLift(source) {
    return isFunction(source === null || source === void 0 ? void 0 : source.lift);
}
function operate(init) {
    return function (source) {
        if (hasLift(source)) {
            return source.lift(function (liftedSource) {
                try {
                    return init(liftedSource, this);
                }
                catch (err) {
                    this.error(err);
                }
            });
        }
        throw new TypeError('Unable to lift unknown Observable type');
    };
}

function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
    return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
}
var OperatorSubscriber = (function (_super) {
    __extends(OperatorSubscriber, _super);
    function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
        var _this = _super.call(this, destination) || this;
        _this.onFinalize = onFinalize;
        _this.shouldUnsubscribe = shouldUnsubscribe;
        _this._next = onNext
            ? function (value) {
                try {
                    onNext(value);
                }
                catch (err) {
                    destination.error(err);
                }
            }
            : _super.prototype._next;
        _this._error = onError
            ? function (err) {
                try {
                    onError(err);
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._error;
        _this._complete = onComplete
            ? function () {
                try {
                    onComplete();
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._complete;
        return _this;
    }
    OperatorSubscriber.prototype.unsubscribe = function () {
        var _a;
        if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
            var closed_1 = this.closed;
            _super.prototype.unsubscribe.call(this);
            !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
        }
    };
    return OperatorSubscriber;
}(Subscriber));

var ObjectUnsubscribedError = createErrorClass(function (_super) {
    return function ObjectUnsubscribedErrorImpl() {
        _super(this);
        this.name = 'ObjectUnsubscribedError';
        this.message = 'object unsubscribed';
    };
});

var Subject = (function (_super) {
    __extends(Subject, _super);
    function Subject() {
        var _this = _super.call(this) || this;
        _this.closed = false;
        _this.currentObservers = null;
        _this.observers = [];
        _this.isStopped = false;
        _this.hasError = false;
        _this.thrownError = null;
        return _this;
    }
    Subject.prototype.lift = function (operator) {
        var subject = new AnonymousSubject(this, this);
        subject.operator = operator;
        return subject;
    };
    Subject.prototype._throwIfClosed = function () {
        if (this.closed) {
            throw new ObjectUnsubscribedError();
        }
    };
    Subject.prototype.next = function (value) {
        var _this = this;
        errorContext(function () {
            var e_1, _a;
            _this._throwIfClosed();
            if (!_this.isStopped) {
                if (!_this.currentObservers) {
                    _this.currentObservers = Array.from(_this.observers);
                }
                try {
                    for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var observer = _c.value;
                        observer.next(value);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        });
    };
    Subject.prototype.error = function (err) {
        var _this = this;
        errorContext(function () {
            _this._throwIfClosed();
            if (!_this.isStopped) {
                _this.hasError = _this.isStopped = true;
                _this.thrownError = err;
                var observers = _this.observers;
                while (observers.length) {
                    observers.shift().error(err);
                }
            }
        });
    };
    Subject.prototype.complete = function () {
        var _this = this;
        errorContext(function () {
            _this._throwIfClosed();
            if (!_this.isStopped) {
                _this.isStopped = true;
                var observers = _this.observers;
                while (observers.length) {
                    observers.shift().complete();
                }
            }
        });
    };
    Subject.prototype.unsubscribe = function () {
        this.isStopped = this.closed = true;
        this.observers = this.currentObservers = null;
    };
    Object.defineProperty(Subject.prototype, "observed", {
        get: function () {
            var _a;
            return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
        },
        enumerable: false,
        configurable: true
    });
    Subject.prototype._trySubscribe = function (subscriber) {
        this._throwIfClosed();
        return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._checkFinalizedStatuses(subscriber);
        return this._innerSubscribe(subscriber);
    };
    Subject.prototype._innerSubscribe = function (subscriber) {
        var _this = this;
        var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
        if (hasError || isStopped) {
            return EMPTY_SUBSCRIPTION;
        }
        this.currentObservers = null;
        observers.push(subscriber);
        return new Subscription(function () {
            _this.currentObservers = null;
            arrRemove(observers, subscriber);
        });
    };
    Subject.prototype._checkFinalizedStatuses = function (subscriber) {
        var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
        if (hasError) {
            subscriber.error(thrownError);
        }
        else if (isStopped) {
            subscriber.complete();
        }
    };
    Subject.prototype.asObservable = function () {
        var observable = new Observable();
        observable.source = this;
        return observable;
    };
    Subject.create = function (destination, source) {
        return new AnonymousSubject(destination, source);
    };
    return Subject;
}(Observable));
var AnonymousSubject = (function (_super) {
    __extends(AnonymousSubject, _super);
    function AnonymousSubject(destination, source) {
        var _this = _super.call(this) || this;
        _this.destination = destination;
        _this.source = source;
        return _this;
    }
    AnonymousSubject.prototype.next = function (value) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
    };
    AnonymousSubject.prototype.error = function (err) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    };
    AnonymousSubject.prototype.complete = function () {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    AnonymousSubject.prototype._subscribe = function (subscriber) {
        var _a, _b;
        return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject;
}(Subject));

var dateTimestampProvider = {
    now: function () {
        return (dateTimestampProvider.delegate || Date).now();
    },
    delegate: undefined,
};

var ReplaySubject = (function (_super) {
    __extends(ReplaySubject, _super);
    function ReplaySubject(_bufferSize, _windowTime, _timestampProvider) {
        if (_bufferSize === void 0) { _bufferSize = Infinity; }
        if (_windowTime === void 0) { _windowTime = Infinity; }
        if (_timestampProvider === void 0) { _timestampProvider = dateTimestampProvider; }
        var _this = _super.call(this) || this;
        _this._bufferSize = _bufferSize;
        _this._windowTime = _windowTime;
        _this._timestampProvider = _timestampProvider;
        _this._buffer = [];
        _this._infiniteTimeWindow = true;
        _this._infiniteTimeWindow = _windowTime === Infinity;
        _this._bufferSize = Math.max(1, _bufferSize);
        _this._windowTime = Math.max(1, _windowTime);
        return _this;
    }
    ReplaySubject.prototype.next = function (value) {
        var _a = this, isStopped = _a.isStopped, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow, _timestampProvider = _a._timestampProvider, _windowTime = _a._windowTime;
        if (!isStopped) {
            _buffer.push(value);
            !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
        }
        this._trimBuffer();
        _super.prototype.next.call(this, value);
    };
    ReplaySubject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._trimBuffer();
        var subscription = this._innerSubscribe(subscriber);
        var _a = this, _infiniteTimeWindow = _a._infiniteTimeWindow, _buffer = _a._buffer;
        var copy = _buffer.slice();
        for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
            subscriber.next(copy[i]);
        }
        this._checkFinalizedStatuses(subscriber);
        return subscription;
    };
    ReplaySubject.prototype._trimBuffer = function () {
        var _a = this, _bufferSize = _a._bufferSize, _timestampProvider = _a._timestampProvider, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow;
        var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
        _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
        if (!_infiniteTimeWindow) {
            var now = _timestampProvider.now();
            var last = 0;
            for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
                last = i;
            }
            last && _buffer.splice(0, last + 1);
        }
    };
    return ReplaySubject;
}(Subject));

var Action = (function (_super) {
    __extends(Action, _super);
    function Action(scheduler, work) {
        return _super.call(this) || this;
    }
    Action.prototype.schedule = function (state, delay) {
        return this;
    };
    return Action;
}(Subscription));

var intervalProvider = {
    setInterval: function (handler, timeout) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return setInterval.apply(void 0, __spreadArray([handler, timeout], __read(args)));
    },
    clearInterval: function (handle) {
        return (clearInterval)(handle);
    },
    delegate: undefined,
};

var AsyncAction = (function (_super) {
    __extends(AsyncAction, _super);
    function AsyncAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        _this.pending = false;
        return _this;
    }
    AsyncAction.prototype.schedule = function (state, delay) {
        var _a;
        if (delay === void 0) { delay = 0; }
        if (this.closed) {
            return this;
        }
        this.state = state;
        var id = this.id;
        var scheduler = this.scheduler;
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, delay);
        }
        this.pending = true;
        this.delay = delay;
        this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay);
        return this;
    };
    AsyncAction.prototype.requestAsyncId = function (scheduler, _id, delay) {
        if (delay === void 0) { delay = 0; }
        return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction.prototype.recycleAsyncId = function (_scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay != null && this.delay === delay && this.pending === false) {
            return id;
        }
        if (id != null) {
            intervalProvider.clearInterval(id);
        }
        return undefined;
    };
    AsyncAction.prototype.execute = function (state, delay) {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        this.pending = false;
        var error = this._execute(state, delay);
        if (error) {
            return error;
        }
        else if (this.pending === false && this.id != null) {
            this.id = this.recycleAsyncId(this.scheduler, this.id, null);
        }
    };
    AsyncAction.prototype._execute = function (state, _delay) {
        var errored = false;
        var errorValue;
        try {
            this.work(state);
        }
        catch (e) {
            errored = true;
            errorValue = e ? e : new Error('Scheduled action threw falsy error');
        }
        if (errored) {
            this.unsubscribe();
            return errorValue;
        }
    };
    AsyncAction.prototype.unsubscribe = function () {
        if (!this.closed) {
            var _a = this, id = _a.id, scheduler = _a.scheduler;
            var actions = scheduler.actions;
            this.work = this.state = this.scheduler = null;
            this.pending = false;
            arrRemove(actions, this);
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, null);
            }
            this.delay = null;
            _super.prototype.unsubscribe.call(this);
        }
    };
    return AsyncAction;
}(Action));

var Scheduler = (function () {
    function Scheduler(schedulerActionCtor, now) {
        if (now === void 0) { now = Scheduler.now; }
        this.schedulerActionCtor = schedulerActionCtor;
        this.now = now;
    }
    Scheduler.prototype.schedule = function (work, delay, state) {
        if (delay === void 0) { delay = 0; }
        return new this.schedulerActionCtor(this, work).schedule(state, delay);
    };
    Scheduler.now = dateTimestampProvider.now;
    return Scheduler;
}());

var AsyncScheduler = (function (_super) {
    __extends(AsyncScheduler, _super);
    function AsyncScheduler(SchedulerAction, now) {
        if (now === void 0) { now = Scheduler.now; }
        var _this = _super.call(this, SchedulerAction, now) || this;
        _this.actions = [];
        _this._active = false;
        return _this;
    }
    AsyncScheduler.prototype.flush = function (action) {
        var actions = this.actions;
        if (this._active) {
            actions.push(action);
            return;
        }
        var error;
        this._active = true;
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while ((action = actions.shift()));
        this._active = false;
        if (error) {
            while ((action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    return AsyncScheduler;
}(Scheduler));

var asyncScheduler = new AsyncScheduler(AsyncAction);
var async = asyncScheduler;

var EMPTY = new Observable(function (subscriber) { return subscriber.complete(); });

function isScheduler(value) {
    return value && isFunction(value.schedule);
}

function last(arr) {
    return arr[arr.length - 1];
}
function popResultSelector(args) {
    return isFunction(last(args)) ? args.pop() : undefined;
}
function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : undefined;
}
function popNumber(args, defaultValue) {
    return typeof last(args) === 'number' ? args.pop() : defaultValue;
}

var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });

function isPromise(value) {
    return isFunction(value === null || value === void 0 ? void 0 : value.then);
}

function isInteropObservable(input) {
    return isFunction(input[observable]);
}

function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
}

function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
}

function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
        return '@@iterator';
    }
    return Symbol.iterator;
}
var iterator = getSymbolIterator();

function isIterable(input) {
    return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
}

function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
        var reader, _a, value, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reader = readableStream.getReader();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 9, 10]);
                    _b.label = 2;
                case 2:
                    return [4, __await(reader.read())];
                case 3:
                    _a = _b.sent(), value = _a.value, done = _a.done;
                    if (!done) return [3, 5];
                    return [4, __await(void 0)];
                case 4: return [2, _b.sent()];
                case 5: return [4, __await(value)];
                case 6: return [4, _b.sent()];
                case 7:
                    _b.sent();
                    return [3, 2];
                case 8: return [3, 10];
                case 9:
                    reader.releaseLock();
                    return [7];
                case 10: return [2];
            }
        });
    });
}
function isReadableStreamLike(obj) {
    return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
}

function innerFrom(input) {
    if (input instanceof Observable) {
        return input;
    }
    if (input != null) {
        if (isInteropObservable(input)) {
            return fromInteropObservable(input);
        }
        if (isArrayLike(input)) {
            return fromArrayLike(input);
        }
        if (isPromise(input)) {
            return fromPromise(input);
        }
        if (isAsyncIterable(input)) {
            return fromAsyncIterable(input);
        }
        if (isIterable(input)) {
            return fromIterable(input);
        }
        if (isReadableStreamLike(input)) {
            return fromReadableStreamLike(input);
        }
    }
    throw createInvalidObservableTypeError(input);
}
function fromInteropObservable(obj) {
    return new Observable(function (subscriber) {
        var obs = obj[observable]();
        if (isFunction(obs.subscribe)) {
            return obs.subscribe(subscriber);
        }
        throw new TypeError('Provided object does not correctly implement Symbol.observable');
    });
}
function fromArrayLike(array) {
    return new Observable(function (subscriber) {
        for (var i = 0; i < array.length && !subscriber.closed; i++) {
            subscriber.next(array[i]);
        }
        subscriber.complete();
    });
}
function fromPromise(promise) {
    return new Observable(function (subscriber) {
        promise
            .then(function (value) {
            if (!subscriber.closed) {
                subscriber.next(value);
                subscriber.complete();
            }
        }, function (err) { return subscriber.error(err); })
            .then(null, reportUnhandledError);
    });
}
function fromIterable(iterable) {
    return new Observable(function (subscriber) {
        var e_1, _a;
        try {
            for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                var value = iterable_1_1.value;
                subscriber.next(value);
                if (subscriber.closed) {
                    return;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        subscriber.complete();
    });
}
function fromAsyncIterable(asyncIterable) {
    return new Observable(function (subscriber) {
        process$1(asyncIterable, subscriber).catch(function (err) { return subscriber.error(err); });
    });
}
function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
}
function process$1(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function () {
        var value, e_2_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 11]);
                    asyncIterable_1 = __asyncValues(asyncIterable);
                    _b.label = 1;
                case 1: return [4, asyncIterable_1.next()];
                case 2:
                    if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                    value = asyncIterable_1_1.value;
                    subscriber.next(value);
                    if (subscriber.closed) {
                        return [2];
                    }
                    _b.label = 3;
                case 3: return [3, 1];
                case 4: return [3, 11];
                case 5:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3, 11];
                case 6:
                    _b.trys.push([6, , 9, 10]);
                    if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                    return [4, _a.call(asyncIterable_1)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [3, 10];
                case 9:
                    if (e_2) throw e_2.error;
                    return [7];
                case 10: return [7];
                case 11:
                    subscriber.complete();
                    return [2];
            }
        });
    });
}

function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) { delay = 0; }
    if (repeat === void 0) { repeat = false; }
    var scheduleSubscription = scheduler.schedule(function () {
        work();
        if (repeat) {
            parentSubscription.add(this.schedule(null, delay));
        }
        else {
            this.unsubscribe();
        }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
        return scheduleSubscription;
    }
}

function observeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return executeSchedule(subscriber, scheduler, function () { return subscriber.next(value); }, delay); }, function () { return executeSchedule(subscriber, scheduler, function () { return subscriber.complete(); }, delay); }, function (err) { return executeSchedule(subscriber, scheduler, function () { return subscriber.error(err); }, delay); }));
    });
}

function subscribeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return operate(function (source, subscriber) {
        subscriber.add(scheduler.schedule(function () { return source.subscribe(subscriber); }, delay));
    });
}

function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}

function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}

function scheduleArray(input, scheduler) {
    return new Observable(function (subscriber) {
        var i = 0;
        return scheduler.schedule(function () {
            if (i === input.length) {
                subscriber.complete();
            }
            else {
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                    this.schedule();
                }
            }
        });
    });
}

function scheduleIterable(input, scheduler) {
    return new Observable(function (subscriber) {
        var iterator$1;
        executeSchedule(subscriber, scheduler, function () {
            iterator$1 = input[iterator]();
            executeSchedule(subscriber, scheduler, function () {
                var _a;
                var value;
                var done;
                try {
                    (_a = iterator$1.next(), value = _a.value, done = _a.done);
                }
                catch (err) {
                    subscriber.error(err);
                    return;
                }
                if (done) {
                    subscriber.complete();
                }
                else {
                    subscriber.next(value);
                }
            }, 0, true);
        });
        return function () { return isFunction(iterator$1 === null || iterator$1 === void 0 ? void 0 : iterator$1.return) && iterator$1.return(); };
    });
}

function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
        throw new Error('Iterable cannot be null');
    }
    return new Observable(function (subscriber) {
        executeSchedule(subscriber, scheduler, function () {
            var iterator = input[Symbol.asyncIterator]();
            executeSchedule(subscriber, scheduler, function () {
                iterator.next().then(function (result) {
                    if (result.done) {
                        subscriber.complete();
                    }
                    else {
                        subscriber.next(result.value);
                    }
                });
            }, 0, true);
        });
    });
}

function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
}

function scheduled(input, scheduler) {
    if (input != null) {
        if (isInteropObservable(input)) {
            return scheduleObservable(input, scheduler);
        }
        if (isArrayLike(input)) {
            return scheduleArray(input, scheduler);
        }
        if (isPromise(input)) {
            return schedulePromise(input, scheduler);
        }
        if (isAsyncIterable(input)) {
            return scheduleAsyncIterable(input, scheduler);
        }
        if (isIterable(input)) {
            return scheduleIterable(input, scheduler);
        }
        if (isReadableStreamLike(input)) {
            return scheduleReadableStreamLike(input, scheduler);
        }
    }
    throw createInvalidObservableTypeError(input);
}

function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
}

function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    return from(args, scheduler);
}

function throwError(errorOrErrorFactory, scheduler) {
    var errorFactory = isFunction(errorOrErrorFactory) ? errorOrErrorFactory : function () { return errorOrErrorFactory; };
    var init = function (subscriber) { return subscriber.error(errorFactory()); };
    return new Observable(init);
}

function isObservable(obj) {
    return !!obj && (obj instanceof Observable || (isFunction(obj.lift) && isFunction(obj.subscribe)));
}

var EmptyError = createErrorClass(function (_super) {
    return function EmptyErrorImpl() {
        _super(this);
        this.name = 'EmptyError';
        this.message = 'no elements in sequence';
    };
});

function lastValueFrom(source, config) {
    return new Promise(function (resolve, reject) {
        var _hasValue = false;
        var _value;
        source.subscribe({
            next: function (value) {
                _value = value;
                _hasValue = true;
            },
            error: reject,
            complete: function () {
                if (_hasValue) {
                    resolve(_value);
                }
                else {
                    reject(new EmptyError());
                }
            },
        });
    });
}

function firstValueFrom(source, config) {
    return new Promise(function (resolve, reject) {
        var subscriber = new SafeSubscriber({
            next: function (value) {
                resolve(value);
                subscriber.unsubscribe();
            },
            error: reject,
            complete: function () {
                {
                    reject(new EmptyError());
                }
            },
        });
        source.subscribe(subscriber);
    });
}

function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
}

function map(project, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            subscriber.next(project.call(thisArg, value, index++));
        }));
    });
}

var isArray$1 = Array.isArray;
function callOrApply(fn, args) {
    return isArray$1(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
}
function mapOneOrManyArgs(fn) {
    return map(function (args) { return callOrApply(fn, args); });
}

function combineLatestInit(observables, scheduler, valueTransform) {
    if (valueTransform === void 0) { valueTransform = identity; }
    return function (subscriber) {
        maybeSchedule(scheduler, function () {
            var length = observables.length;
            var values = new Array(length);
            var active = length;
            var remainingFirstValues = length;
            var _loop_1 = function (i) {
                maybeSchedule(scheduler, function () {
                    var source = from(observables[i], scheduler);
                    var hasFirstValue = false;
                    source.subscribe(createOperatorSubscriber(subscriber, function (value) {
                        values[i] = value;
                        if (!hasFirstValue) {
                            hasFirstValue = true;
                            remainingFirstValues--;
                        }
                        if (!remainingFirstValues) {
                            subscriber.next(valueTransform(values.slice()));
                        }
                    }, function () {
                        if (!--active) {
                            subscriber.complete();
                        }
                    }));
                }, subscriber);
            };
            for (var i = 0; i < length; i++) {
                _loop_1(i);
            }
        });
    };
}
function maybeSchedule(scheduler, execute, subscription) {
    {
        execute();
    }
}

function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function () {
        if (isComplete && !buffer.length && !active) {
            subscriber.complete();
        }
    };
    var outerNext = function (value) { return (active < concurrent ? doInnerSub(value) : buffer.push(value)); };
    var doInnerSub = function (value) {
        active++;
        var innerComplete = false;
        innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function (innerValue) {
            {
                subscriber.next(innerValue);
            }
        }, function () {
            innerComplete = true;
        }, undefined, function () {
            if (innerComplete) {
                try {
                    active--;
                    var _loop_1 = function () {
                        var bufferedValue = buffer.shift();
                        if (innerSubScheduler) ;
                        else {
                            doInnerSub(bufferedValue);
                        }
                    };
                    while (buffer.length && active < concurrent) {
                        _loop_1();
                    }
                    checkComplete();
                }
                catch (err) {
                    subscriber.error(err);
                }
            }
        }));
    };
    source.subscribe(createOperatorSubscriber(subscriber, outerNext, function () {
        isComplete = true;
        checkComplete();
    }));
    return function () {
    };
}

function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if (isFunction(resultSelector)) {
        return mergeMap(function (a, i) { return map(function (b, ii) { return resultSelector(a, b, i, ii); })(innerFrom(project(a, i))); }, concurrent);
    }
    else if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return operate(function (source, subscriber) { return mergeInternals(source, subscriber, project, concurrent); });
}

function mergeAll(concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    return mergeMap(identity, concurrent);
}

function concatAll() {
    return mergeAll(1);
}

function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return concatAll()(from(args, popScheduler(args)));
}

function defer(observableFactory) {
    return new Observable(function (subscriber) {
        innerFrom(observableFactory()).subscribe(subscriber);
    });
}

function timer(dueTime, intervalOrScheduler, scheduler) {
    if (scheduler === void 0) { scheduler = async; }
    return new Observable(function (subscriber) {
        var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
        if (due < 0) {
            due = 0;
        }
        var n = 0;
        return scheduler.schedule(function () {
            if (!subscriber.closed) {
                subscriber.next(n++);
                {
                    subscriber.complete();
                }
            }
        }, due);
    });
}

function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var concurrent = popNumber(args, Infinity);
    var sources = args;
    return !sources.length
        ?
            EMPTY
        : sources.length === 1
            ?
                innerFrom(sources[0])
            :
                mergeAll(concurrent)(from(sources, scheduler));
}

var isArray = Array.isArray;
function argsOrArgArray(args) {
    return args.length === 1 && isArray(args[0]) ? args[0] : args;
}

function filter(predicate, thisArg) {
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return predicate.call(thisArg, value, index++) && subscriber.next(value); }));
    });
}

function catchError(selector) {
    return operate(function (source, subscriber) {
        var innerSub = null;
        var syncUnsub = false;
        var handledResult;
        innerSub = source.subscribe(createOperatorSubscriber(subscriber, undefined, undefined, function (err) {
            handledResult = innerFrom(selector(err, catchError(selector)(source)));
            if (innerSub) {
                innerSub.unsubscribe();
                innerSub = null;
                handledResult.subscribe(subscriber);
            }
            else {
                syncUnsub = true;
            }
        }));
        if (syncUnsub) {
            innerSub.unsubscribe();
            innerSub = null;
            handledResult.subscribe(subscriber);
        }
    });
}

function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = popResultSelector(args);
    return resultSelector
        ? pipe(combineLatest.apply(void 0, __spreadArray([], __read(args))), mapOneOrManyArgs(resultSelector))
        : operate(function (source, subscriber) {
            combineLatestInit(__spreadArray([source], __read(argsOrArgArray(args))))(subscriber);
        });
}

function combineLatestWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return combineLatest.apply(void 0, __spreadArray([], __read(otherSources)));
}

function finalize(callback) {
    return operate(function (source, subscriber) {
        try {
            source.subscribe(subscriber);
        }
        finally {
            subscriber.add(callback);
        }
    });
}

function share(options) {
    if (options === void 0) { options = {}; }
    var _a = options.connector, connector = _a === void 0 ? function () { return new Subject(); } : _a, _b = options.resetOnError, resetOnError = _b === void 0 ? true : _b, _c = options.resetOnComplete, resetOnComplete = _c === void 0 ? true : _c, _d = options.resetOnRefCountZero, resetOnRefCountZero = _d === void 0 ? true : _d;
    return function (wrapperSource) {
        var connection;
        var resetConnection;
        var subject;
        var refCount = 0;
        var hasCompleted = false;
        var hasErrored = false;
        var cancelReset = function () {
            resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
            resetConnection = undefined;
        };
        var reset = function () {
            cancelReset();
            connection = subject = undefined;
            hasCompleted = hasErrored = false;
        };
        var resetAndUnsubscribe = function () {
            var conn = connection;
            reset();
            conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
        };
        return operate(function (source, subscriber) {
            refCount++;
            if (!hasErrored && !hasCompleted) {
                cancelReset();
            }
            var dest = (subject = subject !== null && subject !== void 0 ? subject : connector());
            subscriber.add(function () {
                refCount--;
                if (refCount === 0 && !hasErrored && !hasCompleted) {
                    resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
                }
            });
            dest.subscribe(subscriber);
            if (!connection &&
                refCount > 0) {
                connection = new SafeSubscriber({
                    next: function (value) { return dest.next(value); },
                    error: function (err) {
                        hasErrored = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnError, err);
                        dest.error(err);
                    },
                    complete: function () {
                        hasCompleted = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnComplete);
                        dest.complete();
                    },
                });
                innerFrom(source).subscribe(connection);
            }
        })(wrapperSource);
    };
}
function handleReset(reset, on) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (on === true) {
        reset();
        return;
    }
    if (on === false) {
        return;
    }
    var onSubscriber = new SafeSubscriber({
        next: function () {
            onSubscriber.unsubscribe();
            reset();
        },
    });
    return innerFrom(on.apply(void 0, __spreadArray([], __read(args)))).subscribe(onSubscriber);
}

function shareReplay(configOrBufferSize, windowTime, scheduler) {
    var bufferSize;
    var refCount = false;
    {
        bufferSize = (configOrBufferSize );
    }
    return share({
        connector: function () { return new ReplaySubject(bufferSize, windowTime, scheduler); },
        resetOnError: true,
        resetOnComplete: false,
        resetOnRefCountZero: refCount,
    });
}

function tap(observerOrNext, error, complete) {
    var tapObserver = isFunction(observerOrNext) || error || complete
        ?
            { next: observerOrNext, error: error, complete: complete }
        : observerOrNext;
    return tapObserver
        ? operate(function (source, subscriber) {
            var _a;
            (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
            var isUnsub = true;
            source.subscribe(createOperatorSubscriber(subscriber, function (value) {
                var _a;
                (_a = tapObserver.next) === null || _a === void 0 ? void 0 : _a.call(tapObserver, value);
                subscriber.next(value);
            }, function () {
                var _a;
                isUnsub = false;
                (_a = tapObserver.complete) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                subscriber.complete();
            }, function (err) {
                var _a;
                isUnsub = false;
                (_a = tapObserver.error) === null || _a === void 0 ? void 0 : _a.call(tapObserver, err);
                subscriber.error(err);
            }, function () {
                var _a, _b;
                if (isUnsub) {
                    (_a = tapObserver.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                }
                (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
            }));
        })
        :
            identity;
}

function isRecord(value) {
  return typeof value == "object" && value !== null && !Array.isArray(value);
}
var p = { 0: 8203, 1: 8204, 2: 8205, 3: 8290, 4: 8291, 5: 8288, 6: 65279, 7: 8289, 8: 119155, 9: 119156, a: 119157, b: 119158, c: 119159, d: 119160, e: 119161, f: 119162 }, l = { 0: 8203, 1: 8204, 2: 8205, 3: 65279 }, d = { 0: String.fromCodePoint(l[0]), 1: String.fromCodePoint(l[1]), 2: String.fromCodePoint(l[2]), 3: String.fromCodePoint(l[3]) }, u = new Array(4).fill(String.fromCodePoint(l[0])).join("");
function A(e) {
  let r = JSON.stringify(e), t = new TextEncoder().encode(r), i = "";
  for (let c = 0; c < t.length; c++) {
    let n = t[c];
    i += d[n >> 6 & 3] + d[n >> 4 & 3] + d[n >> 2 & 3] + d[n & 3];
  }
  return u + i;
}
function I(e) {
  return !Number.isNaN(Number(e)) || /[a-z]/i.test(e) && !/\d+(?:[-:\/]\d+){2}(?:T\d+(?:[-:\/]\d+){1,2}(\.\d+)?Z?)?/.test(e) ? false : !!Date.parse(e);
}
function S(e) {
  try {
    new URL(e, e.startsWith("/") ? "https://acme.com" : void 0);
  } catch {
    return false;
  }
  return true;
}
function y(e, r, t = "auto") {
  return t === true || t === "auto" && (I(e) || S(e)) ? e : `${e}${A(r)}`;
}
Object.fromEntries(Object.entries(d).map((e) => [e[1], +e[0]]));
Object.fromEntries(Object.entries(p).map((e) => e.reverse()));
var h = `${Object.values(p).map((e) => `\\u{${e.toString(16)}}`).join("")}`, x = new RegExp(`[${h}]{4,}`, "gu");
function P(e) {
  var r;
  return { cleaned: e.replace(x, ""), encoded: ((r = e.match(x)) == null ? void 0 : r[0]) || "" };
}
function w(e) {
  return e && JSON.parse(P(JSON.stringify(e)).cleaned);
}
function stegaClean(result) {
  return w(result);
}

let random = bytes => crypto.getRandomValues(new Uint8Array(bytes));
let customRandom = (alphabet, defaultSize, getRandom) => {
  let mask = (2 << (Math.log(alphabet.length - 1) / Math.LN2)) - 1;
  let step = -~((1.6 * mask * defaultSize) / alphabet.length);
  return (size = defaultSize) => {
    let id = '';
    while (true) {
      let bytes = getRandom(step);
      let j = step | 0;
      while (j--) {
        id += alphabet[bytes[j] & mask] || '';
        if (id.length === size) return id
      }
    }
  }
};
let customAlphabet = (alphabet, size = 21) =>
  customRandom(alphabet, size, random);

const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
function codeFrame(query, location2, message) {
  const lines = query.split(NEWLINE), loc = {
    start: columnToLine(location2.start, lines),
    end: location2.end ? columnToLine(location2.end, lines) : void 0
  }, { start, end, markerLines } = getMarkerLines(loc, lines), numberMaxWidth = `${end}`.length;
  return query.split(NEWLINE, end).slice(start, end).map((line, index) => {
    const number = start + 1 + index, gutter = ` ${` ${number}`.slice(-numberMaxWidth)} |`, hasMarker = markerLines[number], lastMarkerLine = !markerLines[number + 1];
    if (!hasMarker)
      return ` ${gutter}${line.length > 0 ? ` ${line}` : ""}`;
    let markerLine = "";
    if (Array.isArray(hasMarker)) {
      const markerSpacing = line.slice(0, Math.max(hasMarker[0] - 1, 0)).replace(/[^\t]/g, " "), numberOfMarkers = hasMarker[1] || 1;
      markerLine = [
        `
 `,
        gutter.replace(/\d/g, " "),
        " ",
        markerSpacing,
        "^".repeat(numberOfMarkers)
      ].join(""), lastMarkerLine && message && (markerLine += " " + message);
    }
    return [">", gutter, line.length > 0 ? ` ${line}` : "", markerLine].join("");
  }).join(`
`);
}
function getMarkerLines(loc, source) {
  const startLoc = { ...loc.start }, endLoc = { ...startLoc, ...loc.end }, linesAbove = 2, linesBelow = 3, startLine = startLoc.line ?? -1, startColumn = startLoc.column ?? 0, endLine = endLoc.line, endColumn = endLoc.column;
  let start = Math.max(startLine - (linesAbove + 1), 0), end = Math.min(source.length, endLine + linesBelow);
  startLine === -1 && (start = 0), endLine === -1 && (end = source.length);
  const lineDiff = endLine - startLine, markerLines = {};
  if (lineDiff)
    for (let i = 0; i <= lineDiff; i++) {
      const lineNumber = i + startLine;
      if (!startColumn)
        markerLines[lineNumber] = true;
      else if (i === 0) {
        const sourceLength = source[lineNumber - 1].length;
        markerLines[lineNumber] = [startColumn, sourceLength - startColumn + 1];
      } else if (i === lineDiff)
        markerLines[lineNumber] = [0, endColumn];
      else {
        const sourceLength = source[lineNumber - i].length;
        markerLines[lineNumber] = [0, sourceLength];
      }
    }
  else
    startColumn === endColumn ? startColumn ? markerLines[startLine] = [startColumn, 0] : markerLines[startLine] = true : markerLines[startLine] = [startColumn, endColumn - startColumn];
  return { start, end, markerLines };
}
function columnToLine(column, lines) {
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;
    if (offset + lineLength > column)
      return {
        line: i + 1,
        // 1-based line
        column: column - offset
        // 0-based column
      };
    offset += lineLength;
  }
  return {
    line: lines.length,
    column: lines[lines.length - 1]?.length ?? 0
  };
}
const MAX_ITEMS_IN_ERROR_MESSAGE = 5;
class ClientError extends Error {
  response;
  statusCode = 400;
  responseBody;
  details;
  constructor(res, context) {
    const props = extractErrorProps(res, context);
    super(props.message), Object.assign(this, props);
  }
}
class ServerError extends Error {
  response;
  statusCode = 500;
  responseBody;
  details;
  constructor(res) {
    const props = extractErrorProps(res);
    super(props.message), Object.assign(this, props);
  }
}
function extractErrorProps(res, context) {
  const body = res.body, props = {
    response: res,
    statusCode: res.statusCode,
    responseBody: stringifyBody(body, res),
    message: "",
    details: void 0
  };
  if (!isRecord(body))
    return props.message = httpErrorMessage(res, body), props;
  const error = body.error;
  if (typeof error == "string" && typeof body.message == "string")
    return props.message = `${error} - ${body.message}`, props;
  if (typeof error != "object" || error === null)
    return typeof error == "string" ? props.message = error : typeof body.message == "string" ? props.message = body.message : props.message = httpErrorMessage(res, body), props;
  if (isMutationError(error) || isActionError(error)) {
    const allItems = error.items || [], items = allItems.slice(0, MAX_ITEMS_IN_ERROR_MESSAGE).map((item) => item.error?.description).filter(Boolean);
    let itemsStr = items.length ? `:
- ${items.join(`
- `)}` : "";
    return allItems.length > MAX_ITEMS_IN_ERROR_MESSAGE && (itemsStr += `
...and ${allItems.length - MAX_ITEMS_IN_ERROR_MESSAGE} more`), props.message = `${error.description}${itemsStr}`, props.details = body.error, props;
  }
  if (isQueryParseError(error)) {
    const tag = context?.options?.query?.tag;
    return props.message = formatQueryParseError(error, tag), props.details = body.error, props;
  }
  return "description" in error && typeof error.description == "string" ? (props.message = error.description, props.details = error, props) : (props.message = httpErrorMessage(res, body), props);
}
function isMutationError(error) {
  return "type" in error && error.type === "mutationError" && "description" in error && typeof error.description == "string";
}
function isActionError(error) {
  return "type" in error && error.type === "actionError" && "description" in error && typeof error.description == "string";
}
function isQueryParseError(error) {
  return isRecord(error) && error.type === "queryParseError" && typeof error.query == "string" && typeof error.start == "number" && typeof error.end == "number";
}
function formatQueryParseError(error, tag) {
  const { query, start, end, description } = error;
  if (!query || typeof start > "u")
    return `GROQ query parse error: ${description}`;
  const withTag = tag ? `

Tag: ${tag}` : "";
  return `GROQ query parse error:
${codeFrame(query, { start, end }, description)}${withTag}`;
}
function httpErrorMessage(res, body) {
  const details = typeof body == "string" ? ` (${sliceWithEllipsis(body, 100)})` : "", statusMessage = res.statusMessage ? ` ${res.statusMessage}` : "";
  return `${res.method}-request to ${res.url} resulted in HTTP ${res.statusCode}${statusMessage}${details}`;
}
function stringifyBody(body, res) {
  return (res.headers["content-type"] || "").toLowerCase().indexOf("application/json") !== -1 ? JSON.stringify(body, null, 2) : body;
}
function sliceWithEllipsis(str, max) {
  return str.length > max ? `${str.slice(0, max)}\u2026` : str;
}
class CorsOriginError extends Error {
  projectId;
  addOriginUrl;
  constructor({ projectId: projectId2 }) {
    super("CorsOriginError"), this.name = "CorsOriginError", this.projectId = projectId2;
    const url = new URL(`https://sanity.io/manage/project/${projectId2}/api`);
    if (typeof location < "u") {
      const { origin } = location;
      url.searchParams.set("cors", "add"), url.searchParams.set("origin", origin), this.addOriginUrl = url, this.message = `The current origin is not allowed to connect to the Live Content API. Add it here: ${url}`;
    } else
      this.message = `The current origin is not allowed to connect to the Live Content API. Change your configuration here: ${url}`;
  }
}
const httpError = {
  onResponse: (res, context) => {
    if (res.statusCode >= 500)
      throw new ServerError(res);
    if (res.statusCode >= 400)
      throw new ClientError(res, context);
    return res;
  }
};
function printWarnings(config = {}) {
  const seen = {}, shouldIgnoreWarning = (message) => config.ignoreWarnings === void 0 ? false : (Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : [config.ignoreWarnings]).some((pattern) => typeof pattern == "string" ? message.includes(pattern) : pattern instanceof RegExp ? pattern.test(message) : false);
  return {
    onResponse: (res) => {
      const warn = res.headers["x-sanity-warning"], warnings = Array.isArray(warn) ? warn : [warn];
      for (const msg of warnings)
        !msg || seen[msg] || shouldIgnoreWarning(msg) || (seen[msg] = true, console.warn(msg));
      return res;
    }
  };
}
function defineHttpRequest(envMiddleware2, config = {}) {
  return p$2([
    P$1({ shouldRetry }),
    ...envMiddleware2,
    printWarnings(config),
    x$1(),
    E(),
    S$1(),
    httpError,
    A$1({ implementation: Observable })
  ]);
}
function shouldRetry(err, attempt, options) {
  if (options.maxRetries === 0) return false;
  const isSafe = options.method === "GET" || options.method === "HEAD", isQuery2 = (options.uri || options.url).startsWith("/data/query"), isRetriableResponse = err.response && (err.response.statusCode === 429 || err.response.statusCode === 502 || err.response.statusCode === 503);
  return (isSafe || isQuery2) && isRetriableResponse ? true : P$1.shouldRetry(err, attempt, options);
}
const BASE_URL = "https://www.sanity.io/help/";
function generateHelpUrl(slug) {
  return BASE_URL + slug;
}
const VALID_ASSET_TYPES = ["image", "file"], VALID_INSERT_LOCATIONS = ["before", "after", "replace"], dataset = (name) => {
  if (!/^(~[a-z0-9]{1}[-\w]{0,63}|[a-z0-9]{1}[-\w]{0,63})$/.test(name))
    throw new Error(
      "Datasets can only contain lowercase characters, numbers, underscores and dashes, and start with tilde, and be maximum 64 characters"
    );
}, projectId = (id) => {
  if (!/^[-a-z0-9]+$/i.test(id))
    throw new Error("`projectId` can only contain only a-z, 0-9 and dashes");
}, validateAssetType = (type) => {
  if (VALID_ASSET_TYPES.indexOf(type) === -1)
    throw new Error(`Invalid asset type: ${type}. Must be one of ${VALID_ASSET_TYPES.join(", ")}`);
}, validateObject = (op, val) => {
  if (val === null || typeof val != "object" || Array.isArray(val))
    throw new Error(`${op}() takes an object of properties`);
}, validateDocumentId = (op, id) => {
  if (typeof id != "string" || !/^[a-z0-9_][a-z0-9_.-]{0,127}$/i.test(id) || id.includes(".."))
    throw new Error(`${op}(): "${id}" is not a valid document ID`);
}, requireDocumentId = (op, doc) => {
  if (!doc._id)
    throw new Error(`${op}() requires that the document contains an ID ("_id" property)`);
  validateDocumentId(op, doc._id);
}, validateDocumentType = (op, type) => {
  if (typeof type != "string")
    throw new Error(`\`${op}()\`: \`${type}\` is not a valid document type`);
}, requireDocumentType = (op, doc) => {
  if (!doc._type)
    throw new Error(`\`${op}()\` requires that the document contains a type (\`_type\` property)`);
  validateDocumentType(op, doc._type);
}, validateVersionIdMatch = (builtVersionId, document) => {
  if (document._id && document._id !== builtVersionId)
    throw new Error(
      `The provided document ID (\`${document._id}\`) does not match the generated version ID (\`${builtVersionId}\`)`
    );
}, validateInsert = (at, selector, items) => {
  const signature = "insert(at, selector, items)";
  if (VALID_INSERT_LOCATIONS.indexOf(at) === -1) {
    const valid = VALID_INSERT_LOCATIONS.map((loc) => `"${loc}"`).join(", ");
    throw new Error(`${signature} takes an "at"-argument which is one of: ${valid}`);
  }
  if (typeof selector != "string")
    throw new Error(`${signature} takes a "selector"-argument which must be a string`);
  if (!Array.isArray(items))
    throw new Error(`${signature} takes an "items"-argument which must be an array`);
}, hasDataset = (config) => {
  if (config.dataset)
    return config.dataset;
  const resource = config.resource;
  if (resource && resource.type === "dataset") {
    const segments = resource.id.split(".");
    if (segments.length !== 2)
      throw new Error('Dataset resource ID must be in the format "project.dataset"');
    return segments[1];
  }
  throw new Error("`dataset` must be provided to perform queries");
}, requestTag = (tag) => {
  if (typeof tag != "string" || !/^[a-z0-9._-]{1,75}$/i.test(tag))
    throw new Error(
      "Tag can only contain alphanumeric characters, underscores, dashes and dots, and be between one and 75 characters long."
    );
  return tag;
}, resourceConfig = (config) => {
  const resource = config.resource;
  if (!resource)
    throw new Error("`resource` must be provided to perform resource queries");
  const { type, id } = resource;
  switch (type) {
    case "dataset": {
      if (id.split(".").length !== 2)
        throw new Error('Dataset resource ID must be in the format "project.dataset"');
      return;
    }
    case "dashboard":
    case "media-library":
    case "canvas":
      return;
    default:
      throw new Error(`Unsupported resource type: ${type.toString()}`);
  }
}, resourceGuard = (service, config) => {
  if (config.resource)
    throw new Error(`\`${service}\` does not support resource-based operations`);
};
function once(fn) {
  let didCall = false, returnValue;
  return (...args) => (didCall || (returnValue = fn(...args), didCall = true), returnValue);
}
const createWarningPrinter = (message) => (
  // eslint-disable-next-line no-console
  once((...args) => console.warn(message.join(" "), ...args))
), printCdnAndWithCredentialsWarning = createWarningPrinter([
  "Because you set `withCredentials` to true, we will override your `useCdn`",
  "setting to be false since (cookie-based) credentials are never set on the CDN"
]), printCdnWarning = createWarningPrinter([
  "Since you haven't set a value for `useCdn`, we will deliver content using our",
  "global, edge-cached API-CDN. If you wish to have content delivered faster, set",
  "`useCdn: false` to use the Live API. Note: You may incur higher costs using the live API."
]), printCdnPreviewDraftsWarning = createWarningPrinter([
  "The Sanity client is configured with the `perspective` set to `drafts` or `previewDrafts`, which doesn't support the API-CDN.",
  "The Live API will be used instead. Set `useCdn: false` in your configuration to hide this warning."
]), printPreviewDraftsDeprecationWarning = createWarningPrinter([
  "The `previewDrafts` perspective has been renamed to  `drafts` and will be removed in a future API version"
]), printBrowserTokenWarning = createWarningPrinter([
  "You have configured Sanity client to use a token in the browser. This may cause unintentional security issues.",
  `See ${generateHelpUrl(
    "js-client-browser-token"
  )} for more information and how to hide this warning.`
]), printCredentialedTokenWarning = createWarningPrinter([
  "You have configured Sanity client to use a token, but also provided `withCredentials: true`.",
  "This is no longer supported - only token will be used - remove `withCredentials: true`."
]), printNoApiVersionSpecifiedWarning = createWarningPrinter([
  "Using the Sanity client without specifying an API version is deprecated.",
  `See ${generateHelpUrl("js-client-api-version")}`
]), printCreateVersionWithBaseIdWarning = createWarningPrinter([
  "You have called `createVersion()` with a defined `document`. The recommended approach is to provide a `baseId` and `releaseId` instead."
]), printDeprecatedResourceConfigWarning = createWarningPrinter([
  "The `~experimental_resource` configuration property has been renamed to `resource`.",
  "Please update your client configuration to use `resource` instead. Support for `~experimental_resource` will be removed in a future version."
]), defaultCdnHost = "apicdn.sanity.io", defaultConfig = {
  apiHost: "https://api.sanity.io",
  apiVersion: "1",
  useProjectHostname: true,
  stega: { enabled: false }
}, LOCALHOSTS = ["localhost", "127.0.0.1", "0.0.0.0"], isLocal = (host) => LOCALHOSTS.indexOf(host) !== -1;
function validateApiVersion(apiVersion) {
  if (apiVersion === "1" || apiVersion === "X")
    return;
  const apiDate = new Date(apiVersion);
  if (!(/^\d{4}-\d{2}-\d{2}$/.test(apiVersion) && apiDate instanceof Date && apiDate.getTime() > 0))
    throw new Error("Invalid API version string, expected `1` or date in format `YYYY-MM-DD`");
}
function validateApiPerspective(perspective) {
  if (Array.isArray(perspective) && perspective.length > 1 && perspective.includes("raw"))
    throw new TypeError(
      'Invalid API perspective value: "raw". The raw-perspective can not be combined with other perspectives'
    );
}
const initConfig = (config, prevConfig) => {
  const specifiedConfig = {
    ...prevConfig,
    ...config,
    stega: {
      ...typeof prevConfig.stega == "boolean" ? { enabled: prevConfig.stega } : prevConfig.stega || defaultConfig.stega,
      ...typeof config.stega == "boolean" ? { enabled: config.stega } : config.stega || {}
    }
  };
  specifiedConfig.apiVersion || printNoApiVersionSpecifiedWarning();
  const newConfig = {
    ...defaultConfig,
    ...specifiedConfig
  };
  newConfig["~experimental_resource"] && !newConfig.resource && (printDeprecatedResourceConfigWarning(), newConfig.resource = newConfig["~experimental_resource"]);
  const resourceConfig$1 = newConfig.resource, projectBased = newConfig.useProjectHostname && !resourceConfig$1;
  if (typeof Promise > "u") {
    const helpUrl = generateHelpUrl("js-client-promise-polyfill");
    throw new Error(`No native Promise-implementation found, polyfill needed - see ${helpUrl}`);
  }
  if (projectBased && !newConfig.projectId)
    throw new Error("Configuration must contain `projectId`");
  if (resourceConfig$1 && resourceConfig(newConfig), typeof newConfig.perspective < "u" && validateApiPerspective(newConfig.perspective), "encodeSourceMap" in newConfig)
    throw new Error(
      "It looks like you're using options meant for '@sanity/preview-kit/client'. 'encodeSourceMap' is not supported in '@sanity/client'. Did you mean 'stega.enabled'?"
    );
  if ("encodeSourceMapAtPath" in newConfig)
    throw new Error(
      "It looks like you're using options meant for '@sanity/preview-kit/client'. 'encodeSourceMapAtPath' is not supported in '@sanity/client'. Did you mean 'stega.filter'?"
    );
  if (typeof newConfig.stega.enabled != "boolean")
    throw new Error(`stega.enabled must be a boolean, received ${newConfig.stega.enabled}`);
  if (newConfig.stega.enabled && newConfig.stega.studioUrl === void 0)
    throw new Error("stega.studioUrl must be defined when stega.enabled is true");
  if (newConfig.stega.enabled && typeof newConfig.stega.studioUrl != "string" && typeof newConfig.stega.studioUrl != "function")
    throw new Error(
      `stega.studioUrl must be a string or a function, received ${newConfig.stega.studioUrl}`
    );
  const isBrowser = typeof window < "u" && window.location && window.location.hostname, isLocalhost = isBrowser && isLocal(window.location.hostname), hasToken = !!newConfig.token;
  newConfig.withCredentials && hasToken && (printCredentialedTokenWarning(), newConfig.withCredentials = false), isBrowser && isLocalhost && hasToken && newConfig.ignoreBrowserTokenWarning !== true ? printBrowserTokenWarning() : typeof newConfig.useCdn > "u" && printCdnWarning(), projectBased && projectId(newConfig.projectId), newConfig.dataset && dataset(newConfig.dataset), "requestTagPrefix" in newConfig && (newConfig.requestTagPrefix = newConfig.requestTagPrefix ? requestTag(newConfig.requestTagPrefix).replace(/\.+$/, "") : void 0), newConfig.apiVersion = `${newConfig.apiVersion}`.replace(/^v/, ""), newConfig.isDefaultApi = newConfig.apiHost === defaultConfig.apiHost, newConfig.useCdn === true && newConfig.withCredentials && printCdnAndWithCredentialsWarning(), newConfig.useCdn = newConfig.useCdn !== false && !newConfig.withCredentials, validateApiVersion(newConfig.apiVersion);
  const hostParts = newConfig.apiHost.split("://", 2), protocol = hostParts[0], host = hostParts[1], cdnHost = newConfig.isDefaultApi ? defaultCdnHost : host;
  return projectBased ? (newConfig.url = `${protocol}://${newConfig.projectId}.${host}/v${newConfig.apiVersion}`, newConfig.cdnUrl = `${protocol}://${newConfig.projectId}.${cdnHost}/v${newConfig.apiVersion}`) : (newConfig.url = `${newConfig.apiHost}/v${newConfig.apiVersion}`, newConfig.cdnUrl = newConfig.url), newConfig;
};
class ConnectionFailedError extends Error {
  name = "ConnectionFailedError";
}
class DisconnectError extends Error {
  name = "DisconnectError";
  reason;
  constructor(message, reason, options = {}) {
    super(message, options), this.reason = reason;
  }
}
class ChannelError extends Error {
  name = "ChannelError";
  data;
  constructor(message, data) {
    super(message), this.data = data;
  }
}
class MessageError extends Error {
  name = "MessageError";
  data;
  constructor(message, data, options = {}) {
    super(message, options), this.data = data;
  }
}
class MessageParseError extends Error {
  name = "MessageParseError";
}
const REQUIRED_EVENTS = ["channelError", "disconnect"];
function connectEventSource(initEventSource, events) {
  return defer(() => {
    const es = initEventSource();
    return isObservable(es) ? es : of(es);
  }).pipe(mergeMap((es) => connectWithESInstance(es, events)));
}
function connectWithESInstance(es, events) {
  return new Observable((observer) => {
    const emitOpen = events.includes("open"), emitReconnect = events.includes("reconnect");
    function onError(evt) {
      if ("data" in evt) {
        const [parseError, event] = parseEvent(evt);
        observer.error(
          parseError ? new MessageParseError("Unable to parse EventSource error message", { cause: event }) : new MessageError((event?.data).message, event)
        );
        return;
      }
      es.readyState === es.CLOSED ? observer.error(new ConnectionFailedError("EventSource connection failed")) : emitReconnect && observer.next({ type: "reconnect" });
    }
    function onOpen() {
      observer.next({ type: "open" });
    }
    function onMessage(message) {
      const [parseError, event] = parseEvent(message);
      if (parseError) {
        observer.error(
          new MessageParseError("Unable to parse EventSource message", { cause: parseError })
        );
        return;
      }
      if (message.type === "channelError") {
        const tag = new URL(es.url).searchParams.get("tag");
        observer.error(new ChannelError(extractErrorMessage(event?.data, tag), event.data));
        return;
      }
      if (message.type === "disconnect") {
        observer.error(
          new DisconnectError(
            `Server disconnected client: ${event.data?.reason || "unknown error"}`
          )
        );
        return;
      }
      observer.next({
        type: message.type,
        id: message.lastEventId,
        ...event.data ? { data: event.data } : {}
      });
    }
    es.addEventListener("error", onError), emitOpen && es.addEventListener("open", onOpen);
    const cleanedEvents = [.../* @__PURE__ */ new Set([...REQUIRED_EVENTS, ...events])].filter((type) => type !== "error" && type !== "open" && type !== "reconnect");
    return cleanedEvents.forEach((type) => es.addEventListener(type, onMessage)), () => {
      es.removeEventListener("error", onError), emitOpen && es.removeEventListener("open", onOpen), cleanedEvents.forEach((type) => es.removeEventListener(type, onMessage)), es.close();
    };
  });
}
function parseEvent(message) {
  try {
    const data = typeof message.data == "string" && JSON.parse(message.data);
    return [
      null,
      {
        type: message.type,
        id: message.lastEventId,
        ...isEmptyObject(data) ? {} : { data }
      }
    ];
  } catch (err) {
    return [err, null];
  }
}
function extractErrorMessage(err, tag) {
  const error = err.error;
  return error ? isQueryParseError(error) ? formatQueryParseError(error, tag) : error.description ? error.description : typeof error == "string" ? error : JSON.stringify(error, null, 2) : err.message || "Unknown listener error";
}
function isEmptyObject(data) {
  for (const _ in data)
    return false;
  return true;
}
function getSelection(sel) {
  if (typeof sel == "string")
    return { id: sel };
  if (Array.isArray(sel))
    return { query: "*[_id in $ids]", params: { ids: sel } };
  if (typeof sel == "object" && sel !== null && "query" in sel && typeof sel.query == "string")
    return "params" in sel && typeof sel.params == "object" && sel.params !== null ? { query: sel.query, params: sel.params } : { query: sel.query };
  const selectionOpts = [
    "* Document ID (<docId>)",
    "* Array of document IDs",
    "* Object containing `query`"
  ].join(`
`);
  throw new Error(`Unknown selection - must be one of:

${selectionOpts}`);
}
class BasePatch {
  selection;
  operations;
  constructor(selection, operations = {}) {
    this.selection = selection, this.operations = operations;
  }
  /**
   * Sets the given attributes to the document. Does NOT merge objects.
   * The operation is added to the current patch, ready to be commited by `commit()`
   *
   * @param attrs - Attributes to set. To set a deep attribute, use JSONMatch, eg: \{"nested.prop": "value"\}
   */
  set(attrs) {
    return this._assign("set", attrs);
  }
  /**
   * Sets the given attributes to the document if they are not currently set. Does NOT merge objects.
   * The operation is added to the current patch, ready to be commited by `commit()`
   *
   * @param attrs - Attributes to set. To set a deep attribute, use JSONMatch, eg: \{"nested.prop": "value"\}
   */
  setIfMissing(attrs) {
    return this._assign("setIfMissing", attrs);
  }
  /**
   * Performs a "diff-match-patch" operation on the string attributes provided.
   * The operation is added to the current patch, ready to be commited by `commit()`
   *
   * @param attrs - Attributes to perform operation on. To set a deep attribute, use JSONMatch, eg: \{"nested.prop": "dmp"\}
   */
  diffMatchPatch(attrs) {
    return validateObject("diffMatchPatch", attrs), this._assign("diffMatchPatch", attrs);
  }
  /**
   * Unsets the attribute paths provided.
   * The operation is added to the current patch, ready to be commited by `commit()`
   *
   * @param attrs - Attribute paths to unset.
   */
  unset(attrs) {
    if (!Array.isArray(attrs))
      throw new Error("unset(attrs) takes an array of attributes to unset, non-array given");
    return this.operations = Object.assign({}, this.operations, { unset: attrs }), this;
  }
  /**
   * Increment a numeric value. Each entry in the argument is either an attribute or a JSON path. The value may be a positive or negative integer or floating-point value. The operation will fail if target value is not a numeric value, or doesn't exist.
   *
   * @param attrs - Object of attribute paths to increment, values representing the number to increment by.
   */
  inc(attrs) {
    return this._assign("inc", attrs);
  }
  /**
   * Decrement a numeric value. Each entry in the argument is either an attribute or a JSON path. The value may be a positive or negative integer or floating-point value. The operation will fail if target value is not a numeric value, or doesn't exist.
   *
   * @param attrs - Object of attribute paths to decrement, values representing the number to decrement by.
   */
  dec(attrs) {
    return this._assign("dec", attrs);
  }
  /**
   * Provides methods for modifying arrays, by inserting, appending and replacing elements via a JSONPath expression.
   *
   * @param at - Location to insert at, relative to the given selector, or 'replace' the matched path
   * @param selector - JSONPath expression, eg `comments[-1]` or `blocks[_key=="abc123"]`
   * @param items - Array of items to insert/replace
   */
  insert(at, selector, items) {
    return validateInsert(at, selector, items), this._assign("insert", { [at]: selector, items });
  }
  /**
   * Append the given items to the array at the given JSONPath
   *
   * @param selector - Attribute/path to append to, eg `comments` or `person.hobbies`
   * @param items - Array of items to append to the array
   */
  append(selector, items) {
    return this.insert("after", `${selector}[-1]`, items);
  }
  /**
   * Prepend the given items to the array at the given JSONPath
   *
   * @param selector - Attribute/path to prepend to, eg `comments` or `person.hobbies`
   * @param items - Array of items to prepend to the array
   */
  prepend(selector, items) {
    return this.insert("before", `${selector}[0]`, items);
  }
  /**
   * Change the contents of an array by removing existing elements and/or adding new elements.
   *
   * @param selector - Attribute or JSONPath expression for array
   * @param start - Index at which to start changing the array (with origin 0). If greater than the length of the array, actual starting index will be set to the length of the array. If negative, will begin that many elements from the end of the array (with origin -1) and will be set to 0 if absolute value is greater than the length of the array.x
   * @param deleteCount - An integer indicating the number of old array elements to remove.
   * @param items - The elements to add to the array, beginning at the start index. If you don't specify any elements, splice() will only remove elements from the array.
   */
  splice(selector, start, deleteCount, items) {
    const delAll = typeof deleteCount > "u" || deleteCount === -1, startIndex = start < 0 ? start - 1 : start, delCount = delAll ? -1 : Math.max(0, start + deleteCount), delRange = startIndex < 0 && delCount >= 0 ? "" : delCount, rangeSelector = `${selector}[${startIndex}:${delRange}]`;
    return this.insert("replace", rangeSelector, items || []);
  }
  /**
   * Adds a revision clause, preventing the document from being patched if the `_rev` property does not match the given value
   *
   * @param rev - Revision to lock the patch to
   */
  ifRevisionId(rev) {
    return this.operations.ifRevisionID = rev, this;
  }
  /**
   * Return a plain JSON representation of the patch
   */
  serialize() {
    return { ...getSelection(this.selection), ...this.operations };
  }
  /**
   * Return a plain JSON representation of the patch
   */
  toJSON() {
    return this.serialize();
  }
  /**
   * Clears the patch of all operations
   */
  reset() {
    return this.operations = {}, this;
  }
  _assign(op, props, merge2 = true) {
    return validateObject(op, props), this.operations = Object.assign({}, this.operations, {
      [op]: Object.assign({}, merge2 && this.operations[op] || {}, props)
    }), this;
  }
  _set(op, props) {
    return this._assign(op, props, false);
  }
}
class ObservablePatch extends BasePatch {
  #client;
  constructor(selection, operations, client) {
    super(selection, operations), this.#client = client;
  }
  /**
   * Clones the patch
   */
  clone() {
    return new ObservablePatch(this.selection, { ...this.operations }, this.#client);
  }
  commit(options) {
    if (!this.#client)
      throw new Error(
        "No `client` passed to patch, either provide one or pass the patch to a clients `mutate()` method"
      );
    const returnFirst = typeof this.selection == "string", opts = Object.assign({ returnFirst, returnDocuments: true }, options);
    return this.#client.mutate({ patch: this.serialize() }, opts);
  }
}
class Patch extends BasePatch {
  #client;
  constructor(selection, operations, client) {
    super(selection, operations), this.#client = client;
  }
  /**
   * Clones the patch
   */
  clone() {
    return new Patch(this.selection, { ...this.operations }, this.#client);
  }
  commit(options) {
    if (!this.#client)
      throw new Error(
        "No `client` passed to patch, either provide one or pass the patch to a clients `mutate()` method"
      );
    const returnFirst = typeof this.selection == "string", opts = Object.assign({ returnFirst, returnDocuments: true }, options);
    return this.#client.mutate({ patch: this.serialize() }, opts);
  }
}
const defaultMutateOptions = { returnDocuments: false };
class BaseTransaction {
  operations;
  trxId;
  constructor(operations = [], transactionId) {
    this.operations = operations, this.trxId = transactionId;
  }
  /**
   * Creates a new Sanity document. If `_id` is provided and already exists, the mutation will fail. If no `_id` is given, one will automatically be generated by the database.
   * The operation is added to the current transaction, ready to be commited by `commit()`
   *
   * @param doc - Document to create. Requires a `_type` property.
   */
  create(doc) {
    return validateObject("create", doc), this._add({ create: doc });
  }
  /**
   * Creates a new Sanity document. If a document with the same `_id` already exists, the create operation will be ignored.
   * The operation is added to the current transaction, ready to be commited by `commit()`
   *
   * @param doc - Document to create if it does not already exist. Requires `_id` and `_type` properties.
   */
  createIfNotExists(doc) {
    const op = "createIfNotExists";
    return validateObject(op, doc), requireDocumentId(op, doc), this._add({ [op]: doc });
  }
  /**
   * Creates a new Sanity document, or replaces an existing one if the same `_id` is already used.
   * The operation is added to the current transaction, ready to be commited by `commit()`
   *
   * @param doc - Document to create or replace. Requires `_id` and `_type` properties.
   */
  createOrReplace(doc) {
    const op = "createOrReplace";
    return validateObject(op, doc), requireDocumentId(op, doc), this._add({ [op]: doc });
  }
  /**
   * Deletes the document with the given document ID
   * The operation is added to the current transaction, ready to be commited by `commit()`
   *
   * @param documentId - Document ID to delete
   */
  delete(documentId) {
    return validateDocumentId("delete", documentId), this._add({ delete: { id: documentId } });
  }
  transactionId(id) {
    return id ? (this.trxId = id, this) : this.trxId;
  }
  /**
   * Return a plain JSON representation of the transaction
   */
  serialize() {
    return [...this.operations];
  }
  /**
   * Return a plain JSON representation of the transaction
   */
  toJSON() {
    return this.serialize();
  }
  /**
   * Clears the transaction of all operations
   */
  reset() {
    return this.operations = [], this;
  }
  _add(mut) {
    return this.operations.push(mut), this;
  }
}
class Transaction extends BaseTransaction {
  #client;
  constructor(operations, client, transactionId) {
    super(operations, transactionId), this.#client = client;
  }
  /**
   * Clones the transaction
   */
  clone() {
    return new Transaction([...this.operations], this.#client, this.trxId);
  }
  commit(options) {
    if (!this.#client)
      throw new Error(
        "No `client` passed to transaction, either provide one or pass the transaction to a clients `mutate()` method"
      );
    return this.#client.mutate(
      this.serialize(),
      Object.assign({ transactionId: this.trxId }, defaultMutateOptions, options || {})
    );
  }
  patch(patchOrDocumentId, patchOps) {
    const isBuilder = typeof patchOps == "function", isPatch = typeof patchOrDocumentId != "string" && patchOrDocumentId instanceof Patch, isMutationSelection = typeof patchOrDocumentId == "object" && ("query" in patchOrDocumentId || "id" in patchOrDocumentId);
    if (isPatch)
      return this._add({ patch: patchOrDocumentId.serialize() });
    if (isBuilder) {
      const patch = patchOps(new Patch(patchOrDocumentId, {}, this.#client));
      if (!(patch instanceof Patch))
        throw new Error("function passed to `patch()` must return the patch");
      return this._add({ patch: patch.serialize() });
    }
    if (isMutationSelection) {
      const patch = new Patch(patchOrDocumentId, patchOps || {}, this.#client);
      return this._add({ patch: patch.serialize() });
    }
    return this._add({ patch: { id: patchOrDocumentId, ...patchOps } });
  }
}
class ObservableTransaction extends BaseTransaction {
  #client;
  constructor(operations, client, transactionId) {
    super(operations, transactionId), this.#client = client;
  }
  /**
   * Clones the transaction
   */
  clone() {
    return new ObservableTransaction([...this.operations], this.#client, this.trxId);
  }
  commit(options) {
    if (!this.#client)
      throw new Error(
        "No `client` passed to transaction, either provide one or pass the transaction to a clients `mutate()` method"
      );
    return this.#client.mutate(
      this.serialize(),
      Object.assign({ transactionId: this.trxId }, defaultMutateOptions, options || {})
    );
  }
  patch(patchOrDocumentId, patchOps) {
    const isBuilder = typeof patchOps == "function";
    if (typeof patchOrDocumentId != "string" && patchOrDocumentId instanceof ObservablePatch)
      return this._add({ patch: patchOrDocumentId.serialize() });
    if (isBuilder) {
      const patch = patchOps(new ObservablePatch(patchOrDocumentId, {}, this.#client));
      if (!(patch instanceof ObservablePatch))
        throw new Error("function passed to `patch()` must return the patch");
      return this._add({ patch: patch.serialize() });
    }
    return this._add({ patch: { id: patchOrDocumentId, ...patchOps } });
  }
}
const projectHeader = "X-Sanity-Project-ID";
function requestOptions(config, overrides = {}) {
  const headers = {};
  config.headers && Object.assign(headers, config.headers);
  const token = overrides.token || config.token;
  token && (headers.Authorization = `Bearer ${token}`), !overrides.useGlobalApi && !config.useProjectHostname && config.projectId && (headers[projectHeader] = config.projectId);
  const withCredentials = !!(typeof overrides.withCredentials > "u" ? config.withCredentials : overrides.withCredentials), timeout = typeof overrides.timeout > "u" ? config.timeout : overrides.timeout;
  return Object.assign({}, overrides, {
    headers: Object.assign({}, headers, overrides.headers || {}),
    timeout: typeof timeout > "u" ? 5 * 60 * 1e3 : timeout,
    proxy: overrides.proxy || config.proxy,
    json: true,
    withCredentials,
    fetch: typeof overrides.fetch == "object" && typeof config.fetch == "object" ? { ...config.fetch, ...overrides.fetch } : overrides.fetch || config.fetch
  });
}
const encodeQueryString = ({
  query,
  params = {},
  options = {}
}) => {
  const searchParams = new URLSearchParams(), { tag, includeMutations, returnQuery, ...opts } = options;
  tag && searchParams.append("tag", tag), searchParams.append("query", query);
  for (const [key, value] of Object.entries(params))
    value !== void 0 && searchParams.append(`$${key}`, JSON.stringify(value));
  for (const [key, value] of Object.entries(opts))
    value && searchParams.append(key, `${value}`);
  return returnQuery === false && searchParams.append("returnQuery", "false"), includeMutations === false && searchParams.append("includeMutations", "false"), `?${searchParams}`;
}, excludeFalsey = (param, defValue) => param === false ? void 0 : typeof param > "u" ? defValue : param, getMutationQuery = (options = {}) => ({
  dryRun: options.dryRun,
  returnIds: true,
  returnDocuments: excludeFalsey(options.returnDocuments, true),
  visibility: options.visibility || "sync",
  autoGenerateArrayKeys: options.autoGenerateArrayKeys,
  skipCrossDatasetReferenceValidation: options.skipCrossDatasetReferenceValidation
}), isResponse = (event) => event.type === "response", getBody = (event) => event.body, indexBy = (docs, attr) => docs.reduce((indexed, doc) => (indexed[attr(doc)] = doc, indexed), /* @__PURE__ */ Object.create(null)), getQuerySizeLimit = 11264;
function _fetch(client, httpRequest, _stega, query, _params = {}, options = {}) {
  const stega = "stega" in options ? {
    ..._stega || {},
    ...typeof options.stega == "boolean" ? { enabled: options.stega } : options.stega || {}
  } : _stega, params = stega.enabled ? stegaClean(_params) : _params, mapResponse = options.filterResponse === false ? (res) => res : (res) => res.result, { cache, next, ...opts } = {
    // Opt out of setting a `signal` on an internal `fetch` if one isn't provided.
    // This is necessary in React Server Components to avoid opting out of Request Memoization.
    useAbortSignal: typeof options.signal < "u",
    // Set `resultSourceMap' when stega is enabled, as it's required for encoding.
    resultSourceMap: stega.enabled ? "withKeyArraySelector" : options.resultSourceMap,
    ...options,
    // Default to not returning the query, unless `filterResponse` is `false`,
    // or `returnQuery` is explicitly set. `true` is the default in Content Lake, so skip if truthy
    returnQuery: options.filterResponse === false && options.returnQuery !== false
  }, reqOpts = typeof cache < "u" || typeof next < "u" ? { ...opts, fetch: { cache, next } } : opts, $request = _dataRequest(client, httpRequest, "query", { query, params }, reqOpts);
  return stega.enabled ? $request.pipe(
    combineLatestWith(
      from(
        __vitePreload(() => import('./Bz19uxUR.js'),true              ?__vite__mapDeps([1,2,3]):void 0,import.meta.url).then(function(n) {
          return n.stegaEncodeSourceMap$1;
        }).then(
          ({ stegaEncodeSourceMap }) => stegaEncodeSourceMap
        )
      )
    ),
    map(
      ([res, stegaEncodeSourceMap]) => {
        const result = stegaEncodeSourceMap(res.result, res.resultSourceMap, stega);
        return mapResponse({ ...res, result });
      }
    )
  ) : $request.pipe(map(mapResponse));
}
function _getDocument(client, httpRequest, id, opts = {}) {
  const docId = (() => {
    if (!opts.releaseId)
      return id;
    const versionId = getVersionFromId(id);
    if (!versionId) {
      if (isDraftId(id))
        throw new Error(
          `The document ID (\`${id}\`) is a draft, but \`options.releaseId\` is set as \`${opts.releaseId}\``
        );
      return getVersionId(id, opts.releaseId);
    }
    if (versionId !== opts.releaseId)
      throw new Error(
        `The document ID (\`${id}\`) is already a version of \`${versionId}\` release, but this does not match the provided \`options.releaseId\` (\`${opts.releaseId}\`)`
      );
    return id;
  })(), options = {
    uri: _getDataUrl(client, "doc", docId),
    json: true,
    tag: opts.tag,
    signal: opts.signal,
    query: opts.includeAllVersions !== void 0 ? { includeAllVersions: opts.includeAllVersions } : void 0
  };
  return _requestObservable(
    client,
    httpRequest,
    options
  ).pipe(
    filter(isResponse),
    map((event) => {
      const documents = event.body.documents;
      return documents ? opts.includeAllVersions ? documents : documents[0] : opts.includeAllVersions ? [] : void 0;
    })
  );
}
function _getDocuments(client, httpRequest, ids, opts = {}) {
  const options = {
    uri: _getDataUrl(client, "doc", ids.join(",")),
    json: true,
    tag: opts.tag,
    signal: opts.signal
  };
  return _requestObservable(client, httpRequest, options).pipe(
    filter(isResponse),
    map((event) => {
      const indexed = indexBy(event.body.documents || [], (doc) => doc._id);
      return ids.map((id) => indexed[id] || null);
    })
  );
}
function _getReleaseDocuments(client, httpRequest, releaseId, opts = {}) {
  return _dataRequest(
    client,
    httpRequest,
    "query",
    {
      query: "*[sanity::partOfRelease($releaseId)]",
      params: {
        releaseId
      }
    },
    opts
  );
}
function _createIfNotExists(client, httpRequest, doc, options) {
  return requireDocumentId("createIfNotExists", doc), _create(client, httpRequest, doc, "createIfNotExists", options);
}
function _createOrReplace(client, httpRequest, doc, options) {
  return requireDocumentId("createOrReplace", doc), _create(client, httpRequest, doc, "createOrReplace", options);
}
function _createVersion(client, httpRequest, doc, publishedId, options) {
  return requireDocumentId("createVersion", doc), requireDocumentType("createVersion", doc), printCreateVersionWithBaseIdWarning(), _action(client, httpRequest, {
    actionType: "sanity.action.document.version.create",
    publishedId,
    document: doc
  }, options);
}
function _createVersionFromBase(client, httpRequest, publishedId, baseId, releaseId, ifBaseRevisionId, options) {
  if (!baseId)
    throw new Error("`createVersion()` requires `baseId` when no `document` is provided");
  if (!publishedId)
    throw new Error("`createVersion()` requires `publishedId` when `baseId` is provided");
  validateDocumentId("createVersion", baseId), validateDocumentId("createVersion", publishedId);
  const createVersionAction = {
    actionType: "sanity.action.document.version.create",
    publishedId,
    baseId,
    versionId: releaseId ? getVersionId(publishedId, releaseId) : getDraftId(publishedId),
    ifBaseRevisionId
  };
  return _action(client, httpRequest, createVersionAction, options);
}
function _delete(client, httpRequest, selection, options) {
  return _dataRequest(
    client,
    httpRequest,
    "mutate",
    { mutations: [{ delete: getSelection(selection) }] },
    options
  );
}
function _discardVersion(client, httpRequest, versionId, purge = false, options) {
  return _action(client, httpRequest, {
    actionType: "sanity.action.document.version.discard",
    versionId,
    purge
  }, options);
}
function _replaceVersion(client, httpRequest, doc, options) {
  return requireDocumentId("replaceVersion", doc), requireDocumentType("replaceVersion", doc), _action(client, httpRequest, {
    actionType: "sanity.action.document.version.replace",
    document: doc
  }, options);
}
function _unpublishVersion(client, httpRequest, versionId, publishedId, options) {
  return _action(client, httpRequest, {
    actionType: "sanity.action.document.version.unpublish",
    versionId,
    publishedId
  }, options);
}
function _mutate(client, httpRequest, mutations, options) {
  let mut;
  mutations instanceof Patch || mutations instanceof ObservablePatch ? mut = { patch: mutations.serialize() } : mutations instanceof Transaction || mutations instanceof ObservableTransaction ? mut = mutations.serialize() : mut = mutations;
  const muts = Array.isArray(mut) ? mut : [mut], transactionId = options && options.transactionId || void 0;
  return _dataRequest(client, httpRequest, "mutate", { mutations: muts, transactionId }, options);
}
function _action(client, httpRequest, actions, options) {
  const acts = Array.isArray(actions) ? actions : [actions], transactionId = options && options.transactionId || void 0, skipCrossDatasetReferenceValidation = options && options.skipCrossDatasetReferenceValidation || void 0, dryRun = options && options.dryRun || void 0;
  return _dataRequest(
    client,
    httpRequest,
    "actions",
    { actions: acts, transactionId, skipCrossDatasetReferenceValidation, dryRun },
    options
  );
}
function _dataRequest(client, httpRequest, endpoint, body, options = {}) {
  const isMutation = endpoint === "mutate", isAction = endpoint === "actions", isQuery2 = endpoint === "query", strQuery = isMutation || isAction ? "" : encodeQueryString(body), useGet = !isMutation && !isAction && strQuery.length < getQuerySizeLimit, stringQuery = useGet ? strQuery : "", returnFirst = options.returnFirst, { timeout, token, tag, headers, returnQuery, lastLiveEventId, cacheMode } = options, uri = _getDataUrl(client, endpoint, stringQuery), reqOptions = {
    method: useGet ? "GET" : "POST",
    uri,
    json: true,
    body: useGet ? void 0 : body,
    query: isMutation && getMutationQuery(options),
    timeout,
    headers,
    token,
    tag,
    returnQuery,
    perspective: options.perspective,
    resultSourceMap: options.resultSourceMap,
    lastLiveEventId: Array.isArray(lastLiveEventId) ? lastLiveEventId[0] : lastLiveEventId,
    cacheMode,
    canUseCdn: isQuery2,
    signal: options.signal,
    fetch: options.fetch,
    useAbortSignal: options.useAbortSignal,
    useCdn: options.useCdn
  };
  return _requestObservable(client, httpRequest, reqOptions).pipe(
    filter(isResponse),
    map(getBody),
    map((res) => {
      if (!isMutation)
        return res;
      const results = res.results || [];
      if (options.returnDocuments)
        return returnFirst ? results[0] && results[0].document : results.map((mut) => mut.document);
      const key = returnFirst ? "documentId" : "documentIds", ids = returnFirst ? results[0] && results[0].id : results.map((mut) => mut.id);
      return {
        transactionId: res.transactionId,
        results,
        [key]: ids
      };
    })
  );
}
function _create(client, httpRequest, doc, op, options = {}) {
  const mutation = { [op]: doc }, opts = Object.assign({ returnFirst: true, returnDocuments: true }, options);
  return _dataRequest(client, httpRequest, "mutate", { mutations: [mutation] }, opts);
}
const hasDataConfig = (client) => {
  const config = client.config();
  return config.dataset !== void 0 && config.projectId !== void 0 || config.resource !== void 0;
}, isQuery = (client, uri) => hasDataConfig(client) && uri.startsWith(_getDataUrl(client, "query")), isMutate = (client, uri) => hasDataConfig(client) && uri.startsWith(_getDataUrl(client, "mutate")), isDoc = (client, uri) => hasDataConfig(client) && uri.startsWith(_getDataUrl(client, "doc", "")), isListener = (client, uri) => hasDataConfig(client) && uri.startsWith(_getDataUrl(client, "listen")), isHistory = (client, uri) => hasDataConfig(client) && uri.startsWith(_getDataUrl(client, "history", "")), isData = (client, uri) => uri.startsWith("/data/") || isQuery(client, uri) || isMutate(client, uri) || isDoc(client, uri) || isListener(client, uri) || isHistory(client, uri);
function _requestObservable(client, httpRequest, options) {
  const uri = options.url || options.uri, config = client.config(), canUseCdn = typeof options.canUseCdn > "u" ? ["GET", "HEAD"].indexOf(options.method || "GET") >= 0 && isData(client, uri) : options.canUseCdn;
  let useCdn = (options.useCdn ?? config.useCdn) && canUseCdn;
  const tag = options.tag && config.requestTagPrefix ? [config.requestTagPrefix, options.tag].join(".") : options.tag || config.requestTagPrefix;
  if (tag && options.tag !== null && (options.query = { tag: requestTag(tag), ...options.query }), ["GET", "HEAD", "POST"].indexOf(options.method || "GET") >= 0 && isQuery(client, uri)) {
    const resultSourceMap = options.resultSourceMap ?? config.resultSourceMap;
    resultSourceMap !== void 0 && resultSourceMap !== false && (options.query = { resultSourceMap, ...options.query });
    const perspectiveOption = options.perspective || config.perspective;
    typeof perspectiveOption < "u" && (perspectiveOption === "previewDrafts" && printPreviewDraftsDeprecationWarning(), validateApiPerspective(perspectiveOption), options.query = {
      perspective: Array.isArray(perspectiveOption) ? perspectiveOption.join(",") : perspectiveOption,
      ...options.query
    }, (Array.isArray(perspectiveOption) && perspectiveOption.length > 0 || // previewDrafts was renamed to drafts, but keep for backwards compat
    perspectiveOption === "previewDrafts" || perspectiveOption === "drafts") && useCdn && (useCdn = false, printCdnPreviewDraftsWarning())), options.lastLiveEventId && (options.query = { ...options.query, lastLiveEventId: options.lastLiveEventId }), options.returnQuery === false && (options.query = { returnQuery: "false", ...options.query }), useCdn && options.cacheMode == "noStale" && (options.query = { cacheMode: "noStale", ...options.query });
  }
  const reqOptions = requestOptions(
    config,
    Object.assign({}, options, {
      url: _getUrl(client, uri, useCdn)
    })
  ), request = new Observable(
    (subscriber) => httpRequest(reqOptions, config.requester).subscribe(subscriber)
  );
  return options.signal ? request.pipe(_withAbortSignal(options.signal)) : request;
}
function _request(client, httpRequest, options) {
  return _requestObservable(client, httpRequest, options).pipe(
    filter((event) => event.type === "response"),
    map((event) => event.body)
  );
}
function _getDataUrl(client, operation, path) {
  const config = client.config();
  if (config.resource) {
    resourceConfig(config);
    const resourceBase = resourceDataBase(config), uri2 = path !== void 0 ? `${operation}/${path}` : operation;
    return `${resourceBase}/${uri2}`.replace(/\/($|\?)/, "$1");
  }
  const catalog = hasDataset(config), baseUri = `/${operation}/${catalog}`;
  return `/data${path !== void 0 ? `${baseUri}/${path}` : baseUri}`.replace(/\/($|\?)/, "$1");
}
function _getUrl(client, uri, canUseCdn = false) {
  const { url, cdnUrl } = client.config();
  return `${canUseCdn ? cdnUrl : url}/${uri.replace(/^\//, "")}`;
}
function _withAbortSignal(signal) {
  return (input) => new Observable((observer) => {
    const abort = () => observer.error(_createAbortError(signal));
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const subscription = input.subscribe(observer);
    return signal.addEventListener("abort", abort), () => {
      signal.removeEventListener("abort", abort), subscription.unsubscribe();
    };
  });
}
const isDomExceptionSupported = !!globalThis.DOMException;
function _createAbortError(signal) {
  if (isDomExceptionSupported)
    return new DOMException(signal?.reason ?? "The operation was aborted.", "AbortError");
  const error = new Error(signal?.reason ?? "The operation was aborted.");
  return error.name = "AbortError", error;
}
const resourceDataBase = (config) => {
  const resource = config.resource;
  if (!resource)
    throw new Error("`resource` must be provided to perform resource queries");
  const { type, id } = resource;
  switch (type) {
    case "dataset": {
      const segments = id.split(".");
      if (segments.length !== 2)
        throw new Error('Dataset ID must be in the format "project.dataset"');
      return `/projects/${segments[0]}/datasets/${segments[1]}`;
    }
    case "canvas":
      return `/canvases/${id}`;
    case "media-library":
      return `/media-libraries/${id}`;
    case "dashboard":
      return `/dashboards/${id}`;
    default:
      throw new Error(`Unsupported resource type: ${type.toString()}`);
  }
};
function _generate(client, httpRequest, request) {
  const dataset2 = hasDataset(client.config());
  return _request(client, httpRequest, {
    method: "POST",
    uri: `/agent/action/generate/${dataset2}`,
    body: request
  });
}
function _patch(client, httpRequest, request) {
  const dataset2 = hasDataset(client.config());
  return _request(client, httpRequest, {
    method: "POST",
    uri: `/agent/action/patch/${dataset2}`,
    body: request
  });
}
function _prompt(client, httpRequest, request) {
  const dataset2 = hasDataset(client.config());
  return _request(client, httpRequest, {
    method: "POST",
    uri: `/agent/action/prompt/${dataset2}`,
    body: request
  });
}
function _transform(client, httpRequest, request) {
  const dataset2 = hasDataset(client.config());
  return _request(client, httpRequest, {
    method: "POST",
    uri: `/agent/action/transform/${dataset2}`,
    body: request
  });
}
function _translate(client, httpRequest, request) {
  const dataset2 = hasDataset(client.config());
  return _request(client, httpRequest, {
    method: "POST",
    uri: `/agent/action/translate/${dataset2}`,
    body: request
  });
}
class ObservableAgentsActionClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Run an instruction to generate content in a target document.
   * @param request - instruction request
   */
  generate(request) {
    return _generate(this.#client, this.#httpRequest, request);
  }
  /**
   * Transform a target document based on a source.
   * @param request - translation request
   */
  transform(request) {
    return _transform(this.#client, this.#httpRequest, request);
  }
  /**
   * Translate a target document based on a source.
   * @param request - translation request
   */
  translate(request) {
    return _translate(this.#client, this.#httpRequest, request);
  }
}
class AgentActionsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Run an instruction to generate content in a target document.
   * @param request - instruction request
   */
  generate(request) {
    return lastValueFrom(_generate(this.#client, this.#httpRequest, request));
  }
  /**
   * Transform a target document based on a source.
   * @param request - translation request
   */
  transform(request) {
    return lastValueFrom(_transform(this.#client, this.#httpRequest, request));
  }
  /**
   * Translate a target document based on a source.
   * @param request - translation request
   */
  translate(request) {
    return lastValueFrom(_translate(this.#client, this.#httpRequest, request));
  }
  /**
   * Run a raw instruction and return the result either as text or json
   * @param request - prompt request
   */
  prompt(request) {
    return lastValueFrom(_prompt(this.#client, this.#httpRequest, request));
  }
  /**
   * Patch a document using a schema aware API.
   * Does not use an LLM, but uses the schema to ensure paths and values matches the schema.
   * @param request - instruction request
   */
  patch(request) {
    return lastValueFrom(_patch(this.#client, this.#httpRequest, request));
  }
}
class ObservableAssetsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  upload(assetType, body, options) {
    return _upload(this.#client, this.#httpRequest, assetType, body, options);
  }
}
class AssetsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  upload(assetType, body, options) {
    const observable2 = _upload(this.#client, this.#httpRequest, assetType, body, options);
    return lastValueFrom(
      observable2.pipe(
        filter((event) => event.type === "response"),
        map(
          (event) => event.body.document
        )
      )
    );
  }
}
function _upload(client, httpRequest, assetType, body, opts = {}) {
  validateAssetType(assetType);
  let meta = opts.extract || void 0;
  meta && !meta.length && (meta = ["none"]);
  const config = client.config(), options = optionsFromFile(opts, body), { tag, label, title, description, creditLine, filename, source } = options, isMediaLibrary = config.resource?.type === "media-library", query = isMediaLibrary ? {
    // Media Library only supports basic parameters
    title,
    filename
  } : {
    // Content Lake supports full set of parameters
    label,
    title,
    description,
    filename,
    meta,
    creditLine
  };
  return source && !isMediaLibrary && (query.sourceId = source.id, query.sourceName = source.name, query.sourceUrl = source.url), _requestObservable(client, httpRequest, {
    tag,
    method: "POST",
    timeout: options.timeout || 0,
    uri: buildAssetUploadUrl(config, assetType),
    headers: options.contentType ? { "Content-Type": options.contentType } : {},
    query,
    body
  });
}
function buildAssetUploadUrl(config, assetType) {
  const assetTypeEndpoint = assetType === "image" ? "images" : "files", resource = config.resource;
  if (resource) {
    const { type, id } = resource;
    switch (type) {
      case "dataset":
        throw new Error(
          "Assets are not supported for dataset resources, yet. Configure the client with `{projectId: <projectId>, dataset: <datasetId>}` instead."
        );
      case "canvas":
        return `/canvases/${id}/assets/${assetTypeEndpoint}`;
      case "media-library":
        return `/media-libraries/${id}/upload`;
      case "dashboard":
        return `/dashboards/${id}/assets/${assetTypeEndpoint}`;
      default:
        throw new Error(`Unsupported resource type: ${type.toString()}`);
    }
  }
  const dataset2 = hasDataset(config);
  return `assets/${assetTypeEndpoint}/${dataset2}`;
}
function optionsFromFile(opts, file) {
  return typeof File > "u" || !(file instanceof File) ? opts : Object.assign(
    {
      filename: opts.preserveFilename === false ? void 0 : file.name,
      contentType: file.type
    },
    opts
  );
}
var defaults = (obj, defaults2) => Object.keys(defaults2).concat(Object.keys(obj)).reduce((target, prop) => (target[prop] = typeof obj[prop] > "u" ? defaults2[prop] : obj[prop], target), {});
const pick = (obj, props) => props.reduce((selection, prop) => (typeof obj[prop] > "u" || (selection[prop] = obj[prop]), selection), {}), eventSourcePolyfill = defer(() => __vitePreload(() => import('./Cwgn2g5d.js').then(n => n.b),true              ?__vite__mapDeps([4,2,3]):void 0,import.meta.url)).pipe(
  map(({ default: EventSource2 }) => EventSource2),
  shareReplay(1)
);
function reconnectOnConnectionFailure() {
  return function(source) {
    return source.pipe(
      catchError((err, caught) => err instanceof ConnectionFailedError ? concat(of({ type: "reconnect" }), timer(1e3).pipe(mergeMap(() => caught))) : throwError(() => err))
    );
  };
}
const MAX_URL_LENGTH = 14800, possibleOptions = [
  "includePreviousRevision",
  "includeResult",
  "includeMutations",
  "includeAllVersions",
  "visibility",
  "effectFormat",
  "enableResume",
  "tag"
], defaultOptions = {
  includeResult: true
};
function _listen(query, params, opts = {}) {
  const { url, token, withCredentials, requestTagPrefix, headers: configHeaders } = this.config(), tag = opts.tag && requestTagPrefix ? [requestTagPrefix, opts.tag].join(".") : opts.tag, options = { ...defaults(opts, defaultOptions), tag }, listenOpts = pick(options, possibleOptions), qs = encodeQueryString({ query, params, options: { tag, ...listenOpts } }), uri = `${url}${_getDataUrl(this, "listen", qs)}`;
  if (uri.length > MAX_URL_LENGTH)
    return throwError(() => new Error("Query too large for listener"));
  const listenFor = options.events ? options.events : ["mutation"], esOptions = {};
  return withCredentials && (esOptions.withCredentials = true), (token || configHeaders) && (esOptions.headers = {}, token && (esOptions.headers.Authorization = `Bearer ${token}`), configHeaders && Object.assign(esOptions.headers, configHeaders)), connectEventSource(() => (
    // use polyfill if there is no global EventSource or if we need to set headers
    (typeof EventSource > "u" || esOptions.headers ? eventSourcePolyfill : of(EventSource)).pipe(map((EventSource2) => new EventSource2(uri, esOptions)))
  ), listenFor).pipe(
    reconnectOnConnectionFailure(),
    filter((event) => listenFor.includes(event.type)),
    map((event) => ({
      type: event.type,
      ..."data" in event ? event.data : {}
    }))
  );
}
function shareReplayLatest(configOrPredicate, config) {
  return _shareReplayLatest(
    typeof configOrPredicate == "function" ? { predicate: configOrPredicate, ...config } : configOrPredicate
  );
}
function _shareReplayLatest(config) {
  return (source) => {
    let latest, emitted = false;
    const { predicate, ...shareConfig } = config, wrapped = source.pipe(
      tap((value) => {
        config.predicate(value) && (emitted = true, latest = value);
      }),
      finalize(() => {
        emitted = false, latest = void 0;
      }),
      share(shareConfig)
    ), emitLatest = new Observable((subscriber) => {
      emitted && subscriber.next(
        // this cast is safe because of the emitted check which asserts that we got T from the source
        latest
      ), subscriber.complete();
    });
    return merge(wrapped, emitLatest);
  };
}
const requiredApiVersion = "2021-03-25";
class LiveClient {
  #client;
  constructor(client) {
    this.#client = client;
  }
  /**
   * Requires `apiVersion` to be `2021-03-25` or later.
   */
  events({
    includeDrafts = false,
    tag: _tag
  } = {}) {
    const {
      projectId: projectId2,
      apiVersion: _apiVersion,
      token,
      withCredentials,
      requestTagPrefix,
      headers: configHeaders
    } = this.#client.config(), apiVersion = _apiVersion.replace(/^v/, "");
    if (apiVersion !== "X" && apiVersion < requiredApiVersion)
      throw new Error(
        `The live events API requires API version ${requiredApiVersion} or later. The current API version is ${apiVersion}. Please update your API version to use this feature.`
      );
    if (includeDrafts && !token && !withCredentials)
      throw new Error(
        "The live events API requires a token or withCredentials when 'includeDrafts: true'. Please update your client configuration. The token should have the lowest possible access role."
      );
    const path = _getDataUrl(this.#client, "live/events"), url = new URL(this.#client.getUrl(path, false)), tag = _tag && requestTagPrefix ? [requestTagPrefix, _tag].join(".") : _tag;
    tag && url.searchParams.set("tag", tag), includeDrafts && url.searchParams.set("includeDrafts", "true");
    const esOptions = {};
    includeDrafts && withCredentials && (esOptions.withCredentials = true), (includeDrafts && token || configHeaders) && (esOptions.headers = {}, includeDrafts && token && (esOptions.headers.Authorization = `Bearer ${token}`), configHeaders && Object.assign(esOptions.headers, configHeaders));
    const key = `${url.href}::${JSON.stringify(esOptions)}`, existing = eventsCache.get(key);
    if (existing)
      return existing;
    const events = connectEventSource(() => (
      // use polyfill if there is no global EventSource or if we need to set headers
      (typeof EventSource > "u" || esOptions.headers ? eventSourcePolyfill : of(EventSource)).pipe(map((EventSource2) => new EventSource2(url.href, esOptions)))
    ), [
      "message",
      "restart",
      "welcome",
      "reconnect",
      "goaway"
    ]), checkCors = fetchObservable(url, {
      method: "OPTIONS",
      mode: "cors",
      credentials: esOptions.withCredentials ? "include" : "omit",
      headers: esOptions.headers
    }).pipe(
      catchError(() => {
        throw new CorsOriginError({ projectId: projectId2 });
      })
    ), observable2 = events.pipe(
      reconnectOnConnectionFailure(),
      mergeMap((event) => event.type === "reconnect" ? checkCors.pipe(mergeMap(() => of(event))) : of(event)),
      catchError((err) => checkCors.pipe(
        mergeMap(() => {
          throw err;
        })
      )),
      map((event) => {
        if (event.type === "message") {
          const { data, ...rest } = event;
          return { ...rest, tags: data.tags };
        }
        return event;
      })
    ).pipe(
      finalize(() => eventsCache.delete(key)),
      shareReplayLatest({
        predicate: (event) => event.type === "welcome"
      })
    );
    return eventsCache.set(key, observable2), observable2;
  }
}
function fetchObservable(url, init) {
  return new Observable((observer) => {
    const controller = new AbortController(), signal = controller.signal;
    return fetch(url, { ...init, signal: controller.signal }).then(
      (response) => {
        observer.next(response), observer.complete();
      },
      (err) => {
        signal.aborted || observer.error(err);
      }
    ), () => controller.abort();
  });
}
const eventsCache = /* @__PURE__ */ new Map();
class ObservableDatasetsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Create a new dataset with the given name
   *
   * @param name - Name of the dataset to create
   * @param options - Options for the dataset, including optional embeddings configuration
   */
  create(name, options) {
    return _modify(this.#client, this.#httpRequest, "PUT", name, options);
  }
  /**
   * Edit a dataset with the given name
   *
   * @param name - Name of the dataset to edit
   * @param options - New options for the dataset
   */
  edit(name, options) {
    return _modify(this.#client, this.#httpRequest, "PATCH", name, options);
  }
  /**
   * Delete a dataset with the given name
   *
   * @param name - Name of the dataset to delete
   */
  delete(name) {
    return _modify(this.#client, this.#httpRequest, "DELETE", name);
  }
  /**
   * Fetch a list of datasets for the configured project
   */
  list() {
    resourceGuard("dataset", this.#client.config());
    const config = this.#client.config(), projectId2 = config.projectId;
    let uri = "/datasets";
    return config.useProjectHostname === false && (uri = `/projects/${projectId2}/datasets`), _request(this.#client, this.#httpRequest, {
      uri,
      tag: null
    });
  }
  /**
   * Get embeddings settings for a dataset
   *
   * @param name - Name of the dataset
   */
  getEmbeddingsSettings(name) {
    return resourceGuard("dataset", this.#client.config()), dataset(name), _request(this.#client, this.#httpRequest, {
      uri: _embeddingsSettingsUri(this.#client, name),
      tag: null
    });
  }
  /**
   * Edit embeddings settings for a dataset
   *
   * @param name - Name of the dataset
   * @param settings - Embeddings settings to apply
   */
  editEmbeddingsSettings(name, settings) {
    return resourceGuard("dataset", this.#client.config()), dataset(name), _request(this.#client, this.#httpRequest, {
      method: "PUT",
      uri: _embeddingsSettingsUri(this.#client, name),
      body: settings,
      tag: null
    });
  }
}
class DatasetsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Create a new dataset with the given name
   *
   * @param name - Name of the dataset to create
   * @param options - Options for the dataset, including optional embeddings configuration
   */
  create(name, options) {
    return resourceGuard("dataset", this.#client.config()), lastValueFrom(
      _modify(this.#client, this.#httpRequest, "PUT", name, options)
    );
  }
  /**
   * Edit a dataset with the given name
   *
   * @param name - Name of the dataset to edit
   * @param options - New options for the dataset
   */
  edit(name, options) {
    return resourceGuard("dataset", this.#client.config()), lastValueFrom(
      _modify(this.#client, this.#httpRequest, "PATCH", name, options)
    );
  }
  /**
   * Delete a dataset with the given name
   *
   * @param name - Name of the dataset to delete
   */
  delete(name) {
    return resourceGuard("dataset", this.#client.config()), lastValueFrom(_modify(this.#client, this.#httpRequest, "DELETE", name));
  }
  /**
   * Fetch a list of datasets for the configured project
   */
  list() {
    resourceGuard("dataset", this.#client.config());
    const config = this.#client.config(), projectId2 = config.projectId;
    let uri = "/datasets";
    return config.useProjectHostname === false && (uri = `/projects/${projectId2}/datasets`), lastValueFrom(
      _request(this.#client, this.#httpRequest, { uri, tag: null })
    );
  }
  /**
   * Get embeddings settings for a dataset
   *
   * @param name - Name of the dataset
   */
  getEmbeddingsSettings(name) {
    return resourceGuard("dataset", this.#client.config()), dataset(name), lastValueFrom(
      _request(this.#client, this.#httpRequest, {
        uri: _embeddingsSettingsUri(this.#client, name),
        tag: null
      })
    );
  }
  /**
   * Edit embeddings settings for a dataset
   *
   * @param name - Name of the dataset
   * @param settings - Embeddings settings to apply
   */
  editEmbeddingsSettings(name, settings) {
    return resourceGuard("dataset", this.#client.config()), dataset(name), lastValueFrom(
      _request(this.#client, this.#httpRequest, {
        method: "PUT",
        uri: _embeddingsSettingsUri(this.#client, name),
        body: settings,
        tag: null
      })
    );
  }
}
function _embeddingsSettingsUri(client, name) {
  const config = client.config();
  return config.useProjectHostname === false ? `/projects/${config.projectId}/datasets/${name}/settings/embeddings` : `/datasets/${name}/settings/embeddings`;
}
function _modify(client, httpRequest, method, name, options) {
  return resourceGuard("dataset", client.config()), dataset(name), _request(client, httpRequest, {
    method,
    uri: `/datasets/${name}`,
    body: options,
    tag: null
  });
}
class ObservableMediaLibraryVideoClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Get video playback information for a media library asset
   *
   * @param assetIdentifier - Asset instance identifier (GDR, video-prefixed ID, or container ID)
   * @param options - Options for transformations and expiration
   */
  getPlaybackInfo(assetIdentifier, options = {}) {
    const config = this.#client.config(), configMediaLibraryId = (config.resource || config["~experimental_resource"])?.id, { instanceId, libraryId } = parseAssetInstanceId(assetIdentifier), effectiveLibraryId = libraryId || configMediaLibraryId;
    if (!effectiveLibraryId)
      throw new Error(
        "Could not determine Media Library ID - you need to provide a valid Media Library ID in the client config or a Media Library GDR"
      );
    const uri = buildVideoPlaybackInfoUrl(instanceId, effectiveLibraryId), queryParams = buildQueryParams(options);
    return _request(this.#client, this.#httpRequest, {
      method: "GET",
      uri,
      query: queryParams
    });
  }
}
class MediaLibraryVideoClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Get video playback information for a media library asset
   *
   * @param assetIdentifier - Asset instance identifier (GDR, video-prefixed ID, or container ID)
   * @param options - Options for transformations and expiration
   */
  getPlaybackInfo(assetIdentifier, options = {}) {
    return lastValueFrom(
      new ObservableMediaLibraryVideoClient(
        this.#client.observable,
        this.#httpRequest
      ).getPlaybackInfo(assetIdentifier, options)
    );
  }
}
const ML_GDR_PATTERN = /^media-library:(ml[^:]+):([^:]+)$/;
function isSanityReference(assetIdentifier) {
  return typeof assetIdentifier == "object" && "_ref" in assetIdentifier;
}
function parseAssetInstanceId(assetIdentifier) {
  const ref = isSanityReference(assetIdentifier) ? assetIdentifier._ref : assetIdentifier, match = ML_GDR_PATTERN.exec(ref);
  if (match) {
    const [, libraryId, instanceId] = match;
    return { libraryId, instanceId };
  }
  if (typeof assetIdentifier == "string" && assetIdentifier.startsWith("video-"))
    return { instanceId: assetIdentifier };
  throw new Error(
    `Invalid video asset instance identifier "${ref}": must be a valid video instance id or a Global Dataset Reference (GDR) to the video asset in the Media Library`
  );
}
function buildVideoPlaybackInfoUrl(instanceId, libraryId) {
  return `/media-libraries/${libraryId}/video/${instanceId}/playback-info`;
}
function buildQueryParams(options) {
  const params = {};
  if (options.transformations) {
    const { thumbnail, animated, storyboard } = options.transformations;
    thumbnail && (thumbnail.width && (params.thumbnailWidth = thumbnail.width), thumbnail.height && (params.thumbnailHeight = thumbnail.height), thumbnail.time !== void 0 && (params.thumbnailTime = thumbnail.time), thumbnail.fit && (params.thumbnailFit = thumbnail.fit), thumbnail.format && (params.thumbnailFormat = thumbnail.format)), animated && (animated.width && (params.animatedWidth = animated.width), animated.height && (params.animatedHeight = animated.height), animated.start !== void 0 && (params.animatedStart = animated.start), animated.end !== void 0 && (params.animatedEnd = animated.end), animated.fps && (params.animatedFps = animated.fps), animated.format && (params.animatedFormat = animated.format)), storyboard && storyboard.format && (params.storyboardFormat = storyboard.format);
  }
  return options.expiration && (params.expiration = options.expiration), params;
}
class ObservableProjectsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Fetch a list of projects the authenticated user has access to.
   *
   * @param options - Options for the list request
   *   - `includeMembers` - Whether to include members in the response (default: true)
   *   - `includeFeatures` - Whether to include features in the response (default: true)
   *   - `organizationId` - ID of the organization to fetch projects for
   *   - `onlyExplicitMembership` - Whether to include only projects with explicit membership (default: false)
   */
  list(options) {
    const query = {}, uri = "/projects";
    return options?.includeMembers === false && (query.includeMembers = "false"), options?.includeFeatures === false && (query.includeFeatures = "false"), options?.organizationId && (query.organizationId = options.organizationId), options?.onlyExplicitMembership && (query.onlyExplicitMembership = "true"), _request(this.#client, this.#httpRequest, { uri, query });
  }
  /**
   * Fetch a project by project ID
   *
   * @param projectId - ID of the project to fetch
   */
  getById(projectId2) {
    return _request(this.#client, this.#httpRequest, { uri: `/projects/${projectId2}` });
  }
}
class ProjectsClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Fetch a list of projects the authenticated user has access to.
   *
   * @param options - Options for the list request
   *   - `includeMembers` - Whether to include members in the response (default: true)
   *   - `includeFeatures` - Whether to include features in the response (default: true)
   *   - `organizationId` - ID of the organization to fetch projects for
   *   - `onlyExplicitMembership` - Whether to include only projects with explicit membership (default: false)
   */
  list(options) {
    const query = {}, uri = "/projects";
    return options?.includeMembers === false && (query.includeMembers = "false"), options?.includeFeatures === false && (query.includeFeatures = "false"), options?.organizationId && (query.organizationId = options.organizationId), options?.onlyExplicitMembership && (query.onlyExplicitMembership = "true"), lastValueFrom(
      _request(this.#client, this.#httpRequest, { uri, query })
    );
  }
  /**
   * Fetch a project by project ID
   *
   * @param projectId - ID of the project to fetch
   */
  getById(projectId2) {
    return lastValueFrom(
      _request(this.#client, this.#httpRequest, { uri: `/projects/${projectId2}` })
    );
  }
}
const generateReleaseId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  8
), getDocumentVersionId = (publishedId, releaseId) => releaseId ? getVersionId(publishedId, releaseId) : getDraftId(publishedId);
function deriveDocumentVersionId(op, {
  releaseId,
  publishedId,
  document
}) {
  if (publishedId && document._id) {
    const versionId = getDocumentVersionId(publishedId, releaseId);
    return validateVersionIdMatch(versionId, document), versionId;
  }
  if (document._id) {
    const isDraft = isDraftId(document._id), isVersion = isVersionId(document._id);
    if (!isDraft && !isVersion)
      throw new Error(
        `\`${op}()\` requires a document with an \`_id\` that is a version or draft ID`
      );
    if (releaseId) {
      if (isDraft)
        throw new Error(
          `\`${op}()\` was called with a document ID (\`${document._id}\`) that is a draft ID, but a release ID (\`${releaseId}\`) was also provided.`
        );
      const builtVersionId = getVersionFromId(document._id);
      if (builtVersionId !== releaseId)
        throw new Error(
          `\`${op}()\` was called with a document ID (\`${document._id}\`) that is a version ID, but the release ID (\`${releaseId}\`) does not match the document's version ID (\`${builtVersionId}\`).`
        );
    }
    return document._id;
  }
  if (publishedId)
    return getDocumentVersionId(publishedId, releaseId);
  throw new Error(`\`${op}()\` requires either a publishedId or a document with an \`_id\``);
}
const getArgs = (releaseOrOptions, maybeOptions) => {
  if (typeof releaseOrOptions == "object" && releaseOrOptions !== null && ("releaseId" in releaseOrOptions || "metadata" in releaseOrOptions)) {
    const { releaseId = generateReleaseId(), metadata = {} } = releaseOrOptions;
    return [releaseId, metadata, maybeOptions];
  }
  return [generateReleaseId(), {}, releaseOrOptions];
}, createRelease = (releaseOrOptions, maybeOptions) => {
  const [releaseId, metadata, options] = getArgs(releaseOrOptions, maybeOptions), finalMetadata = {
    ...metadata,
    releaseType: metadata.releaseType || "undecided"
  };
  return { action: {
    actionType: "sanity.action.release.create",
    releaseId,
    metadata: finalMetadata
  }, options };
};
class ObservableReleasesClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * @public
   *
   * Retrieve a release by id.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to retrieve.
   * @param options - Additional query options including abort signal and query tag.
   * @returns An observable that resolves to the release document {@link ReleaseDocument}.
   *
   * @example Retrieving a release by id
   * ```ts
   * client.observable.releases.get({releaseId: 'my-release'}).pipe(
   *   tap((release) => console.log(release)),
   *   // {
   *   //   _id: '_.releases.my-release',
   *   //   name: 'my-release'
   *   //   _type: 'system.release',
   *   //   metadata: {releaseType: 'asap'},
   *   //   _createdAt: '2021-01-01T00:00:00.000Z',
   *   //   ...
   *   // }
   * ).subscribe()
   * ```
   */
  get({ releaseId }, options) {
    return _getDocument(
      this.#client,
      this.#httpRequest,
      `_.releases.${releaseId}`,
      options
    );
  }
  create(releaseOrOptions, maybeOptions) {
    const { action, options } = createRelease(releaseOrOptions, maybeOptions), { releaseId, metadata } = action;
    return _action(this.#client, this.#httpRequest, action, options).pipe(
      map((actionResult) => ({
        ...actionResult,
        releaseId,
        metadata
      }))
    );
  }
  /**
   * @public
   *
   * Edits an existing release, updating the metadata.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to edit.
   *   - `patch` - The patch operation to apply on the release metadata {@link PatchMutationOperation}.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  edit({ releaseId, patch }, options) {
    const editAction = {
      actionType: "sanity.action.release.edit",
      releaseId,
      patch
    };
    return _action(this.#client, this.#httpRequest, editAction, options);
  }
  /**
   * @public
   *
   * Publishes all documents in a release at once. For larger releases the effect of the publish
   * will be visible immediately when querying but the removal of the `versions.<releasesId>.*`
   * documents and creation of the corresponding published documents with the new content may
   * take some time.
   *
   * During this period both the source and target documents are locked and cannot be
   * modified through any other means.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to publish.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  publish({ releaseId }, options) {
    const publishAction = {
      actionType: "sanity.action.release.publish",
      releaseId
    };
    return _action(this.#client, this.#httpRequest, publishAction, options);
  }
  /**
   * @public
   *
   * An archive action removes an active release. The documents that comprise the release
   * are deleted and therefore no longer queryable.
   *
   * While the documents remain in retention the last version can still be accessed using document history endpoint.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to archive.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  archive({ releaseId }, options) {
    const archiveAction = {
      actionType: "sanity.action.release.archive",
      releaseId
    };
    return _action(this.#client, this.#httpRequest, archiveAction, options);
  }
  /**
   * @public
   *
   * An unarchive action restores an archived release and all documents
   * with the content they had just prior to archiving.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to unarchive.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  unarchive({ releaseId }, options) {
    const unarchiveAction = {
      actionType: "sanity.action.release.unarchive",
      releaseId
    };
    return _action(this.#client, this.#httpRequest, unarchiveAction, options);
  }
  /**
   * @public
   *
   * A schedule action queues a release for publishing at the given future time.
   * The release is locked such that no documents in the release can be modified and
   * no documents that it references can be deleted as this would make the publish fail.
   * At the given time, the same logic as for the publish action is triggered.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to schedule.
   *   - `publishAt` - The serialised date and time to publish the release. If the `publishAt` is in the past, the release will be published immediately.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  schedule({ releaseId, publishAt }, options) {
    const scheduleAction = {
      actionType: "sanity.action.release.schedule",
      releaseId,
      publishAt
    };
    return _action(this.#client, this.#httpRequest, scheduleAction, options);
  }
  /**
   * @public
   *
   * An unschedule action stops a release from being published.
   * The documents in the release are considered unlocked and can be edited again.
   * This may fail if another release is scheduled to be published after this one and
   * has a reference to a document created by this one.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to unschedule.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  unschedule({ releaseId }, options) {
    const unscheduleAction = {
      actionType: "sanity.action.release.unschedule",
      releaseId
    };
    return _action(this.#client, this.#httpRequest, unscheduleAction, options);
  }
  /**
   * @public
   *
   * A delete action removes a published or archived release.
   * The backing system document will be removed from the dataset.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to delete.
   * @param options - Additional action options.
   * @returns An observable that resolves to the `transactionId`.
   */
  delete({ releaseId }, options) {
    const deleteAction = {
      actionType: "sanity.action.release.delete",
      releaseId
    };
    return _action(this.#client, this.#httpRequest, deleteAction, options);
  }
  /**
   * @public
   *
   * Fetch the documents in a release by release id.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to fetch documents for.
   * @param options - Additional mutation options {@link BaseMutationOptions}.
   * @returns An observable that resolves to the documents in the release.
   */
  fetchDocuments({ releaseId }, options) {
    return _getReleaseDocuments(this.#client, this.#httpRequest, releaseId, options);
  }
}
class ReleasesClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * @public
   *
   * Retrieve a release by id.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to retrieve.
   * @param options - Additional query options including abort signal and query tag.
   * @returns A promise that resolves to the release document {@link ReleaseDocument}.
   *
   * @example Retrieving a release by id
   * ```ts
   * const release = await client.releases.get({releaseId: 'my-release'})
   * console.log(release)
   * // {
   * //   _id: '_.releases.my-release',
   * //   name: 'my-release'
   * //   _type: 'system.release',
   * //   metadata: {releaseType: 'asap'},
   * //   _createdAt: '2021-01-01T00:00:00.000Z',
   * //   ...
   * // }
   * ```
   */
  get({ releaseId }, options) {
    return lastValueFrom(
      _getDocument(
        this.#client,
        this.#httpRequest,
        `_.releases.${releaseId}`,
        options
      )
    );
  }
  async create(releaseOrOptions, maybeOptions) {
    const { action, options } = createRelease(releaseOrOptions, maybeOptions), { releaseId, metadata } = action;
    return { ...await lastValueFrom(
      _action(this.#client, this.#httpRequest, action, options)
    ), releaseId, metadata };
  }
  /**
   * @public
   *
   * Edits an existing release, updating the metadata.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to edit.
   *   - `patch` - The patch operation to apply on the release metadata {@link PatchMutationOperation}.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  edit({ releaseId, patch }, options) {
    const editAction = {
      actionType: "sanity.action.release.edit",
      releaseId,
      patch
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, editAction, options));
  }
  /**
   * @public
   *
   * Publishes all documents in a release at once. For larger releases the effect of the publish
   * will be visible immediately when querying but the removal of the `versions.<releasesId>.*`
   * documents and creation of the corresponding published documents with the new content may
   * take some time.
   *
   * During this period both the source and target documents are locked and cannot be
   * modified through any other means.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to publish.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  publish({ releaseId }, options) {
    const publishAction = {
      actionType: "sanity.action.release.publish",
      releaseId
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, publishAction, options));
  }
  /**
   * @public
   *
   * An archive action removes an active release. The documents that comprise the release
   * are deleted and therefore no longer queryable.
   *
   * While the documents remain in retention the last version can still be accessed using document history endpoint.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to archive.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  archive({ releaseId }, options) {
    const archiveAction = {
      actionType: "sanity.action.release.archive",
      releaseId
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, archiveAction, options));
  }
  /**
   * @public
   *
   * An unarchive action restores an archived release and all documents
   * with the content they had just prior to archiving.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to unarchive.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  unarchive({ releaseId }, options) {
    const unarchiveAction = {
      actionType: "sanity.action.release.unarchive",
      releaseId
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, unarchiveAction, options));
  }
  /**
   * @public
   *
   * A schedule action queues a release for publishing at the given future time.
   * The release is locked such that no documents in the release can be modified and
   * no documents that it references can be deleted as this would make the publish fail.
   * At the given time, the same logic as for the publish action is triggered.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to schedule.
   *   - `publishAt` - The serialised date and time to publish the release. If the `publishAt` is in the past, the release will be published immediately.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  schedule({ releaseId, publishAt }, options) {
    const scheduleAction = {
      actionType: "sanity.action.release.schedule",
      releaseId,
      publishAt
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, scheduleAction, options));
  }
  /**
   * @public
   *
   * An unschedule action stops a release from being published.
   * The documents in the release are considered unlocked and can be edited again.
   * This may fail if another release is scheduled to be published after this one and
   * has a reference to a document created by this one.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to unschedule.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  unschedule({ releaseId }, options) {
    const unscheduleAction = {
      actionType: "sanity.action.release.unschedule",
      releaseId
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, unscheduleAction, options));
  }
  /**
   * @public
   *
   * A delete action removes a published or archived release.
   * The backing system document will be removed from the dataset.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to delete.
   * @param options - Additional action options.
   * @returns A promise that resolves to the `transactionId`.
   */
  delete({ releaseId }, options) {
    const deleteAction = {
      actionType: "sanity.action.release.delete",
      releaseId
    };
    return lastValueFrom(_action(this.#client, this.#httpRequest, deleteAction, options));
  }
  /**
   * @public
   *
   * Fetch the documents in a release by release id.
   *
   * @category Releases
   *
   * @param params - Release action parameters:
   *   - `releaseId` - The id of the release to fetch documents for.
   * @param options - Additional mutation options {@link BaseMutationOptions}.
   * @returns A promise that resolves to the documents in the release.
   */
  fetchDocuments({ releaseId }, options) {
    return lastValueFrom(_getReleaseDocuments(this.#client, this.#httpRequest, releaseId, options));
  }
}
class ObservableUsersClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Fetch a user by user ID
   *
   * @param id - User ID of the user to fetch. If `me` is provided, a minimal response including the users role is returned.
   */
  getById(id) {
    return _request(
      this.#client,
      this.#httpRequest,
      { uri: `/users/${id}` }
    );
  }
}
class UsersClient {
  #client;
  #httpRequest;
  constructor(client, httpRequest) {
    this.#client = client, this.#httpRequest = httpRequest;
  }
  /**
   * Fetch a user by user ID
   *
   * @param id - User ID of the user to fetch. If `me` is provided, a minimal response including the users role is returned.
   */
  getById(id) {
    return lastValueFrom(
      _request(this.#client, this.#httpRequest, {
        uri: `/users/${id}`
      })
    );
  }
}
class ObservableSanityClient {
  assets;
  datasets;
  live;
  mediaLibrary;
  projects;
  users;
  agent;
  releases;
  /**
   * Private properties
   */
  #clientConfig;
  #httpRequest;
  /**
   * Instance properties
   */
  listen = _listen;
  constructor(httpRequest, config = defaultConfig) {
    this.config(config), this.#httpRequest = httpRequest, this.assets = new ObservableAssetsClient(this, this.#httpRequest), this.datasets = new ObservableDatasetsClient(this, this.#httpRequest), this.live = new LiveClient(this), this.mediaLibrary = {
      video: new ObservableMediaLibraryVideoClient(this, this.#httpRequest)
    }, this.projects = new ObservableProjectsClient(this, this.#httpRequest), this.users = new ObservableUsersClient(this, this.#httpRequest), this.agent = {
      action: new ObservableAgentsActionClient(this, this.#httpRequest)
    }, this.releases = new ObservableReleasesClient(this, this.#httpRequest);
  }
  /**
   * Clone the client - returns a new instance
   */
  clone() {
    return new ObservableSanityClient(this.#httpRequest, this.config());
  }
  config(newConfig) {
    if (newConfig === void 0)
      return { ...this.#clientConfig };
    if (this.#clientConfig && this.#clientConfig.allowReconfigure === false)
      throw new Error(
        "Existing client instance cannot be reconfigured - use `withConfig(newConfig)` to return a new client"
      );
    return this.#clientConfig = initConfig(newConfig, this.#clientConfig || {}), this;
  }
  /**
   * Clone the client with a new (partial) configuration.
   *
   * @param newConfig - New client configuration properties, shallowly merged with existing configuration
   */
  withConfig(newConfig) {
    const thisConfig = this.config();
    return new ObservableSanityClient(this.#httpRequest, {
      ...thisConfig,
      ...newConfig,
      stega: {
        ...thisConfig.stega || {},
        ...typeof newConfig?.stega == "boolean" ? { enabled: newConfig.stega } : newConfig?.stega || {}
      }
    });
  }
  fetch(query, params, options) {
    return _fetch(
      this,
      this.#httpRequest,
      this.#clientConfig.stega,
      query,
      params,
      options
    );
  }
  getDocument(id, options) {
    if (options?.includeAllVersions === true)
      return _getDocument(this, this.#httpRequest, id, {
        ...options,
        includeAllVersions: true
      });
    const opts = {
      signal: options?.signal,
      tag: options?.tag,
      releaseId: options?.releaseId,
      ...options && "includeAllVersions" in options ? { includeAllVersions: false } : {}
    };
    return _getDocument(this, this.#httpRequest, id, opts);
  }
  /**
   * Fetch multiple documents in one request.
   * Should be used sparingly - performing a query is usually a better option.
   * The order/position of documents is preserved based on the original array of IDs.
   * If any of the documents are missing, they will be replaced by a `null` entry in the returned array
   *
   * @param ids - Document IDs to fetch
   * @param options - Request options
   */
  getDocuments(ids, options) {
    return _getDocuments(this, this.#httpRequest, ids, options);
  }
  create(document, options) {
    return _create(this, this.#httpRequest, document, "create", options);
  }
  createIfNotExists(document, options) {
    return _createIfNotExists(this, this.#httpRequest, document, options);
  }
  createOrReplace(document, options) {
    return _createOrReplace(this, this.#httpRequest, document, options);
  }
  createVersion({
    document,
    publishedId,
    releaseId,
    baseId,
    ifBaseRevisionId
  }, options) {
    if (!document)
      return _createVersionFromBase(
        this,
        this.#httpRequest,
        publishedId,
        baseId,
        releaseId,
        ifBaseRevisionId,
        options
      );
    const documentVersionId = deriveDocumentVersionId("createVersion", {
      document,
      publishedId,
      releaseId
    }), documentVersion = { ...document, _id: documentVersionId }, versionPublishedId = publishedId || getPublishedId(document._id);
    return _createVersion(
      this,
      this.#httpRequest,
      documentVersion,
      versionPublishedId,
      options
    );
  }
  delete(selection, options) {
    return _delete(this, this.#httpRequest, selection, options);
  }
  /**
   * @public
   *
   * Deletes the draft or release version of a document.
   *
   * @remarks
   * * Discarding a version with no `releaseId` will discard the draft version of the published document.
   * * If the draft or release version does not exist, any error will throw.
   *
   * @param params - Version action parameters:
   *   - `releaseId` - The ID of the release to discard the document from.
   *   - `publishedId` - The published ID of the document to discard.
   * @param purge - if `true` the document history is also discarded.
   * @param options - Additional action options.
   * @returns an observable that resolves to the `transactionId`.
   *
   * @example Discarding a release version of a document
   * ```ts
   * client.observable.discardVersion({publishedId: 'myDocument', releaseId: 'myRelease'})
   * // The document with the ID `versions.myRelease.myDocument` will be discarded.
   * ```
   *
   * @example Discarding a draft version of a document
   * ```ts
   * client.observable.discardVersion({publishedId: 'myDocument'})
   * // The document with the ID `drafts.myDocument` will be discarded.
   * ```
   */
  discardVersion({ releaseId, publishedId }, purge, options) {
    const documentVersionId = getDocumentVersionId(publishedId, releaseId);
    return _discardVersion(this, this.#httpRequest, documentVersionId, purge, options);
  }
  replaceVersion({
    document,
    publishedId,
    releaseId
  }, options) {
    const documentVersionId = deriveDocumentVersionId("replaceVersion", {
      document,
      publishedId,
      releaseId
    }), documentVersion = { ...document, _id: documentVersionId };
    return _replaceVersion(this, this.#httpRequest, documentVersion, options);
  }
  /**
   * @public
   *
   * Used to indicate when a document within a release should be unpublished when
   * the release is run.
   *
   * @remarks
   * * If the published document does not exist, an error will be thrown.
   *
   * @param params - Version action parameters:
   *   - `releaseId` - The ID of the release to unpublish the document from.
   *   - `publishedId` - The published ID of the document to unpublish.
   * @param options - Additional action options.
   * @returns an observable that resolves to the `transactionId`.
   *
   * @example Unpublishing a release version of a published document
   * ```ts
   * client.observable.unpublishVersion({publishedId: 'myDocument', releaseId: 'myRelease'})
   * // The document with the ID `versions.myRelease.myDocument` will be unpublished. when `myRelease` is run.
   * ```
   */
  unpublishVersion({ releaseId, publishedId }, options) {
    const versionId = getVersionId(publishedId, releaseId);
    return _unpublishVersion(this, this.#httpRequest, versionId, publishedId, options);
  }
  mutate(operations, options) {
    return _mutate(this, this.#httpRequest, operations, options);
  }
  /**
   * Create a new buildable patch of operations to perform
   *
   * @param selection - Document ID, an array of document IDs, or an object with `query` and optional `params`, defining which document(s) to patch
   * @param operations - Optional object of patch operations to initialize the patch instance with
   * @returns Patch instance - call `.commit()` to perform the operations defined
   */
  patch(selection, operations) {
    return new ObservablePatch(selection, operations, this);
  }
  /**
   * Create a new transaction of mutations
   *
   * @param operations - Optional array of mutation operations to initialize the transaction instance with
   */
  transaction(operations) {
    return new ObservableTransaction(operations, this);
  }
  /**
   * Perform action operations against the configured dataset
   *
   * @param operations - Action operation(s) to execute
   * @param options - Action options
   */
  action(operations, options) {
    return _action(this, this.#httpRequest, operations, options);
  }
  /**
   * Perform an HTTP request against the Sanity API
   *
   * @param options - Request options
   */
  request(options) {
    return _request(this, this.#httpRequest, options);
  }
  /**
   * Get a Sanity API URL for the URI provided
   *
   * @param uri - URI/path to build URL for
   * @param canUseCdn - Whether or not to allow using the API CDN for this route
   */
  getUrl(uri, canUseCdn) {
    return _getUrl(this, uri, canUseCdn);
  }
  /**
   * Get a Sanity API URL for the data operation and path provided
   *
   * @param operation - Data operation (eg `query`, `mutate`, `listen` or similar)
   * @param path - Path to append after the operation
   */
  getDataUrl(operation, path) {
    return _getDataUrl(this, operation, path);
  }
}
class SanityClient {
  assets;
  datasets;
  live;
  mediaLibrary;
  projects;
  users;
  agent;
  releases;
  /**
   * Observable version of the Sanity client, with the same configuration as the promise-based one
   */
  observable;
  /**
   * Private properties
   */
  #clientConfig;
  #httpRequest;
  /**
   * Instance properties
   */
  listen = _listen;
  constructor(httpRequest, config = defaultConfig) {
    this.config(config), this.#httpRequest = httpRequest, this.assets = new AssetsClient(this, this.#httpRequest), this.datasets = new DatasetsClient(this, this.#httpRequest), this.live = new LiveClient(this), this.mediaLibrary = {
      video: new MediaLibraryVideoClient(this, this.#httpRequest)
    }, this.projects = new ProjectsClient(this, this.#httpRequest), this.users = new UsersClient(this, this.#httpRequest), this.agent = {
      action: new AgentActionsClient(this, this.#httpRequest)
    }, this.releases = new ReleasesClient(this, this.#httpRequest), this.observable = new ObservableSanityClient(httpRequest, config);
  }
  /**
   * Clone the client - returns a new instance
   */
  clone() {
    return new SanityClient(this.#httpRequest, this.config());
  }
  config(newConfig) {
    if (newConfig === void 0)
      return { ...this.#clientConfig };
    if (this.#clientConfig && this.#clientConfig.allowReconfigure === false)
      throw new Error(
        "Existing client instance cannot be reconfigured - use `withConfig(newConfig)` to return a new client"
      );
    return this.observable && this.observable.config(newConfig), this.#clientConfig = initConfig(newConfig, this.#clientConfig || {}), this;
  }
  /**
   * Clone the client with a new (partial) configuration.
   *
   * @param newConfig - New client configuration properties, shallowly merged with existing configuration
   */
  withConfig(newConfig) {
    const thisConfig = this.config();
    return new SanityClient(this.#httpRequest, {
      ...thisConfig,
      ...newConfig,
      stega: {
        ...thisConfig.stega || {},
        ...typeof newConfig?.stega == "boolean" ? { enabled: newConfig.stega } : newConfig?.stega || {}
      }
    });
  }
  fetch(query, params, options) {
    return lastValueFrom(
      _fetch(
        this,
        this.#httpRequest,
        this.#clientConfig.stega,
        query,
        params,
        options
      )
    );
  }
  getDocument(id, options) {
    if (options?.includeAllVersions === true)
      return lastValueFrom(
        _getDocument(this, this.#httpRequest, id, {
          ...options,
          includeAllVersions: true
        })
      );
    const opts = {
      signal: options?.signal,
      tag: options?.tag,
      releaseId: options?.releaseId,
      ...options && "includeAllVersions" in options ? { includeAllVersions: false } : {}
    };
    return lastValueFrom(_getDocument(this, this.#httpRequest, id, opts));
  }
  /**
   * Fetch multiple documents in one request.
   * Should be used sparingly - performing a query is usually a better option.
   * The order/position of documents is preserved based on the original array of IDs.
   * If any of the documents are missing, they will be replaced by a `null` entry in the returned array
   *
   * @param ids - Document IDs to fetch
   * @param options - Request options
   */
  getDocuments(ids, options) {
    return lastValueFrom(_getDocuments(this, this.#httpRequest, ids, options));
  }
  create(document, options) {
    return lastValueFrom(
      _create(this, this.#httpRequest, document, "create", options)
    );
  }
  createIfNotExists(document, options) {
    return lastValueFrom(
      _createIfNotExists(this, this.#httpRequest, document, options)
    );
  }
  createOrReplace(document, options) {
    return lastValueFrom(
      _createOrReplace(this, this.#httpRequest, document, options)
    );
  }
  createVersion({
    document,
    publishedId,
    releaseId,
    baseId,
    ifBaseRevisionId
  }, options) {
    if (!document)
      return firstValueFrom(
        _createVersionFromBase(
          this,
          this.#httpRequest,
          publishedId,
          baseId,
          releaseId,
          ifBaseRevisionId,
          options
        )
      );
    const documentVersionId = deriveDocumentVersionId("createVersion", {
      document,
      publishedId,
      releaseId
    }), documentVersion = { ...document, _id: documentVersionId }, versionPublishedId = publishedId || getPublishedId(document._id);
    return firstValueFrom(
      _createVersion(
        this,
        this.#httpRequest,
        documentVersion,
        versionPublishedId,
        options
      )
    );
  }
  delete(selection, options) {
    return lastValueFrom(_delete(this, this.#httpRequest, selection, options));
  }
  /**
   * @public
   *
   * Deletes the draft or release version of a document.
   *
   * @remarks
   * * Discarding a version with no `releaseId` will discard the draft version of the published document.
   * * If the draft or release version does not exist, any error will throw.
   *
   * @param params - Version action parameters:
   *   - `releaseId` - The ID of the release to discard the document from.
   *   - `publishedId` - The published ID of the document to discard.
   * @param purge - if `true` the document history is also discarded.
   * @param options - Additional action options.
   * @returns a promise that resolves to the `transactionId`.
   *
   * @example Discarding a release version of a document
   * ```ts
   * client.discardVersion({publishedId: 'myDocument', releaseId: 'myRelease'})
   * // The document with the ID `versions.myRelease.myDocument` will be discarded.
   * ```
   *
   * @example Discarding a draft version of a document
   * ```ts
   * client.discardVersion({publishedId: 'myDocument'})
   * // The document with the ID `drafts.myDocument` will be discarded.
   * ```
   */
  discardVersion({ releaseId, publishedId }, purge, options) {
    const documentVersionId = getDocumentVersionId(publishedId, releaseId);
    return lastValueFrom(
      _discardVersion(this, this.#httpRequest, documentVersionId, purge, options)
    );
  }
  replaceVersion({
    document,
    publishedId,
    releaseId
  }, options) {
    const documentVersionId = deriveDocumentVersionId("replaceVersion", {
      document,
      publishedId,
      releaseId
    }), documentVersion = { ...document, _id: documentVersionId };
    return firstValueFrom(
      _replaceVersion(this, this.#httpRequest, documentVersion, options)
    );
  }
  /**
   * @public
   *
   * Used to indicate when a document within a release should be unpublished when
   * the release is run.
   *
   * @remarks
   * * If the published document does not exist, an error will be thrown.
   *
   * @param params - Version action parameters:
   *   - `releaseId` - The ID of the release to unpublish the document from.
   *   - `publishedId` - The published ID of the document to unpublish.
   * @param options - Additional action options.
   * @returns a promise that resolves to the `transactionId`.
   *
   * @example Unpublishing a release version of a published document
   * ```ts
   * await client.unpublishVersion({publishedId: 'myDocument', releaseId: 'myRelease'})
   * // The document with the ID `versions.myRelease.myDocument` will be unpublished. when `myRelease` is run.
   * ```
   */
  unpublishVersion({ releaseId, publishedId }, options) {
    const versionId = getVersionId(publishedId, releaseId);
    return lastValueFrom(
      _unpublishVersion(this, this.#httpRequest, versionId, publishedId, options)
    );
  }
  mutate(operations, options) {
    return lastValueFrom(_mutate(this, this.#httpRequest, operations, options));
  }
  /**
   * Create a new buildable patch of operations to perform
   *
   * @param selection - Document ID, an array of document IDs, or an object with `query` and optional `params`, defining which document(s) to patch
   * @param operations - Optional object of patch operations to initialize the patch instance with
   * @returns Patch instance - call `.commit()` to perform the operations defined
   */
  patch(documentId, operations) {
    return new Patch(documentId, operations, this);
  }
  /**
   * Create a new transaction of mutations
   *
   * @param operations - Optional array of mutation operations to initialize the transaction instance with
   */
  transaction(operations) {
    return new Transaction(operations, this);
  }
  /**
   * Perform action operations against the configured dataset
   * Returns a promise that resolves to the transaction result
   *
   * @param operations - Action operation(s) to execute
   * @param options - Action options
   */
  action(operations, options) {
    return lastValueFrom(_action(this, this.#httpRequest, operations, options));
  }
  /**
   * Perform a request against the Sanity API
   * NOTE: Only use this for Sanity API endpoints, not for your own APIs!
   *
   * @param options - Request options
   * @returns Promise resolving to the response body
   */
  request(options) {
    return lastValueFrom(_request(this, this.#httpRequest, options));
  }
  /**
   * Perform an HTTP request a `/data` sub-endpoint
   * NOTE: Considered internal, thus marked as deprecated. Use `request` instead.
   *
   * @deprecated - Use `request()` or your own HTTP library instead
   * @param endpoint - Endpoint to hit (mutate, query etc)
   * @param body - Request body
   * @param options - Request options
   * @internal
   */
  dataRequest(endpoint, body, options) {
    return lastValueFrom(_dataRequest(this, this.#httpRequest, endpoint, body, options));
  }
  /**
   * Get a Sanity API URL for the URI provided
   *
   * @param uri - URI/path to build URL for
   * @param canUseCdn - Whether or not to allow using the API CDN for this route
   */
  getUrl(uri, canUseCdn) {
    return _getUrl(this, uri, canUseCdn);
  }
  /**
   * Get a Sanity API URL for the data operation and path provided
   *
   * @param operation - Data operation (eg `query`, `mutate`, `listen` or similar)
   * @param path - Path to append after the operation
   */
  getDataUrl(operation, path) {
    return _getDataUrl(this, operation, path);
  }
}
function defineCreateClientExports(envMiddleware2, ClassConstructor) {
  return { requester: defineHttpRequest(envMiddleware2), createClient: (config) => {
    const clientRequester = defineHttpRequest(envMiddleware2, {
      ignoreWarnings: config.ignoreWarnings
    });
    return new ClassConstructor(
      (options, requester2) => (requester2 || clientRequester)({
        maxRedirects: 0,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        lineage: config.lineage,
        ...options
      }),
      config
    );
  } };
}
var envMiddleware = [];
const exp = defineCreateClientExports(envMiddleware, SanityClient), createClient = exp.createClient;

const createSanityHelper = (clientConfig) => {
  const sanityConfig = useSanityConfig();
  const config = { ...clientConfig };
  let client = createClient(config);
  let queryStore = createQueryStore(sanityConfig.visualEditing);
  const liveStore = createLiveStore(sanityConfig.liveContent);
  return {
    client,
    config,
    // @ts-expect-error untyped args
    fetch: (...args) => client.fetch(...args),
    liveStore,
    queryStore,
    setToken(token) {
      config.token = token;
      client = createClient(config);
      if (queryStore && sanityConfig.visualEditing) {
        queryStore = createQueryStore(sanityConfig.visualEditing);
      }
    }
  };
};
function useSanity(_event, _client) {
  const client = typeof _event === "string" ? _event : "default";
  const nuxtApp = useNuxtApp();
  if (nuxtApp._sanity?.[client]) {
    return nuxtApp._sanity[client];
  }
  nuxtApp._sanity = nuxtApp._sanity || {};
  const sanityConfig = useSanityConfig();
  const { additionalClients = {}, liveContent, visualEditing, ...options } = sanityConfig;
  if (!options.disableSmartCdn && nuxtApp.$preview) {
    options.useCdn = false;
  } else if (!options.useCdn && !options.token) {
    options.useCdn = true;
  }
  if (client === "default") {
    nuxtApp._sanity.default = createSanityHelper(options);
    return nuxtApp._sanity.default;
  }
  nuxtApp._sanity[client] = createSanityHelper(defu(additionalClients[client], options));
  return nuxtApp._sanity[client];
}

function useSanityPreviewEnvironment() {
  return useState("sanity-preview-environment", () => "checking");
}

function useIsSanityPresentationTool() {
  const env = useSanityPreviewEnvironment();
  return computed(() => {
    if (env.value === "checking") return null;
    return ["presentation-iframe", "presentation-window"].includes(env.value);
  });
}

const perspectiveCookieName = "sanity-preview-perspective";

const useSanityVisualEditingState = () => {
  const { visualEditing } = useSanityConfig();
  if (!visualEditing) {
    return void 0;
  }
  const previewState = useState("sanity-preview", () => false);
  const enabled = computed({
    get() {
      if (visualEditing.previewMode === false) return true;
      return previewState.value;
    },
    set(enabled2) {
      previewState.value = enabled2;
    }
  });
  const isInFrame = () => {
    return !!(window.self !== window.top || window.opener);
  };
  return reactive({
    enabled,
    /**
     * @deprecated Use the `useIsSanityLivePreview` and
     * `useIsSanityPresentationTool` composables for conditional rendering
     * instead
     */
    inFrame: isInFrame(),
    token: visualEditing.token,
    previewMode: visualEditing.previewMode,
    previewModeId: visualEditing.previewModeId
  });
};

function isValidPerspective(perspective, allowRaw) {
  if (typeof perspective == "string") {
    return perspective === "published" || perspective === "drafts" || perspective === "previewDrafts" || allowRaw && perspective === "raw";
  }
  if (Array.isArray(perspective)) {
    return perspective.every((p) => typeof p === "string");
  }
  return false;
}
const sanitizePerspective = (_perspective, fallback) => {
  const perspective = typeof _perspective === "string" && _perspective.includes(",") ? _perspective.split(",") : _perspective;
  try {
    if (isValidPerspective(perspective, false)) {
      return perspective;
    }
    return fallback;
  } catch (err) {
    console.warn(`Invalid perspective:`, _perspective, perspective, err);
    return fallback;
  }
};
const useSanityPerspective = (perspective, fallback) => {
  const visualEditingState = useSanityVisualEditingState();
  const cookie = useCookie(perspectiveCookieName, {
    default: () => null,
    sameSite: "none",
    secure: true,
    path: "/"
  });
  return computed({
    get() {
      if (perspective) {
        return perspective;
      }
      if (visualEditingState?.enabled) {
        return sanitizePerspective(cookie.value, "drafts");
      }
      return fallback || "published";
    },
    set(perspective2) {
      try {
        if (isValidPerspective(perspective2, true)) {
          cookie.value = perspective2;
        } else {
          throw new Error("Invalid perspective value provided");
        }
      } catch {
        cookie.value = null;
      }
    }
  });
};

const createForwardingClient = (endpoint) => {
  return {
    fetch: (query, params, options) => {
      return $fetch(
        endpoint,
        {
          method: "POST",
          body: { query, params, options }
        }
      );
    }
  };
};

const useSanityTagRevalidation = ({
  client,
  queryKey,
  liveStore
}) => {
  const liveContentTags = useState(`tags:${queryKey}`, () => []);
  let unsubscribe = () => {
  };
  let getLastLiveEventId = () => void 0;
  if (liveStore) {
    const subscriber = liveStore.subscribe(queryKey, (tags, updateLastLiveEventId) => {
      const tagsSet = new Set(tags);
      if (liveContentTags.value.some((tag) => tagsSet.has(tag))) {
        updateLastLiveEventId();
        refreshNuxtData(queryKey);
      }
    });
    unsubscribe = subscriber.unsubscribe;
    getLastLiveEventId = subscriber.getLastLiveEventId;
  }
  const fetchTags = async (query, params, options) => {
    const { syncTags } = await client.fetch(query, params, {
      ...options,
      resultSourceMap: false,
      returnQuery: false,
      stega: false,
      tag: ["fetch-sync-tags"].filter(Boolean).join(".")
    });
    liveContentTags.value = syncTags?.map((tag) => `sanity:${tag}`) || [];
  };
  return { fetchTags, getLastLiveEventId, unsubscribe };
};

const useSanityQueryFetcher = ({
  onSnapshot,
  params,
  query,
  queryStore
}) => {
  let unsubscribe = () => {
  };
  if (queryStore) {
    const setupFetcher = (cb) => {
      const fetcher = queryStore.createFetcherStore(
        query,
        void 0,
        void 0
      );
      const unsubscribe2 = fetcher.subscribe((newSnapshot) => {
        if (newSnapshot.data) {
          onSnapshot(newSnapshot.data, newSnapshot.sourceMap);
        }
      });
      return unsubscribe2;
    };
    unsubscribe = setupFetcher();
  }
  return { unsubscribe };
};

const getToken = ({
  config,
  client,
  perspective
}) => {
  if (perspective === "published") {
    return client.config().token || void 0;
  }
  if (config.liveContent?.serverToken) {
    return config.liveContent.serverToken;
  }
  if (config.visualEditing) {
    return config.visualEditing.token;
  }
  return void 0;
};
function useSanityQuery(query, _params, _options = {}) {
  const {
    client: _client,
    perspective: _perspective,
    stega: _stega,
    ...options
  } = _options;
  const sanity = useSanity(_client);
  const config = useSanityConfig();
  const visualEditingState = useSanityVisualEditingState();
  const clientConfig = sanity.client.config();
  const params = void 0;
  const queryKey = "sanity-" + hash(query + (""));
  const perspective = useSanityPerspective(_perspective, clientConfig.perspective);
  const stega = _stega ?? (clientConfig.stega?.enabled && typeof clientConfig.stega.studioUrl !== "undefined" && visualEditingState?.enabled);
  options.watch = options.watch || [];
  options.watch.push(perspective);
  const data = ref(null);
  const sourceMap = ref(null);
  const encodeDataAttribute = ref(() => {
  });
  const updateRefs = (newData, newSourceMap) => {
    data.value = newData;
    sourceMap.value = newSourceMap || null;
    encodeDataAttribute.value = defineEncodeDataAttribute(
      newData,
      newSourceMap,
      config.visualEditing?.studioUrl
    );
  };
  const client = config.visualEditing && visualEditingState?.enabled && true && perspective.value !== "published" ? createForwardingClient(config.visualEditing.proxyEndpoint) : config.queryEndpoint ? createForwardingClient(config.queryEndpoint) : sanity.client;
  let tagRevalidation = void 0;
  let queryFetcher = void 0;
  const _inPresentation = useIsSanityPresentationTool();
  watch(_inPresentation, (inPresentation, _wasInPresentation, onCleanup) => {
    onCleanup(() => {
      queryFetcher?.unsubscribe?.();
      tagRevalidation?.unsubscribe();
    });
    const enableQueryFetcher = !!(visualEditingState?.enabled && config.visualEditing?.mode === "live-visual-editing" && inPresentation === true);
    if (enableQueryFetcher) {
      queryFetcher = useSanityQueryFetcher({
        onSnapshot: updateRefs,
        params,
        query,
        queryStore: sanity.queryStore
      });
      return;
    }
    if (config.liveContent && !enableQueryFetcher) {
      tagRevalidation = useSanityTagRevalidation({
        client: sanity.client,
        liveStore: sanity.liveStore,
        queryKey
      });
    }
  }, { immediate: true });
  const result = useAsyncData(queryKey, async () => {
    const useCdn = perspective.value === "published";
    const token = getToken({
      config,
      client: sanity.client,
      perspective: perspective.value
    });
    const options2 = {
      cacheMode: useCdn ? "noStale" : void 0,
      filterResponse: false,
      lastLiveEventId: tagRevalidation?.getLastLiveEventId(),
      perspective: perspective.value,
      resultSourceMap: "withKeyArraySelector",
      stega,
      token,
      useCdn
    };
    await tagRevalidation?.fetchTags(query, params, options2);
    const { result: result2, resultSourceMap } = await client.fetch(query, {}, options2);
    updateRefs(result2, resultSourceMap);
    return { data: result2, sourceMap: resultSourceMap };
  }, options);
  return Object.assign(new Promise((resolve) => {
    result.then((value) => {
      if (value.data.value) {
        updateRefs(value.data.value.data, value.data.value.sourceMap);
      }
      resolve({
        ...result,
        data,
        sourceMap,
        encodeDataAttribute
      });
    });
  }), { ...result, data, sourceMap, encodeDataAttribute });
}

const useDataStore = defineStore('data', {
  state: () => ({
    globalData: null,
    allCompanies: [],
    allTeamMembers: [],
    teamActiveIndex: 0
  }),
  actions: {
    async fetchData() {
      const { data } = await useSanityQuery(globalDataQuery);
      const raw = data.value.data;

      this.setGlobalData({
        socials: formatSocials(raw?.globalData?.socials),
        footerTitle: raw?.globalData?.footer_title || null,
        footerCopyrights: raw?.globalData?.footer_copyrights || null,
        legalNav: formatLegalNav(raw?.globalData?.legalNav),
        seo: formatSeo(raw?.globalData?.seo)
      });

      this.setAllCompanies(formatCompanies(raw?.allCompanies));
      this.setAllTeamMembers(formatTeamMembers(raw?.allTeamMembers));
    },

    setGlobalData(payload) {
      this.globalData = payload;
    },

    setAllCompanies(payload) {
      this.allCompanies = payload;
    },

    setAllTeamMembers(payload) {
      this.allTeamMembers = payload;
    },

    clear() {
      this.$reset();
    }
  }
});

const formatSeo = (seo) => ({
  title: seo?.title || null,
  description: seo?.description || null,
  image: seo?.image?.asset?.url || null
});

const formatCompanies = (companies) =>
  companies?.map(
    ({
      slug,
      companyName,
      logo,
      copy,
      founded,
      invested,
      stage,
      websiteUrl,
      seo
    }) => ({
      slug: slug?.current,
      url: `/companies/${slug?.current}`,
      logo: logo?.asset?.url || null,
      name: companyName,
      copy: copy || null,
      founded: founded || null,
      invested: invested || null,
      stage: stage || null,
      websiteUrl: websiteUrl || null,
      seo: formatSeo(seo)
    })
  ) || [];

const formatTeamMembers = (members) =>
  members?.map(({ name, position, portrait, depthMap, normalMap }) => ({
    name,
    position,
    portrait: portrait?.asset?.url,
    depthMap: depthMap?.asset?.url,
    normalMap: normalMap?.asset?.url
  })) || [];

const formatSocials = (socials) =>
  socials?.map(({ label, type, url }) => ({
    label,
    type,
    url: type === 'email' ? `mailto:${url}` : url
  })) || [];

const formatLegalNav = (legalNav) =>
  legalNav?.map(({ label, type, url }) => ({
    label,
    type,
    url
  })) || [];

export { EMPTY as E, Observable as O, __read as _, useSanityQuery as a, mergeMap as b, innerFrom as c, isFunction as d, createOperatorSubscriber as e, __values as f, groq as g, arrRemove as h, isArrayLike as i, map as j, filter as k, defer as l, mapOneOrManyArgs as m, noop as n, operate as o, pipe as p, atom as q, isRecord as r, seoFragment as s, useDataStore as u, validateApiPerspective as v, y };
