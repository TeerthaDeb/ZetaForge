import { workspaceAtom } from "@/atoms/pipelineAtom";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { trpc } from "@/utils/trpc";
import { useAtom } from "jotai";

export const useSyncExecutionResults = () => {
  const [workspace] = useAtom(workspaceAtom);
  const [configuration] = useAtom(activeConfigurationAtom);
  const downloadExecutionResults = trpc.downloadExecutionResults.useMutation();

  const syncExecutionResults = async (key , Merkle) => {
    const pipeline = workspace.pipelines[key];
    console.log("Merkle: " ,Merkle)
    await downloadExecutionResults.mutateAsync({
      pipelinePath: pipeline.path,
      pipelineUuid: pipeline.record.Uuid,
      executionUuid: pipeline.record.Execution,
      anvilConfiguration: configuration,
      Merkle: Merkle,
    });
  };

  return syncExecutionResults;
};
