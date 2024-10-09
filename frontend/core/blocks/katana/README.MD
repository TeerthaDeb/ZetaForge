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

- **Input**: A folder containing a saved pipeline's history folder.
- **Output**: A text file listing the contents of the specified history folder.

## Running the Block

1. Ensure all required dependencies are installed by running:
   ```
   pip install -r requirements.txt
   ```

2. Run the block using:
   ```
   python computations.py
   ```

3. The output file will be created in the history folder, listing all files and subfolders.