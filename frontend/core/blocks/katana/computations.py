import os
import sys

def compute(name_of_the_file):
    # Print the name of the folder
    print(f"Folder Name: {name_of_the_file}")
    print("SYS ARGS: ", sys.argv)
    # List the contents of the folder
    if os.path.exists(name_of_the_file):
        contents = os.listdir(name_of_the_file)
        print("Contents of the folder:")
        for item in contents:
            print(item)
    else:
        print(f"The folder '{name_of_the_file}' does not exist.")

def test():
    print("HELLO WORLD FROM TEST")