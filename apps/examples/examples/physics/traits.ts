import { trait } from 'koota';
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js';

export const OrbitControls = trait<() => ThreeOrbitControls>(() => null!)

