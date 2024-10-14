package main

import (
	_ "embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

var mode string

//go:embed entrypoint.py
var entrypoint []byte

var TMPPATH = "C:\\Users\\Teertha\\AppData\\Roaming\\zetaforge\\.cache\\pipeline-bo5ws1l9iava\\history\\01927319-cd94-7c0f-925a-b2d400d5d755\\files\\abcd"

var historySubfolder = ""

var docker_image_name = ""

func execCommand(cmd string, dir string, id string, args Dict, historySubfolder string) error {
	var command *exec.Cmd
	var commandArgs []string

	// Build the command arguments from the args
	for key, value := range args {
		commandArgs = append(commandArgs, key+"="+value)
	}

	// Convert the paths to absolute paths
	absDir, err := filepath.Abs(dir) // this should point to the block folder where computations.py is located
	if err != nil {
		log.Fatalf("Failed to get absolute path for dir: %v", err)
	}
	// Convert Windows paths to forward slashes for Docker compatibility
	absDir = filepath.ToSlash(absDir)
	// Ensure that the historySubfolder is an absolute path
	absHistorySubfolder, err := filepath.Abs(historySubfolder)
	if err != nil {
		log.Fatalf("Failed to get absolute path for history subfolder: %v", err)
	}
	absHistorySubfolder = filepath.ToSlash(absHistorySubfolder)

	if mode == "docker" {
		// Mount the block folder to ensure Docker has access to computations.py
		command = exec.Command("docker", "run", "--rm",
			"-v", absDir+":/app", // Mount the block folder where computations.py is located
			"-v", absHistorySubfolder+":/app/history/", // Mount the history folder
			docker_image_name,              // Docker image -- hardcoded
			"python", "/app/entrypoint.py", // Execute entrypoint.py inside Docker
			id, "/app/history", mode) // Pass arguments to entrypoint.py (inside Docker paths)
	} else {
		// Local execution
		if runtime.GOOS == "windows" {
			command = exec.Command("python", dir+"\\entrypoint.py", dir, historySubfolder, mode)
		} else {
			command = exec.Command("python3", dir+"/entrypoint.py", dir, historySubfolder, mode)
		}
	}

	// Append commandArgs to the command
	command.Args = append(command.Args, commandArgs...)

	// Set environment variables
	command.Env = os.Environ()
	command.Env = append(command.Env, "_blockid_="+id)

	// Execute the command and capture output
	output, err := command.CombinedOutput()
	log.Println("Output: ", string(output))
	return err
}

type Dict map[string]string
type Execution func(args Dict) (Dict, error)

type Message struct {
	Dict Dict
	Err  error
}

type Task struct {
	Name   string
	Exec   func(args Dict) error
	MapIn  Dict
	MapOut Dict
	In     []<-chan Message
	Out    []chan<- Message
}

func (t *Task) Execute(args Dict) (Dict, error) {
	inputs := make(Dict)
	for key, value := range t.MapIn {
		inputs[value] = args[key]
	}

	outputs := make(Dict)
	err := t.Exec(inputs)
	if err != nil {
		return outputs, err
	}

	for key, value := range t.MapOut {

		data, err := os.ReadFile(filepath.Join(TMPPATH, t.Name, value) + ".txt") // wants to read from the block floder

		if err != nil {
			if mode != "docker" {
				var new_histrory_subfolder = historySubfolder[len(filepath.Base(TMPPATH)):]
				data, err = os.ReadFile(filepath.Join(TMPPATH, new_histrory_subfolder, value) + ".txt") // wants to read from the 'history' floder
			} else {
				println("From line:199. value: ", value, ", TMPPATH:", TMPPATH)
				data, err = os.ReadFile(filepath.Join(historySubfolder, value) + ".txt")
			}
		}
		// fmt.Println("## Trying to readfile for the task:", t.Name, ". And the file to read: ", data, ", error while reading: ", err)
		if err != nil {
			return outputs, err
		}

		outputs[key] = string(data)

		os.Remove(filepath.Join(TMPPATH, value) + ".txt")
	}

	return outputs, nil
}

type Param struct {
	Name  string
	Value string
	Out   []chan<- Message
}

func deployTask(pipeline *Pipeline, historySubfolder string) (Execution, func()) {
	tasks := make(map[string]*Task)
	inputs := make(map[string]*Param)
	outputs := make(map[string]<-chan Message)

	for name, block := range pipeline.Pipeline { // basically this funciton maps key value for parameters, writes entrypoint.py and stores every task in task dictionary.
		name := name
		block := block
		if block.Action.Container.Image != "" {
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				log.Println("Error from 110: ", args)
				return nil
			}}
			if block.Action.Command.Dir == "" {
				os.WriteFile(filepath.Join(TMPPATH, name, "entrypoint.py"), entrypoint, 0644)

			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
				// fmt.Println("Written from 108")
			}

			tasks[name] = &Task{Name: name, Exec: func(args Dict) error { // without that entrypoint won't run
				return execCommand(block.Action.Command.Exec, filepath.Join(TMPPATH, name), block.Information.Id, args, historySubfolder)
			}}
		} else if len(block.Action.Parameters) > 0 {
			for key, value := range block.Action.Parameters {
				inputs[name] = &Param{Name: key, Value: value.Value}
				// fmt.Println("Key", name, ", Value: ", value)
			}
			// fmt.Println("inputs:", inputs)
		} else if block.Action.Command.Exec != "" {
			if block.Action.Command.Dir == "" {
				os.WriteFile("entrypoint.py", entrypoint, 0644)
			} else {
				os.WriteFile(filepath.Join(block.Action.Command.Dir, "entrypoint.py"), entrypoint, 0644)
			}
			// fmt.Println("writing entrypoint to :", name)
			tasks[name] = &Task{Name: name, Exec: func(args Dict) error {
				return execCommand(block.Action.Command.Exec, block.Action.Command.Dir, block.Information.Id, args, historySubfolder)
			}}
		} else {
			log.Fatal("Unknown block")
		}
	}

	for name, block := range pipeline.Pipeline { // so this blocks extracts inputs and outputs for each block if they are to be executed.
		if block.Action.Container.Image != "" ||
			block.Action.Command.Exec != "" {
			task := tasks[name]
			task.MapIn = make(Dict)
			task.MapOut = make(Dict)
			for label, input := range block.Inputs { // I am assuming it takes the input parameters
				for _, connection := range input.Connections {
					pipe := make(chan Message, 1)
					task.In = append(task.In, pipe)
					task.MapIn[connection.Block+connection.Variable] = label
					if parent, ok := tasks[connection.Block]; ok {
						parent.Out = append(parent.Out, pipe)
					} else if parent, ok := inputs[connection.Block]; ok {
						parent.Out = append(parent.Out, pipe)
					} else {
						log.Fatal("Unknown connection")
					}
				}
			}
			for label, output := range block.Outputs { // I am assuming it takes the output parameters
				if len(output.Connections) == 0 {
					pipe := make(chan Message, 1)
					outputs[name] = pipe
					task.Out = append(task.Out, pipe)
				} else {
					task.MapOut[name+label] = block.Information.Id + "-" + label
				}
			}
		}
	}

	for _, task := range tasks {
		go runTask(task)
	}

	execution := func(args Dict) (Dict, error) {
		for name, input := range inputs {
			dict := make(Dict)
			dict[name+input.Name] = input.Value
			for i := 0; i < len(input.Out); i++ {
				input.Out[i] <- Message{Dict: dict}
			}
		}

		results := make(Dict)
		for _, output := range outputs {
			o := <-output
			if o.Err != nil {
				return results, o.Err
			}
			maps.Copy(results, o.Dict)
		}

		return results, nil
	}

	release := func() {
		for _, input := range inputs {
			for i := 0; i < len(input.Out); i++ {
				close(input.Out[i])
			}
		}
	}

	return execution, release
}

func runTask(task *Task) {
	args := make(Dict, len(task.In))

	for {
		var executionError error // initially (0x0 , 0x0)
		for i := 0; i < len(task.In); i++ {
			// fmt.Print("\nin run task for task: ", task.Name, "\tCurrent Task.in: ", task.In[i])
			arg, ok := <-task.In[i]
			// fmt.Println("\t>>ARG , OK: ", arg, ok)
			if !ok {
				for _, next := range task.Out {
					close(next)
				}
				return
			}
			maps.Copy(args, arg.Dict)

			if arg.Err != nil {
				// fmt.Println(">>>>>>>>>ERROR found in : ", task.Name, " , and the error is: ", arg.Err)
				executionError = arg.Err
			}
		}

		if executionError != nil {
			for _, next := range task.Out {
				next <- Message{Err: executionError}
			}

			continue
		}

		dict, err := task.Execute(args)
		// fmt.Println("Executed the task: ", task.Name)

		if err != nil {
			err = fmt.Errorf("\n\ntask %s: %w", task.Name, err)
		}

		message := Message{Dict: dict, Err: err}

		for _, next := range task.Out {
			next <- message
		}
	}
}

func main() {

	pipelineName := os.Args[2]
	pipelinePath := filepath.Join(".", pipelineName)

	data, err := os.ReadFile(filepath.Join(pipelinePath, "pipeline.json"))
	if err != nil {
		log.Fatal(err)
	}

	var pipeline Pipeline
	err = json.Unmarshal(data, &pipeline)
	if err != nil {
		log.Fatal(err)
	}

	// for DEBUG TRYY
	// if pipeline.Sink != "" {
	// 	TMPPATH = pipeline.Sink
	// }

	flag.StringVar(&mode, "mode", "uv", "Execution mode: uv, no-uv, docker")
	flag.Parse()

	if len(os.Args) < 3 {
		log.Fatal("Pipeline name or path must be provided as an argument.")
	}

	var filePaths []string // extracting files for the pipelines.
	for _, block := range pipeline.Pipeline {
		for paramName, param := range block.Action.Parameters {
			if paramName == "path" {
				filePaths = append(filePaths, param.Value) // Assuming 'Value' contains the file path
			}
		}
	}

	// fmt.Println("File Paths:", filePaths)

	if mode == "docker" {
		fmt.Println("Docker mode running")
		docker_image_name = "katana-" + pipeline.Id
		// fmt.Print("docker_image_name : ", docker_image_name)
		buildAndRunDockerImage(pipelinePath, docker_image_name, filePaths)
		return
	} else {
		fmt.Println("Running in non-docker mode")
		runLocalPipeline(pipeline, pipelinePath)
	}

}

// TRYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY

func buildAndRunDockerImage(pipelinePath string, imageName string, filepaths []string) {
	// Step 1: Check if Docker image already exists
	checkCmd := exec.Command("docker", "images", "-q", imageName)
	checkOutput, err := checkCmd.Output()
	if err != nil {
		log.Fatalf("Error checking Docker image: %v", err)
	}

	// If the image does not exist, build it
	if len(checkOutput) == 0 {
		log.Println("Docker image not found, building...")
		dockerFile := filepath.Join(pipelinePath, "Dockerfile")

		// Check if Dockerfile exists
		if _, err := os.Stat(dockerFile); os.IsNotExist(err) {
			log.Fatalf("Dockerfile not found in %s", pipelinePath)
		}

		// Build the Docker image
		buildCmd := exec.Command("docker", "build", "-t", imageName, "-f", dockerFile, pipelinePath)
		buildCmd.Stdout = os.Stdout
		buildCmd.Stderr = os.Stderr

		log.Println("Building Docker image...")
		err := buildCmd.Run()
		if err != nil {
			log.Fatalf("Error building Docker image: %v", err)
		}
	} else {
		log.Println("Using existing Docker image...")
	}

	// Convert paths to absolute paths with forward slashes
	absPipelinePath, err := filepath.Abs(pipelinePath)
	if err != nil {
		log.Fatalf("Failed to get absolute path: %v", err)
	}
	absPipelinePath = filepath.ToSlash(absPipelinePath)

	// Step 2: Prepare history folder
	historySubfolder = prepareHistoryFolder(absPipelinePath)

	// Step 3: Copy files to history folder
	copyToHistoryFolder(historySubfolder, filepaths)

	// Step 4: Run the local pipeline using the Docker environment
	runLocalPipelineInDocker(absPipelinePath, historySubfolder)
}

func copyToHistoryFolder(historySubfolder string, filePaths []string) {
	for _, srcFile := range filePaths {
		// Destination path in the history folder
		destFile := filepath.Join(historySubfolder, filepath.Base(srcFile))

		// Copy the file
		source, err := os.Open(srcFile)
		if err != nil {
			log.Fatalf("Failed to open source file: %v", err)
		}
		defer source.Close()

		destination, err := os.Create(destFile)
		if err != nil {
			log.Fatalf("Failed to create destination file: %v", err)
		}
		defer destination.Close()

		_, err = io.Copy(destination, source)
		if err != nil {
			log.Fatalf("Failed to copy file: %v", err)
		}

		log.Println("Copied file to", destFile)
	}
}

func prepareHistoryFolder(pipelinePath string) string {
	// Create the history folder path
	historyDir := filepath.Join(pipelinePath, "history")

	// Create the timestamped subfolder inside history folder
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	historySubfolder := filepath.Join(historyDir, timestamp)

	// Ensure the history subfolder exists
	err := os.MkdirAll(historySubfolder, os.ModePerm)
	if err != nil {
		log.Fatalf("Failed to create history folder: %v", err)
	}

	log.Println("Prepared history folder at", historySubfolder)

	// Return the path of the history subfolder for further use
	return historySubfolder
}

func runLocalPipelineInDocker(pipelinePath string, historySubfolder string) {
	data, err := os.ReadFile(filepath.Join(pipelinePath, "pipeline.json"))
	if err != nil {
		log.Fatal(err)
	}

	var pipeline Pipeline
	err = json.Unmarshal(data, &pipeline)
	if err != nil {
		log.Fatal(err)
	}

	if pipeline.Sink != "" {
		TMPPATH = pipeline.Sink
	}

	// Skip history subfolder creation since it is already done

	// Deploy the task and execute it
	execution, release := deployTask(&pipeline, historySubfolder)

	result, err := execution(make(Dict))
	if err != nil {
		log.Println("Error from line 282:", err)
	} else {
		log.Println("COMPLETED:", result)
	}

	release()
}

func runLocalPipeline(pipeline Pipeline, pipelinePath string) {

	// Create the history subfolder using the current timestamp
	historyDir := filepath.Join(pipelinePath, "history")
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	historySubfolder = filepath.Join(historyDir, timestamp)
	os.MkdirAll(historySubfolder, os.ModePerm)

	execution, release := deployTask(&pipeline, historySubfolder)

	result, err := execution(make(Dict))
	if err != nil {
		log.Println("Error from line 481:", err)
	} else {
		log.Println("COMPLETED:", result)
	}

	release()
}