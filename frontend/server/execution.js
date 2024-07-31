import path from "path";
import { syncS3ToLocalDirectory } from "./s3";

export async function syncExecutionResults(
  buffer,
  pipelineUuid,
  executionUuid,
  anvilConfiguration,
) {
  const s3Prefix = `${pipelineUuid}/${executionUuid}`;
  const localPath = path.join(buffer, "history", executionUuid);

  await syncS3ToLocalDirectory(s3Prefix, localPath, anvilConfiguration);
}
