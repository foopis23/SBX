import { createAdded, createChanged, trait } from "koota";
import { Graphics, Transform } from "..";
import type { Game, System } from "../core";
import { GlobalNotFoundError } from "../errors/global-not-found-error";

export class AudioBusNotFoundError extends Error {
  constructor(name: string) {
    super(
      `Bus "${name}" not found. Make sure to set the bus to "master" or create the bus through the AudioBusManager.`,
    );
  }
}

export type AudioBusOptions = { parent?: AudioBus; initialGain?: number };

export class AudioBus {
  readonly name: string;
  readonly gain: GainNode;
  readonly input: AudioNode;
  readonly output: AudioNode;

  constructor(ctx: AudioContext, name: string, options: AudioBusOptions = {}) {
    const { parent, initialGain = 1.0 } = options;

    this.name = name;

    this.gain = ctx.createGain();
    this.gain.gain.value = initialGain;

    this.input = this.gain;
    this.output = this.gain;

    if (parent) {
      this.output.connect(parent.input);
    }
  }

  setGain(value: number) {
    this.gain.gain.value = value;
  }
}

export class AudioBusManager {
  readonly ctx: AudioContext;
  readonly master: AudioBus;
  private buses = new Map<string, AudioBus>();

  constructor(listener: Graphics.THREE.AudioListener) {
    this.ctx = listener.context;
    this.master = new AudioBus(this.ctx, "master");
    this.master.output.connect(this.ctx.destination);
  }

  createBus(name: string, options: AudioBusOptions) {
    if (!options.parent) {
      options.parent = this.master;
    }

    const bus = new AudioBus(this.ctx, name, options);
    this.buses.set(name, bus);
    return bus;
  }

  getBus(name: string) {
    if (!this.buses.has(name)) {
      throw new AudioBusNotFoundError(name);
    }
    return this.buses.get(name)!;
  }
}

export function routeToBus(
  audio: Graphics.THREE.Audio | Graphics.THREE.PositionalAudio,
  bus: AudioBus,
) {
  audio.getOutput().disconnect();
  audio.getOutput().connect(bus.input);
}

export const GlobalAudioBusManager = trait<() => AudioBusManager>(() => null!);

export const AudioSource = trait<
  () => {
    audio: Graphics.THREE.Audio | Graphics.THREE.PositionalAudio;
    bus: "master" | string;
  }
>(() => ({
  audio: null!,
  bus: "master",
}));

const audioSourceAdded = createAdded();
const audioSourceChanged = createChanged();

export const audioRoutingSystem: System = ({ game }) => {
  const manager = game.world.get(GlobalAudioBusManager);
  if (!manager) {
    throw new GlobalNotFoundError(GlobalAudioBusManager.name, "Audio");
  }

  game.world.query(audioSourceChanged(AudioSource)).updateEach(([source]) => {
    routeToBus(source.audio, manager.getBus(source.bus));
  });
  game.world.query(audioSourceAdded(AudioSource)).updateEach(([source]) => {
    routeToBus(source.audio, manager.getBus(source.bus));
  });
};

export const syncTransformToPositionalAudioSystem: System = ({ game }) => {
  game.world.query(Transform, AudioSource).updateEach(([transform, source]) => {
    if (!(source.audio instanceof Graphics.THREE.PositionalAudio)) {
      return;
    }

    source.audio.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    source.audio.rotation.set(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
    );
  });
};

export function initDefault(game: Game) {
  const camera = game.world.get(Graphics.GlobalCamera);
  if (!camera) {
    throw new GlobalNotFoundError(Graphics.GlobalCamera.name, "Graphics");
  }
  const listener = new Graphics.THREE.AudioListener();
  camera.add(listener);
  game.world.add(GlobalAudioBusManager(new AudioBusManager(listener)));
  game.update.add(audioRoutingSystem, { tag: "preUpdate" });
  game.update.add(syncTransformToPositionalAudioSystem, { tag: "postUpdate" });
}
