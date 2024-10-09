import os
import sys

def compute(name_of_the_file):
    """Receives the names of the files and does what it needs.

    Args:
        name_of_the_file (str): The path to the zip folder.
    """
    if os.path.isfile(name_of_the_file):
        print(f"Received zip file: {os.path.basename(name_of_the_file)}")
    else:
        print("No valid zip file found.")

def test():
    print("HELLO WORLD FROM TEST")