import { Graphics, Game, Transform } from '@repo/sbx';
import { trait } from 'koota';

const game = new Game();
Graphics.initDefault(game, {
	canvas: document.getElementById("canvas")
});

const Player = trait({
	speed: 5.0,
})

// Player Movement System
game.update.add(({ game, delta }) => {
	// query all entities that are a "player" and have a position
	game.world.query(
		Transform,
		Player
	).updateEach(([transform, player]) => {
		// poll input
		const input = { x: 0, y: 0 };
		if (game.input.isKeyPressed("KeyA")) {
			input.x -= 1
		}
		if (game.input.isKeyPressed("KeyD")) {
			input.x += 1
		}
		if (game.input.isKeyPressed("KeyW")) {
			input.y += 1
		}
		if (game.input.isKeyPressed("KeyS")) {
			input.y -= 1
		}

		// normalize input (make sure input magnitude isn't greater than 1 so player doesn't move faster diagonally)
		const magnitude = Math.sqrt(input.x ** 2 + input.y ** 2)
		if (magnitude !== 0) {
			input.x /= magnitude
			input.y /= magnitude
		}

		// apply movement (use delta time to keep movement speed consistent regardless of frames per second)
		// delta is the amount of time in seconds between frames. Its usually a small decimal. You think of this
		// the player is moving player.speed per second instead of player.speed per frame.
		transform.position.x += input.x * player.speed * delta
		transform.position.y -= input.y * player.speed * delta
	})
}, { tag: 'update' })

game.start(() => {
	// replace default camera with orthographic camera for 2D Top Down
	const renderer = game.world.get(Graphics.GlobalRenderer);
	const camera = new Graphics.AutoScalingOrthographicCamera(10, renderer?.domElement!)
	game.world.set(Graphics.GlobalCamera, camera)

	camera.position.set(0, 0, 10)
	camera.lookAt(0, 0, 0)

	//spawn "player"
	game.world.spawn(
		Transform({
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 }
		}),
		Graphics.Mesh(
			new Graphics.THREE.Mesh(
				new Graphics.THREE.BoxGeometry(1, 1, 1),
				new Graphics.THREE.MeshBasicMaterial({
					color: 0xFF0000
				})
			)
		),
		Player()
	)
});