import { OrbitControls } from "./traits";
import { Graphics, Physics, type System } from '@repo/sbx';

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
export const debugAreaCollisionsSystem: System = ({ game }) => {
	game.world.query(Physics.Area3D, Graphics.Mesh).updateEach(([area, mesh]) => {
		if (!(mesh.material instanceof Graphics.THREE.MeshBasicMaterial)) return
		if (Object.keys(area.collisions).length > 0) {
			mesh.material.color.set(0xff0000);
		} else {
			mesh.material.color.set(0xffff00);
		}
	});
}