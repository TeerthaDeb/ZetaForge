import { useState } from "react";
import { TextInput, Toggle } from "@carbon/react";
import { ChevronDown, ChevronUp, Information } from "@carbon/icons-react";
import { activeConfigurationAtom } from "@/atoms/anvilConfigurationsAtom";
import { useAtom } from "jotai";
import { ResourceTooltip } from "@/components/ui/Tooltip";

export const BlockResources = ({ block, setFocusAction, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [configuration] = useAtom(activeConfigurationAtom);
  const [cpu, setCpu] = useState(block.action.resources?.cpu?.request || "");
  const [gpuRequest, setGpuRequest] = useState(block.action.resources?.gpu_size?.request || "");

  const [memory, setMemory] = useState(
    block.action.resources?.memory?.request || "",
  );
  const [gpuEnabled, setGpuEnabled] = useState(
    block.action.resources?.gpu?.count > 0,
  );
  const isLocalhost = configuration?.anvil?.host == "localhost";
  let toggle = (
    <Toggle
      id={`gpu-toggle-${id}`}
      labelText="Use GPU"
      toggled={gpuEnabled}
      disabled={isLocalhost}
      onToggle={(checked) => handleResourceChange("gpu", checked)}
      className="mt-2"
    />
  );
  // if (isLocalhost) {
  //   toggle = (
  //     <ResourceTooltip
  //       content="GPU is not available on local Kubernetes, connect to Forge Cloud to use GPU."
  //       icon={Information}
  //       className="top-3"
  //     >
  //       {toggle}
  //     </ResourceTooltip>
  //   );
  // }

  const handleResourceChange = (type, value) => {
    console.log("value: " , value);
    setFocusAction((draft) => {
      if (!draft.data[id].action.resources) {
        draft.data[id].action.resources = {};
      }
      if (type === "gpu") {
        draft.data[id].action.resources.gpu = { count: value ? 1 : 0 };
      } else if (type === "GPURequest") {
        draft.data[id].action.resources["nvidia.com/gpu"] = {
          request: value,  // The number of GPUs requested
          limit: value,    // Same as request for limits
        };
        setGpuRequest(value);
        console.log("GPU Requested: ", value);
      }  else {
        draft.data[id].action.resources[type] = {
          request: value,
          limit: value,
        };
      }
    });
    if (type === "cpu") setCpu(value);
    if (type === "memory") setMemory(value);
    if (type === "gpu") setGpuEnabled(value);
    if (type === "GPURequest") setGpuRequest(value);
  };

  const iconStyles = { right: "5px" };

  return (
    <div className="cursor-pointer rounded-b-lg border-t border-solid border-[color:var(--cds-border-subtle)]">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 transition-colors"
      >
        <span>Resources</span>
        {isExpanded ? (
          <ChevronUp size={20} style={iconStyles} />
        ) : (
          <ChevronDown size={20} style={iconStyles} />
        )}
      </div>
      {isExpanded && (
        <div className="space-y-4 p-4">
          <ResourceTooltip
            content="Specify CPU units in millicores (e.g., '500m' for half a core) or whole cores (e.g., '2' for 2 cores)"
            icon={Information}
            className="top-2"
          >
            <TextInput
              id={`cpu-input-${id}`}
              labelText="CPU"
              value={cpu}
              onChange={(e) => handleResourceChange("cpu", e.target.value)}
              placeholder="e.g., 500m"
              size="sm"
              className="max-w-xs"
            />
          </ResourceTooltip>
          <ResourceTooltip
            content="Specify memory in Mi/Gi (e.g., '512Mi' for 512 megabytes, '2Gi' for 2 gigabytes)"
            icon={Information}
            className="top-2"
          >
            <TextInput
              id={`memory-input-${id}`}
              labelText="Memory"
              value={memory}
              onChange={(e) => handleResourceChange("memory", e.target.value)}
              placeholder="e.g., 512Mi"
              size="sm"
              className="max-w-xs"
            />
          </ResourceTooltip>
          {toggle}
          {gpuEnabled && ( // just to put it after gpu toggle, i put it under {toglle}.
              <div>
                <label htmlFor={`gpu-size-dropdown-${id}`} className="block text-sm font-small">
                  GPU VRam
                </label>
                <select
                  id={`gpu-size-dropdown-${id}`}
                  value={gpuRequest}
                  onChange={(e) => handleResourceChange("GPURequest", e.target.value)}
                  className="mt-1 block w-52 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="24">24 GB</option>
                  {/* <option value="36">36 GB</option> */} {/* I can add more values like this....... */}
                  <option value="48">48 GB</option>
                </select>
              </div>
            )}
            
        </div>
      )}
    </div>
  );
};
