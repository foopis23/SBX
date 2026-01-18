import * as RAPIER from '@dimforge/rapier3d';
export * as RAPIER from '@dimforge/rapier3d';
import { Transform, type Game, type System } from '../core';
import { createAdded, createRemoved, trait, type Entity } from 'koota';
import { GlobalNotFoundError } from '../errors/global-not-found-error';

const moduleName = "Physics";

//#region Traits

export const GlobalPhysicsWorld = trait<() => RAPIER.World>(() => null!);
export const GlobalEventQueue = trait<() => RAPIER.EventQueue>(() => null!);
export const RigidBody3D = trait<() => RAPIER.RigidBody>(() => null!);
export const Area3D = trait<() => {
	collider: RAPIER.Collider,
	collisions: Record<number, { otherEntity: Entity, otherCollider: RAPIER.Collider }>,
	onEnter?: (other: Entity) => void,
	onExit?: (other: Entity) => void
}>(() => null!); /** An area that acts as a sensor for collision events. */

//#region Systems
const rigidbodyRemoveQuery = createRemoved();
const rigidbodyAddedQuery = createAdded();

export function rigidbodyLifecycleSystem({ game }: { game: Game }) {
	game.world.query(rigidbodyAddedQuery(RigidBody3D)).forEach((entity) => {
		const rigidbody = entity.get(RigidBody3D)!;
		rigidbody.userData = { entity };
	})

	game.world.query(rigidbodyRemoveQuery(RigidBody3D)).forEach((entity) => {
		const physicsWorld = game.world.get(GlobalPhysicsWorld);
		if (!physicsWorld) {
			throw new GlobalNotFoundError(GlobalPhysicsWorld.name, moduleName);
		}
		//? Maybe its possible to correctly type the userData across the entire project??
		const body = physicsWorld.bodies.getAll().find(body => (body.userData as { entity: Entity }).entity === entity);
		if (!body) {
			console.warn("RigidBody not found in physics world for entity", entity);
			return
		}
		physicsWorld.removeRigidBody(body);
	});
}

export const syncTransformToRigidbodySystem: System = ({ game }) => {
	game.world.query(Transform, RigidBody3D)
		.updateEach(([transform, rigidbody]) => {
			const position = transform.position;
			const rotation = transform.rotation;
			rigidbody.setTranslation({ x: position.x, y: position.y, z: position.z }, false);
			rigidbody.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: 1 }, false);
		});
}

export const syncTransformToArea3DSystem: System = ({ game }) => {
	game.world.query(Transform, Area3D)
		.updateEach(([transform, area]) => {
			const position = transform.position;
			const rotation = transform.rotation;
			area.collider.setTranslation({ x: position.x, y: position.y, z: position.z });
			area.collider.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: 1 });
		});
}

export const syncRigidbodyToTransformSystem: System = ({ game }) => {
	game.world.query(Transform, RigidBody3D)
		.updateEach(([transform, rigidbody]) => {
			const position = rigidbody.translation();
			const rotation = rigidbody.rotation();
			transform.position.x = position.x;
			transform.position.y = position.y;
			transform.position.z = position.z;
			// Note: This is a simplification and may not represent proper Euler angles
			transform.rotation.x = rotation.x;
			transform.rotation.y = rotation.y;
			transform.rotation.z = rotation.z;
		});
}

export function physicsSystem({ game }: { game: Game }) {
	const physicsWorld = game.world.get(GlobalPhysicsWorld);
	if (!physicsWorld) {
		throw new GlobalNotFoundError(GlobalPhysicsWorld.name, moduleName);
	}

	const eventQueue = new RAPIER.EventQueue(true);
	physicsWorld.step(eventQueue);

	// this is probably an optimization here where we can just maintain a map of colliders through out the game or something like that.
	const colliderMap = new Map<number, { collider: RAPIER.Collider, entity: Entity }>();
	game.world.query(Area3D).updateEach(([area], entity) => {
		colliderMap.set(area.collider.handle, { collider: area.collider, entity });
	})

	game.world.query(RigidBody3D).updateEach(([rigidbody], entity) => {
		const length = rigidbody.numColliders();
		for (let i = 0; i < length; i++) {
			const collider = rigidbody.collider(i);
			colliderMap.set(collider.handle, { collider, entity });
		}
	})

	eventQueue.drainCollisionEvents((colliderA, colliderB, started) => {
		const a = colliderMap.get(colliderA);
		const b = colliderMap.get(colliderB);
		if (!a || !b) {
			console.warn("Collider not found in map");
			return;
		}
		if (a.entity === b.entity) {
			return;
		}
		// Check if either collider is an Area3D
		const areaA = a.entity.get(Area3D);
		const areaB = b.entity.get(Area3D);

		if (started) {
			if (areaA) {
				areaA.collisions[b.collider.handle] = { otherEntity: b.entity, otherCollider: b.collider };
				areaA?.onEnter?.(b.entity);
			}
			if (areaB) {
				areaB.collisions[a.collider.handle] = { otherEntity: a.entity, otherCollider: a.collider };
				areaB?.onEnter?.(a.entity);
			}
		} else {
			if (areaA) {
				delete areaA.collisions[b.collider.handle];
				areaA?.onExit?.(b.entity);
			}
			if (areaB) {
				delete areaB.collisions[a.collider.handle];
				areaB?.onExit?.(a.entity);
			}
		}
	})
}

// #region API

export function initDefault(game: Game, gravity = { x: 0, y: -9.81, z: 0 }) {
	const physicsWorld = new RAPIER.World(gravity);
	game.world.add(GlobalPhysicsWorld(physicsWorld));
	game.fixedUpdate
		.add(syncTransformToRigidbodySystem, { before: 'update' })
		.add(syncTransformToArea3DSystem, { before: 'update' })
		.add(physicsSystem, { tag: 'update' })
		.add(syncRigidbodyToTransformSystem, { after: 'update' });
	game.update.add(rigidbodyLifecycleSystem, { before: 'update' });
}

export function createRigidBody3D(game: Game, bodyDesc: RAPIER.RigidBodyDesc, colliders: RAPIER.ColliderDesc[] = []) {
	const physicsWorld = game.world.get(GlobalPhysicsWorld);
	if (!physicsWorld) {
		throw new Error("GlobalPhysicsWorld not found in world");
	}

	const rigidBody = physicsWorld.createRigidBody(bodyDesc);
	for (const colliderDesc of colliders) {
		physicsWorld.createCollider(colliderDesc, rigidBody);
	}

	return RigidBody3D(rigidBody);
}

export function createArea3D(game: Game, colliderDesc: RAPIER.ColliderDesc) {
	const physicsWorld = game.world.get(GlobalPhysicsWorld);
	if (!physicsWorld) {
		throw new Error("GlobalPhysicsWorld not found in world");
	}

	colliderDesc = colliderDesc.setSensor(true);
	colliderDesc.activeEvents = RAPIER.ActiveEvents.COLLISION_EVENTS;

	const collider = physicsWorld.createCollider(colliderDesc);
	return Area3D({ collider, collisions: [] });
}