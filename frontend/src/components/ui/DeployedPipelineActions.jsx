import { useState } from "react";
import { ComboButton, MenuItem, Modal, CodeSnippet, Tabs, Tab } from "@carbon/react"; // Added Tabs, Tab
import { Application, TrashCan } from "@carbon/icons-react";
import { modalContentAtom } from "@/atoms/modalAtom";
import { useAtom } from "jotai";
import ClosableModal from "./modal/ClosableModal";
import { getScheme } from "@/client/anvil";

export const DeployedPipelineActions = ({
  name,
  uuid,
  hash,
  configuration,
  pipelineData,
}) => {
  const [modalContent, setModalContent] = useAtom(modalContentAtom);

  const generatePostPayload = () => {
    // Generate input structure based on the pipeline graph
    const inputs = {};
    Object.entries(pipelineData.pipeline).forEach(([nodeId, node]) => {
      if (node.inputs) {
        Object.entries(node.inputs).forEach(([inputName, input]) => {
          if (input.connections && input.connections.length > 0) {
            const connection = input.connections[0];
            const sourceNode = pipelineData.pipeline[connection.block];
            if (
              sourceNode &&
              sourceNode.action &&
              sourceNode.action.parameters
            ) {
              const param = sourceNode.action.parameters[connection.variable];
              if (param) {
                inputs[inputName] = param.value;
              }
            }
          }
        });
      }
    });

// Python code
const pythonCode = `
from zetaforge import Zetaforge

zetaforge = Zetaforge(address='${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}', token='${configuration.anvil.token}')

result = zetaforge.run('${name}:${hash.substring(0, 8)}', input=${JSON.stringify(inputs, null, 2)})
print('Pipeline execution result:', result)
`;

// JavaScript code
const jsCode = `
import Zetaforge from "zetaforge";

const zetaforge = new Zetaforge({
  address: '${getScheme(configuration.anvil.host)}://${configuration.anvil.host}:${configuration.anvil.port}',
  token: '${configuration.anvil.token}'
});

const output = await zetaforge.run('${name}:${hash.substring(0, 8)}', input=${JSON.stringify(inputs, null, 2)});
console.log(output);
`;


    // Updated modal content to include tabs for Python and JavaScript
    setModalContent({
      ...modalContent,
      content: (
        <ClosableModal
          modalHeading="POST payload"
          passiveModal={true}
          modalClass="custom-modal-size"
        >
          <Tabs>
            <Tab
              label="JavaScript"
              style={{ color: 'white', backgroundColor: '#333', marginBottom: '10px' , textAlign: 'left'}}
            >
              <CodeSnippet type="multi" feedback="Copied to clipboard">
                {jsCode}
              </CodeSnippet>
            </Tab>
            <Tab
              label="Python"
              style={{ color: 'white', backgroundColor: '#333', marginBottom: '10px' , textAlign: 'left' }}
            >
              <CodeSnippet type="multi" feedback="Copied to clipboard">
                {pythonCode}
              </CodeSnippet>
            </Tab>
          </Tabs>
        </ClosableModal>
      ),
    });
  };

  const handleUndeploy = () => {
    // Stub for undeploy action
    console.log("Undeploying pipeline:", uuid);
    // Here you would typically call an API endpoint to undeploy the pipeline
    // For now, we'll just log the action
  };

  const items = [
    {
      id: "get-payload",
      text: "Get POST Payload",
      onClick: generatePostPayload,
      icon: Application,
    },
    {
      id: "undeploy",
      text: "Undeploy",
      onClick: handleUndeploy,
      icon: TrashCan,
      isDanger: true,
    },
  ];

  return (
    <ComboButton size="sm" label="Payload" onClick={generatePostPayload}>
      <MenuItem
        label="Undeploy"
        onClick={handleUndeploy}
        renderIcon={TrashCan}
        kind="danger"
      />
    </ComboButton>
  );
};
