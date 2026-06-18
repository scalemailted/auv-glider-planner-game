export const REQUIRED_THREE_VENDOR_FILES = Object.freeze([
  'build/three.module.js',
  'build/three.core.js'
]);

export const THREE_VENDOR_MANIFEST_TYPE = 'anchor.vendor.three-runtime';
export const THREE_VENDOR_ROOT = 'vendor/three';
export const THREE_IMPORT_MAP = Object.freeze({
  three: './vendor/three/build/three.module.js',
  'three/addons/': './vendor/three/examples/jsm/'
});