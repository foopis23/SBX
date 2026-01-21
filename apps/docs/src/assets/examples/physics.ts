import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Graphics, Physics, Game, Transform, PhysicsGraphics, type System } from '@repo/sbx';
import { trait } from 'koota';

console.log(Physics.RAPIER);

const game = new Game();
Graphics.initDefault(game, { canvas: document.getElementById('canvas') });
await Physics.initDefault(game);


export const OrbitControls = trait<() => ThreeOrbitControls>(() => null!)

/**
 * Tick the global orbital controls
 */
export const updateOrbitControlsSystem: System = ({ game }) => {
	const orbitControls = game.world.get(OrbitControls);
	if (!orbitControls) return;
	orbitControls.update();
}

/**
 * Jumbles all bodies with a random upward force when the user presses space
 */
export const jumpPhysicsObjectsSystem: System = ({ game }) => {
	if (game.input.isKeyJustPressed('Space')) {
		game.world.query(Physics.RigidBody3D).updateEach(([rigidbody]) => {
			if (rigidbody.bodyType() != Physics.RAPIER.RigidBodyType.Dynamic) return;

			rigidbody.applyImpulse({
				x: (Math.random() - 0.5) * 20,
				y: Math.random() * 50,
				z: (Math.random() - 0.5) * 20
			}, true);
		})
	}
}

/**
 * Changes the mesh color of an area3d when its detecting a collision 
 */
export const displayAreaCollisionDetectionSystem: System = ({ game }) => {
	game.world.query(Physics.Area3D, Graphics.Mesh).updateEach(([area, mesh]) => {
		if (!(mesh.material instanceof Graphics.THREE.MeshBasicMaterial)) return
		if (Object.keys(area.collisions).length > 0) {
			mesh.material.color.set(0xff0000);
		} else {
			mesh.material.color.set(0xffff00);
		}
	});
}

game.update.add(jumpPhysicsObjectsSystem, { tag: 'update' });
game.update.add(updateOrbitControlsSystem, { tag: 'update' });
game.fixedUpdate.add(displayAreaCollisionDetectionSystem, { tag: 'update' });

game.start(() => {
	// setup orbit controls
	const renderer = game.world.get(Graphics.GlobalRenderer)!;
	const camera = game.world.get(Graphics.GlobalCamera)!;
	const orbitControls = new ThreeOrbitControls(camera, renderer.domElement);
	game.world.add(OrbitControls(orbitControls))
	camera.position.set(0, 5, 10);
	orbitControls.update();

	// spawn floor
	spawnStaticBox({ x: 0, y: -4, z: 0 }, { x: 25, y: 1, z: 25 });

	// spawn test trigger area
	spawnTriggerBox({ x: 5, y: 0, z: 0 }, { x: 3, y: 3, z: 3 });

	// spawn boxes periodically
	setInterval(() => {
		spawnPhysicsBox(
			{ x: (Math.random() - 0.5) * 5, y: 5, z: (Math.random() - 0.5) * 5 },
			{ x: 1, y: 1, z: 1 }
		);
	}, 1000);
});

// spawn helpers
function spawnPhysicsBox(
	pos: Physics.RAPIER.Vector3,
	halfExtents: Physics.RAPIER.Vector3
) {
	return game.world.spawn(
		Transform({
			position: pos,
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 }
		}),
		Physics.createRigidBody3D(
			game,
			Physics.RAPIER.RigidBodyDesc.dynamic(),
			[Physics.RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)]
		),
		Graphics.Mesh(new Graphics.THREE.Mesh(
			new Graphics.THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
			new Graphics.THREE.MeshBasicMaterial({
				color: 0x00AA00
			})
		))
	);
}

function spawnStaticBox(
	pos: Physics.RAPIER.Vector3,
	halfExtents: Physics.RAPIER.Vector3
) {
	const groundRigidBody = Physics.createRigidBody3D(
		game,
		Physics.RAPIER.RigidBodyDesc.fixed(),
		[Physics.RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)]
	)

	return game.world.spawn(
		Transform({
			position: pos,
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 }
		}),
		groundRigidBody,
		Graphics.Mesh(new Graphics.THREE.Mesh(
			new Graphics.THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
			new Graphics.THREE.MeshBasicMaterial({
				color: 0xAAAAAA
			})
		))
	);
}

function spawnTriggerBox(
	pos: Physics.RAPIER.Vector3,
	size: Physics.RAPIER.Vector3) {
	const triggerArea = Physics.createArea3D(
		game,
		Physics.RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z).setSensor(true)
	);

	return game.world.spawn(
		Transform({
			position: pos,
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 }
		}),
		triggerArea,
		PhysicsGraphics.createAreaDebugMesh(triggerArea[1].collider, { color: 0x0000ff })
	);
}
