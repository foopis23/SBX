export class GlobalNotFoundError extends Error {
	constructor(name: string, module?: string) {
		let msg = `${name} not found in world.`;
		if (module) {
			msg += ` Did you forget to initialize the ${module} module?`;
		}
		super(msg);
	}
}
