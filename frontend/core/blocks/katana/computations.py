import os
import zipfile
import shutil
import subprocess

def compute(name_of_the_file: str, go_file: str, input_files = "", text_argument = "") -> dict:
    """_summary_

    Args:
        name_of_the_file (path): _description_
        go_file (path): _description_
        input_file (path): _description_

    Returns:
        dict: files written
    """
    files_in_unknown_folder = []
    # Main directory where files should be extracted
    main_dir = os.getcwd()

    # Extract the go_file zip (katana.zip)
    if os.path.isfile(go_file) and zipfile.is_zipfile(go_file):
        go_extract_dir = os.path.join(main_dir, os.path.splitext(os.path.basename(go_file))[0])

        # Create the extraction directory if it doesn't exist
        os.makedirs(go_extract_dir, exist_ok=True)

        # Extract the zip file
        try:
            with zipfile.ZipFile(go_file, 'r') as zip_ref:
                zip_ref.extractall(go_extract_dir)
        except Exception as e:
            print(f"Error extracting go file zip: {e}")
    
    # Extract the name_of_the_file (pipeline zip) inside the go_file directory (katana)
    if os.path.isfile(name_of_the_file) and zipfile.is_zipfile(name_of_the_file):
        extract_dir = os.path.join(go_extract_dir, os.path.splitext(os.path.basename(name_of_the_file))[0])

        # Create the extraction directory if it doesn't exist
        os.makedirs(extract_dir, exist_ok=True)

        # Extract the name_of_the_file into the go_file extraction directory
        try:
            with zipfile.ZipFile(name_of_the_file, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
        except Exception as e:
            print(f"Error extracting pipeline zip: {e}")

        # Running the Go file after extraction
        name_of_the_pipeline = os.path.splitext(os.path.basename(name_of_the_file))[0]
        
        moved_files = []

        try: # try to move the input files to katana directory.
            if isinstance(input_files , list):
                for file in input_files:
                    shutil.move(file, go_extract_dir)
                    print(f"Moved input file {file} to {go_extract_dir}")
                    moved_files.append(file)
                if not input_files:
                    print("No input files to move.")
            elif isinstance(input_files , str):
                shutil.move(input_files, go_extract_dir)
                print(f"Moved input file {input_files} to {go_extract_dir}")
                moved_files.append(input_files)
            else:
                print("No such file passed.")
        except Exception as e:
            print(f"Error moving input files: {e}")

        paths_str = " ".join([f'path:"{file}"' for file in moved_files])
        print("paths: " ,paths_str)

        command = f"go run . --mode=uv '{name_of_the_pipeline}' {paths_str}"

        if text_argument:
            text_args_str = text_argument.strip()
            command += f" {text_args_str}"

        try:
            print(f"Running Go command: {command}")
            subprocess.run(command, cwd=go_extract_dir, shell=True, check=True)
        except Exception as e:
            print(f"Error running Go command: {e}")

        # Navigate into the history folder and get the contents of the unknown folder
        history_dir = os.path.join(go_extract_dir, name_of_the_pipeline, "history")

        # List the subfolders inside the history directory
        try:
            unknown_folder = next(os.scandir(history_dir)).path  # Get the first folder in history
            # List files inside the unknown folder
            files_in_unknown_folder = os.listdir(unknown_folder)
            # print(f"Files in the unknown folder: {files_in_unknown_folder}")

        except Exception as e:
            print(f"Error accessing unknown folder or listing files: {e}")

    else:
        print("No valid pipeline zip file found.")

    return {"history_contents" : files_in_unknown_folder}

def test():
    print("HELLO WORLD FROM TEST")