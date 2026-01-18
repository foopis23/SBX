import { trait, createAdded, createRemoved } from 'koota';
import * as THREE from 'three';
import { Game, Transform, type System } from '../core';
import { GlobalNotFoundError } from '../errors/global-not-found-error';

const ModuleName = "Graphics";

export * as THREE from 'three';

export const WindowSize = trait(() => ({
	width: window.innerWidth,
	height: window.innerHeight
}));
export const GlobalRenderer = trait(() => new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }));
export const GlobalScene = trait(() => new THREE.Scene());
export const GlobalCamera = trait<() => THREE.Camera>(() => new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
export const Mesh = trait(() => new THREE.Mesh())

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
		mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
		mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
		mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
	});
}

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
}

export const fullScreenCanvasSystem: System = ({ game }) => {
	const windowSize = game.world.get(WindowSize);
	const renderer = game.world.get(GlobalRenderer);
	const camera = game.world.get(GlobalCamera) as THREE.PerspectiveCamera | undefined;

	if (!windowSize) {
		throw new GlobalNotFoundError(WindowSize.name, ModuleName);
	}
	if (!renderer) {
		throw new GlobalNotFoundError(GlobalRenderer.name, ModuleName);
	}
	if (!camera) {
		throw new GlobalNotFoundError(GlobalCamera.name, ModuleName);
	}

	if (windowSize.width !== window.innerWidth || windowSize.height !== window.innerHeight) {
		game.world.set(WindowSize, { width: window.innerWidth, height: window.innerHeight });
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
}

export function initDefault(game: Game) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	game.world.add(GlobalRenderer(renderer));
	game.world.add(WindowSize({ width: window.innerWidth, height: window.innerHeight }));
	game.world.add(GlobalScene(new THREE.Scene()));
	game.world.add(GlobalCamera(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)));

	game.update
		.add(meshLifecycleSystem, { tag: 'preUpdate' })
		.add(syncTransformToMeshSystem, { tag: 'postUpdate' })
		.add(renderSystem, { tag: 'render' })
		.add(fullScreenCanvasSystem, { before: 'render' });
}
