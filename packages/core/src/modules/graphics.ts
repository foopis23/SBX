import { trait, createAdded, createRemoved } from "koota";
import * as THREE from "three";
import { Game, Transform, type System } from "../core";
import { GlobalNotFoundError } from "../errors/global-not-found-error";

export { THREE };

const ModuleName = "Graphics";

export class AutoScalingOrthographicCamera extends THREE.OrthographicCamera {
  public readonly size: number;
  public readonly canvas: HTMLCanvasElement;

  constructor(size: number = 5, canvas?: HTMLCanvasElement) {
    super()
    this.size = size;

    if (!canvas) {
      throw new Error("Canvas element is required for AutoScalingOrthographicCamera")
    }

    this.canvas = canvas;

    window.addEventListener('resize', () => {
      this.handleResize()
    })
    this.handleResize()
  }

  handleResize() {
    console.log(this.size)
    const height = this.size;
    const width = (this.canvas.width / this.canvas.height) * this.size;
    this.left = width / -2
    this.right = width / 2
    this.top = height / -2
    this.bottom = height / 2
    this.updateProjectionMatrix()
  }
}


export const CanvasSize = trait(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
}));
export const GlobalRenderer = trait(
  () =>
    new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    }),
);
export const GlobalScene = trait(() => new THREE.Scene());
export const GlobalCamera = trait<() => THREE.Camera>(
  () =>
    new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    ),
);
export const Mesh = trait(() => new THREE.Mesh());

const meshAddedQuery = createAdded();
const meshRemovedQuery = createRemoved();

export const meshLifecycleSystem: System = ({ game }) => {
  game.world.query(meshAddedQuery(Mesh)).forEach((entity) => {
    const mesh = entity.get(Mesh)!;
    const scene = game.world.get(GlobalScene);
    if (!scene) {
      throw new GlobalNotFoundError(GlobalScene.name, ModuleName);
    }
    mesh.userData.entity = entity;
    scene.add(mesh);
  });

  game.world.query(meshRemovedQuery(Mesh)).forEach((entity) => {
    const scene = game.world.get(GlobalScene);
    if (!scene) {
      throw new GlobalNotFoundError(GlobalScene.name, ModuleName);
    }
    scene.children
      .find((child) => child.userData.entity === entity)
      ?.removeFromParent();
  });
};

export const syncTransformToMeshSystem: System = ({ game }) => {
  game.world.query(Transform, Mesh).updateEach(([transform, mesh]) => {
    mesh.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    mesh.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
    );
    mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  });
};

export const renderSystem: System = ({ game }) => {
  const renderer = game.world.get(GlobalRenderer);
  const scene = game.world.get(GlobalScene);
  const camera = game.world.get(GlobalCamera);

  if (!renderer) {
    throw new GlobalNotFoundError(GlobalRenderer.name, ModuleName);
  }
  if (!scene) {
    throw new GlobalNotFoundError(GlobalScene.name, ModuleName);
  }
  if (!camera) {
    throw new GlobalNotFoundError(GlobalCamera.name, ModuleName);
  }

  renderer.render(scene, camera);
};

export const updateCameraSizeSystem: System = ({ game }) => {
  const canvasSize = game.world.get(CanvasSize);
  const renderer = game.world.get(GlobalRenderer);
  const camera = game.world.get(GlobalCamera);

  if (!canvasSize) {
    throw new GlobalNotFoundError(CanvasSize.name, ModuleName);
  }
  if (!renderer) {
    throw new GlobalNotFoundError(GlobalRenderer.name, ModuleName);
  }
  if (!camera) {
    throw new GlobalNotFoundError(GlobalCamera.name, ModuleName);
  }

  // check if the store canvas size is different then what it was before
  if (
    canvasSize.width !== renderer.domElement.width ||
    canvasSize.height !== renderer.domElement.height
  ) {
    game.world.set(CanvasSize, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
      camera.updateProjectionMatrix();
    }

    // renderer.setSize(renderer.domElement.width, renderer.domElement.height);
  }
};

export type GraphicsModuleOptions = {
  canvas?: HTMLElement | null,
  parent?: HTMLElement
};

export function initDefault(game: Game, options: GraphicsModuleOptions = {}) {
  const { canvas, parent } = options;

  if (canvas === null) {
    throw new Error("Canvas cannot be null! This probably means your canvas element was not found")
  }

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    canvas: canvas
  });

  if (!canvas) {
    (parent ?? document.body).appendChild(renderer.domElement);
  }
  renderer.setPixelRatio(window.devicePixelRatio)

  game.world.add(GlobalRenderer(renderer));
  game.world.add(
    CanvasSize({ width: renderer.domElement.clientWidth, height: renderer.domElement.clientHeight }),
  );
  game.world.add(GlobalScene(new THREE.Scene()));
  
  game.world.add(
    GlobalCamera(
      new THREE.PerspectiveCamera(
        75,
        renderer.domElement.clientWidth / renderer.domElement.clientHeight,
        0.1,
        1000,
      ),
    ),
  );

  game.update
    .add(meshLifecycleSystem, { tag: "preUpdate" })
    .add(syncTransformToMeshSystem, { tag: "postUpdate" })
    .add(renderSystem, { tag: "render" })
    .add(updateCameraSizeSystem, { before: "render" });
}
