import { createOperations, type ProtocolOperations } from "./operations.ts";
import { FilesystemTrailStore } from "./store.ts";

export function createProtocol(options: { trailsDir: string }): ProtocolOperations {
  return createOperations({
    store: new FilesystemTrailStore({ trailsDir: options.trailsDir }),
  });
}
