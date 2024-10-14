import os
import zipfile
import subprocess

def compute(name_of_the_file):
    """
    Receives the names of the files and extracts the zip file.

    Inputs:
        name_of_the_file (str): The path to the zip folder.

    Outputs:
        None
    """
    if os.path.isfile(name_of_the_file) and zipfile.is_zipfile(name_of_the_file):
        # Get the directory to extract to
        extract_dir = os.path.splitext(name_of_the_file)[0]

        # Create the extraction directory if it doesn't exist
        os.makedirs(extract_dir, exist_ok=True)

        # Extract the zip file
        with zipfile.ZipFile(name_of_the_file, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        print(f"Extracted zip file to: {extract_dir}.\n Running KATANA...")
        name_of_the_pipeline = name_of_the_file.split('.')[0]
        print("name of the pipeline: " , name_of_the_pipeline)
        
        subprocess.run(["go", "run", ".", "--mode=uv", name_of_the_pipeline])
    else:
        print("No valid zip file found.")

    return{}

def test():
    print("HELLO WORLD FROM TEST")