import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";

import { ProtocolError, type Trail, type TrailId, validateTrail } from "./schema.ts";

export type TrailStore = {
  create(trail: Trail): Promise<void>;
  get(trailId: TrailId): Promise<Trail>;
  mutate(trailId: TrailId, mutation: (trail: Trail) => Trail): Promise<Trail>;
};

export class FilesystemTrailStore implements TrailStore {
  readonly trailsDir: string;

  constructor(options: { trailsDir: string }) {
    this.trailsDir = options.trailsDir;
  }

  async create(trail: Trail): Promise<void> {
    if (await Bun.file(this.pathFor(trail.trail_id)).exists()) {
      throw new ProtocolError("TRAIL_EXISTS", `trail already exists: ${trail.trail_id}`);
    }
    await this.writeAtomic(trail);
  }

  async get(trailId: TrailId): Promise<Trail> {
    const file = Bun.file(this.pathFor(trailId));
    if (!(await file.exists())) {
      throw new ProtocolError("TRAIL_NOT_FOUND", `trail not found: ${trailId}`);
    }
    const raw: unknown = await file.json();
    return validateTrail(raw);
  }

  async mutate(
    trailId: TrailId,
    mutation: (trail: Trail) => Trail,
  ): Promise<Trail> {
    const next = validateTrail(mutation(await this.get(trailId)));
    await this.writeAtomic(next);
    return next;
  }

  private pathFor(trailId: TrailId): string {
    return join(this.trailsDir, `${trailId}.json`);
  }

  private async writeAtomic(trail: Trail): Promise<void> {
    await mkdir(this.trailsDir, { recursive: true });
    const path = this.pathFor(trail.trail_id);
    const tempPath = `${path}.tmp`;
    await Bun.write(tempPath, `${JSON.stringify(trail, null, 2)}\n`);
    await rename(tempPath, path);
  }
}
