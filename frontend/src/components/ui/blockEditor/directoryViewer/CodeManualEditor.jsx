import { Button } from "@carbon/react";
import { EditorCodeMirror } from "./CodeMirrorComponents";
import { useContext, useState } from "react";
import { FileBufferContext } from "./DirectoryViewer";
import { ChatHistoryContext } from "./DirectoryViewer";
import { FileHandleContext } from "./DirectoryViewer";
import { useCompileComputation } from "@/hooks/useCompileSpecs";
import { pipelineAtom } from "@/atoms/pipelineAtom";
import { blockEditorIdAtom } from "@/atoms/editorAtom";
import { useAtom } from "jotai";
import { keymap } from "@codemirror/view";

const MANUAL_EDIT_PROMPT = "Manual Edit of computations.py";
export default function CodeManualEditor() {
  const [pipeline] = useAtom(pipelineAtom);
  const [blockId] = useAtom(blockEditorIdAtom);
  const fileHandle = useContext(FileHandleContext);
  const fileBuffer = useContext(FileBufferContext);
  const chatHistory = useContext(ChatHistoryContext);
  const compile = useCompileComputation();
  const [isLoading, setIsLoading] = useState(false);

  const editorKeymap = keymap.of([
    {
      key: "Mod-s",
      run: () => {
        if (!saveDisabled) {
          handleSave();
        }
      },
    },
  ]);
  const saveDisabled = isLoading || !fileBuffer.hasPendingChanges;

  const handleChange = (value) => {
    fileBuffer.update(value);
  };

  const handleSave = async () => {
    setIsLoading(true);
    await fileBuffer.save();
    if (fileHandle.isComputation) {
      await chatHistory.addPrompt(MANUAL_EDIT_PROMPT, fileBuffer.content);
      compile(pipeline.path, blockId);
    }
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <EditorCodeMirror
        code={fileBuffer.content ?? ""}
        onChange={handleChange}
        keymap={editorKeymap}
      />
      <div className="absolute right-5 top-5">
        <Button
          className="w-16"
          iconDescription="Save"
          tooltipPosition="left"
          kind="tertiary"
          size="sm"
          onClick={handleSave}
          disabled={saveDisabled}
        >
          Save
        </Button>
      </div>
    </div>
  );
}