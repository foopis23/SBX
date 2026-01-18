import { Schedule } from "directed";
import { createWorld, trait, type Entity, type World } from "koota";

export type SystemContext = {
  game: Game;
  delta: number;
};
export type System = (context: SystemContext) => void;
export type TraitListener = (entity: Entity) => void;

export const Transform = trait(() => ({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}));

export class Input {
  private keysPressed: Record<
    string,
    { pressed: boolean; justPressed: boolean; justReleased: boolean }
  > = {};

  constructor() {
    window.addEventListener("keydown", (event) => {
      if (!this.keysPressed[event.code]?.pressed) {
        this.keysPressed[event.code] = {
          pressed: true,
          justPressed: true,
          justReleased: false,
        };
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keysPressed[event.code] = {
        pressed: false,
        justPressed: false,
        justReleased: true,
      };
    });
  }

  isKeyPressed(keyCode: string): boolean {
    return this.keysPressed[keyCode]?.pressed ?? false;
  }

  isKeyJustPressed(keyCode: string): boolean {
    return this.keysPressed[keyCode]?.justPressed ?? false;
  }

  isKeyJustReleased(keyCode: string): boolean {
    return this.keysPressed[keyCode]?.justReleased ?? false;
  }

  update() {
    for (const key in this.keysPressed) {
      if (this.keysPressed[key]?.justPressed) {
        this.keysPressed[key].justPressed = false;
      }
      if (this.keysPressed[key]?.justReleased) {
        this.keysPressed[key].justReleased = false;
      }
    }
  }
}

export class Game {
  public readonly world: World;
  public readonly update: Schedule<SystemContext>;
  public readonly fixedUpdate: Schedule<SystemContext>;

  public readonly input: Input = new Input();

  private lastFrameTime = 0;
  private fixedTimeAccumulator = 0;

  constructor() {
    this.world = createWorld();
    this.update = new Schedule<SystemContext>()
      .createTag("update")
      .createTag("preUpdate", { before: "update" })
      .createTag("postUpdate", { after: "update" })
      .createTag("render", { after: "postUpdate" });
    this.fixedUpdate = new Schedule<SystemContext>()
      .createTag("update")
      .createTag("preUpdate", { before: "update" })
      .createTag("postUpdate", { after: "update" });

    this.update.add(() => this.input.update(), { tag: "postUpdate" });
  }

  protected loop() {
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Fixed Update
    this.fixedTimeAccumulator += delta;
    const fixedDelta = 1 / 60; // 60 FPS
    while (this.fixedTimeAccumulator >= fixedDelta) {
      this.fixedUpdate.run({ game: this, delta: fixedDelta });
      this.fixedTimeAccumulator -= fixedDelta;
    }

    // Update
    this.update.run({ game: this, delta });

    requestAnimationFrame(this.loop.bind(this));
  }

  start(callback?: () => void) {
    this.update.build();
    this.fixedUpdate.build();
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    if (callback) {
      callback();
    }
  }
}
