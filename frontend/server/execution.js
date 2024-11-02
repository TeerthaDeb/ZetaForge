import path from "path";
import { syncS3ToLocalDirectory } from "./s3";
import { cacheJoin } from "./cache";

export async function syncExecutionResults(
  resultPath,
  pipelineUuid,
  executionUuid,
  anvilConfiguration,
) {
  console.log("ResultPath: " ,resultPath , " pipelineUUID:" ,pipelineUuid , "executionUUID:" ,executionUuid , "anvilConfig: ",anvilConfiguration)
  let s3Prefix;
  if (anvilConfiguration.anvil.token) {
    const data = atob(anvilConfiguration.anvil.token.split(".")[1]);
    const org = JSON.parse(data).sub;
    s3Prefix = `${org}/${pipelineUuid}/${executionUuid}`;
  } else {
    s3Prefix = `${pipelineUuid}/${executionUuid}`;
  }

  const localPath = path.join(resultPath, "hi", executionUuid, "files");
  console.log("localPath: " ,localPath)
  
  console.log("s3Prefix:" ,s3Prefix)
  const s3PrefixParentDirFolders = s3Prefix.split('/').slice(0, -1).join('/') + '/';
  console.log("s3PrefixParentDirFolders: " ,s3PrefixParentDirFolders)

  await syncS3ToLocalDirectory(s3PrefixParentDirFolders, localPath, anvilConfiguration);
  // TODO: Fix all of this for real
  // This is because if a user loads a pipeline from a folder, we need to keep
  // That folder as the pipeline "path" so that we can reference the blocks
  // And sync the history to the loaded folder for user reference

  // *BUT* we also need to serve the result files of runs
  // whether they are local or remote, which means we need results
  // In a retrievable location
  //
  //
  const cachePath = cacheJoin(pipelineUuid, "hi", executionUuid, "files");

  if (cachePath != localPath) {
    console.log("local path and cache path is not same. local path: " , localPath , "and cache path: " , cachePath)
    await syncS3ToLocalDirectory(s3Prefix, cachePath, anvilConfiguration);
  }
}

async function listS3Folders(bucketName, prefix) {
  const params = {
    Bucket: bucketName,
    Prefix: prefix,
    Delimiter: '/', // This will limit the response to only folders
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const folders = data.CommonPrefixes.map(item => item.Prefix);
    console.log(`Folders in ${prefix}:`, folders);
    return folders;
  } catch (error) {
    console.error('Error listing S3 folders:', error);
  }
}