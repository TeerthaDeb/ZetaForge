# Katana Block

This block is a basic unit for executing operations within a pipeline. It processes inputs, performs a specific task, and generates output files. In this case, the block will list the contents of a given history folder and output the results to a text file.

## Files Included

- **`README.md`**: This file provides information about the block.
- **`computations.py`**: Contains the Python code that performs the computation.
- **`Dockerfile`**: Specifies the environment setup for running the block.
- **`requirements.txt`**: Lists the Python dependencies required for the block.
- **`specs.json`**: Defines the specifications for the block, including inputs and outputs.
- **`cover-image.png`**: An optional image representing the block.

## Input and Output

- **Input**: ZIP file of an entire pipeline , KATANA as ZIP(THE PROVIDED ONE, IT IS DIFFERENT FROM KATANA BRANCH) , file(s) required for zipped pipeline.
- **Output**: A text file listing the contents of the specified history folder.

## KATANA AS A BLOCK VERSION: 0.02 (ABLE TO WORK UV MODE INSIDE DOCKER MODE)

## NEXT TASKS:
- katana.zip should not be passed.
- all inputs for the zip pipelines should be dynamic including integers, float and every single inputs.

## FOR TRYING:
choose any image for input. name can be anything right now. just make sure thats an image. xd
zip file of a simple canny-edge is given, a katana.zip is given. 