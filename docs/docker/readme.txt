To run the dockerfile and copy the output to the current directory:

docker build -t t/rmldocker . && docker run -v /path/to/your/rmldocker/:/data t/rmldocker