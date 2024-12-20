import { useImmerAtom } from "jotai-immer";
import { trpc } from "@/utils/trpc";
import { getDirectoryPath } from "@/../utils/fileUtils";
import { workspaceAtom, pipelineFactory } from "@/atoms/pipelineAtom";
import { getWsConnection } from "@/client/anvil";
import { generateId } from "@/utils/blockUtils";

function getLastFolder(path) {
  // Remove trailing slashes
  path = path.replace(/\/+$/, "");

  // Split the path by '/'
  const parts = path.split("/");

  // Filter out empty strings
  const nonEmptyParts = parts.filter((part) => part.length > 0);

  // Return the last non-empty part, or null if there are no parts
  return nonEmptyParts.length > 0
    ? nonEmptyParts[nonEmptyParts.length - 1]
    : null;
}

export const useLoadPipeline = () => {
  const loadPipeline = async (file) => {
    console.log("***********Loading pipeline from file:", file);

    const data = JSON.parse(await new Blob([file]).text());
    const saveFolder = getDirectoryPath(file.path);

    data["sink"] = saveFolder;
    data["build"] = saveFolder;

    let name = data?.name ? data.name : getLastFolder(saveFolder);

    const loadedPipeline = {
      name: name,
      path: saveFolder,
      saveTime: Date.now(),
      data: data.pipeline,
      id: data.id,
      key: data.id + ".",
    };

    const newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );

    return newPipeline;
  };

  return loadPipeline;
};

function removeNullInputsOutputs(obj) {
  // Create an array to store keys to be removed
  const keysToRemove = [];

  // Iterate through all keys in the object
  for (const key in obj) {
    const value = obj[key];

    // Check if both inputs and outputs are null
    if (value.inputs === null && value.outputs === null) {
      keysToRemove.push(key);
    }
  }

  // Remove the identified keys from the object
  keysToRemove.forEach((key) => {
    delete obj[key];
  });

  return obj;
}

function sortSpecsKeys(pipeline) {
  const updatedPipeline = {};
  const specs = pipeline?.data ?? [];

  for (const blockId in specs) {
    const block = specs[blockId];
    const inputs = block.inputs;
    const outputs = block.outputs;

    let inputKeys = Object.keys(inputs);
    let outputKeys = Object.keys(outputs);

    if (block.views?.node?.order) {
      const order = block.views.node.order;

      if (
        order?.input?.length === inputKeys.length &&
        order?.output?.length === outputKeys.length
      ) {
        inputKeys = order.input;
        outputKeys = order.output;
      }
    }

    const sortedInputs = {};
    inputKeys.forEach((key) => {
      sortedInputs[key] = inputs[key];
    });

    const sortedOutputs = {};
    outputKeys.forEach((key) => {
      sortedOutputs[key] = outputs[key];
    });

    updatedPipeline[blockId] = {
      ...block,
      inputs: sortedInputs,
      outputs: sortedOutputs,
    };
  }

  pipeline.data = updatedPipeline;
  return pipeline;
}

export const useLoadServerPipeline = () => {
  const [workspace] = useImmerAtom(workspaceAtom);

  const loadPipeline = async (serverPipeline, configuration) => {
    if (!serverPipeline) {
      return;
    }
    const host = configuration?.anvil?.host;
    const port = configuration?.anvil?.port;
    const hostString = host + ":" + port;
    const executionId = serverPipeline.Execution;

    const localKey = serverPipeline.Uuid + ".";
    let path = `${await window.cache.local()}${serverPipeline.Uuid}`;

    // Need to check if we've loaded a local path and use it for the history
    const local = workspace.tabs[localKey];
    const serverKey = serverPipeline.Uuid + "." + executionId;
    const server = workspace.tabs[serverKey];

    if (local && local.path) {
      path = local.path;
    } else if (server && server.path) {
      path = server.path;
    }

    const serverPipelineData = JSON.parse(serverPipeline.PipelineJson);
    let data = removeNullInputsOutputs(serverPipelineData?.pipeline);
    let socketUrl = null;
    if (
      serverPipeline.Status == "Pending" ||
      serverPipeline.Status == "Running"
    ) {
      socketUrl = getWsConnection(configuration, `ws/${executionId}`);
    }
    const loadedPipeline = {
      name: serverPipelineData.name
        ? serverPipelineData.name
        : serverPipelineData.id,
      saveTime: Date.now(),
      path: path,
      data: data,
      id: serverPipeline.Uuid,
      key: serverPipeline.Uuid + "." + executionId,
      history: serverPipeline.Uuid + "/" + executionId,
      record: serverPipeline,
      host: hostString,
      socketUrl: socketUrl,
    };
    let newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );
    return sortSpecsKeys(newPipeline);
  };

  return loadPipeline;
};

export const useLoadExecution = () => {
  const [workspace] = useImmerAtom(workspaceAtom);

  const loadExecution = async (execution, configuration, prevPath = null) => {
    if (!execution) {
      return;
    }

    const host = configuration?.anvil?.host;
    const port = configuration?.anvil?.port;
    const hostString = host + ":" + port;

    let executionData = JSON.parse(execution.PipelineJson);
    if (execution.Results != "") {
      executionData = JSON.parse(execution.Results);
    }
    const executionId = execution.Execution;

    let path = `${await window.cache.local()}${executionData.id}`;

    // we check three locations for a local path
    // otherwise the local path gets lost, since it's not in the cache
    const localKey = execution.Uuid + ".";
    const local = workspace.tabs[localKey];
    const serverKey = execution.Uuid + "." + executionId;
    const server = workspace.tabs[serverKey];
    if (local && local.path) {
      path = local.path;
    } else if (server && server.path) {
      path = server.path;
    } else if (prevPath) {
      path = prevPath;
    }

    let socketUrl = null;
    if (execution.Status == "Pending" || execution.Status == "Running") {
      socketUrl = getWsConnection(configuration, `ws/${executionId}`);
    }
    let data = removeNullInputsOutputs(executionData?.pipeline);

    const loadedPipeline = {
      name: executionData.name ? executionData.name : executionData.id,
      saveTime: Date.now(),
      path: path,
      data: data,
      id: executionData.id,
      key: executionData.id + "." + executionId,
      history: executionData.id + "/" + executionId,
      record: execution,
      host: hostString,
      socketUrl: socketUrl,
      logs: execution?.Log,
    };
    let newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );
    // sort keys
    newPipeline = sortSpecsKeys(newPipeline);
    return newPipeline;
  };

  return loadExecution;
};

export const useLoadCorePipeline = () => {
  const copyPipelineMutation = trpc.copyPipeline.useMutation();

  const loadPipeline = async (specs, corePath) => {
    const newId = generateId(specs.id);
    specs.id = newId;

    const tempFile = `${await window.cache.local()}${newId}`;

    const copyData = {
      specs: specs,
      name: specs.name,
      writeFromDir: corePath,
      writeToDir: tempFile,
    };
    await copyPipelineMutation.mutateAsync(copyData);

    const loadedPipeline = {
      name: specs.name,
      saveTime: Date.now(),
      path: tempFile,
      data: specs.pipeline,
      id: newId,
      key: newId + ".",
    };

    const newPipeline = pipelineFactory(
      await window.cache.local(),
      loadedPipeline,
    );
    return newPipeline;
  };

  return loadPipeline;
};
