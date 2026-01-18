// this probably example of coupling.Not sure if its worth
import * as Physics from "../physics";
import * as Graphics from "../graphics";

function createMeshFromCollider(collider: Physics.RAPIER.Collider, options: { color?: number } = {}) {
	const {
		color = 0xffffff
	} = options;

	switch (collider.shape.type) {
		case Physics.RAPIER.ShapeType.Ball:
			return new Graphics.THREE.Mesh(
				new Graphics.THREE.SphereGeometry((collider.shape as any).radius),
				new Graphics.THREE.MeshBasicMaterial({ color: color, wireframe: true })
			);
		case Physics.RAPIER.ShapeType.Cuboid:
			const halfExtents = (collider.shape as any).halfExtents;
			return new Graphics.THREE.Mesh(
				new Graphics.THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2),
				new Graphics.THREE.MeshBasicMaterial({ color: color, wireframe: true })
			);
		default:
			throw new Error("Collider shape type not supported for debug mesh");
	}
}

/**
 * For now, this only creates a simple wireframe mesh for the first collider of the rigidbody.
 * This is because we don't have a scene hierarchy system yet, so i can't add multiple meshes to a single object easily.
 * 
 * @param entity 
 * @returns 
 */
export function createRigidBodyDebugMesh(rigidbody: Physics.RAPIER.RigidBody, options: { color?: number } = {}) {
	const collider = rigidbody.collider(0);
	const {
		color = 0xffffff
	} = options;

	return Graphics.Mesh(createMeshFromCollider(collider, { color }));
}

export function createAreaDebugMesh(area: Physics.RAPIER.Collider, options: { color?: number } = {}) {
	const {
		color = 0xffff00
	} = options;

	return Graphics.Mesh(createMeshFromCollider(area, { color }));
}