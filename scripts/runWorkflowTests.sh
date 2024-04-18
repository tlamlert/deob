#!/bin/env bash

clear

while getopts ":c:" option; do
  case $option in
    c)
      echo "Not clearing store"
      ;;
    *)
      echo "Clearing store..."
      rm -rf ./store/*
      ;;
  esac
done

if [ -z "$1" ]
then
  echo "No argument supplied. Please run with one of the following args: 
      endToEnd : endToEnd.test.js
      crawl    : crawl.test.js
      metadata : getBookMetadata.test.js
      urls     : getURLs.test.js
      index    : index.test.js
      util     : util.test.js
    
      -c       : don't clear store"
fi

if [ $1 == "endToEnd" ]; then
  npm test ./test/coordinator/endToEnd.test.js
elif [ $1 == "crawl" ]; then
  npm test ./test/coordinator/crawl.test.js
elif [ $1 == "metadata" ]; then
  npm test ./test/coordinator/getBookMetadata.test.js
elif [ $1 == "urls" ]; then
  npm test ./test/coordinator/getURLs.test.js
elif [ $1 == "index" ]; then
  npm test ./test/coordinator/index.test.js
elif [ $1 == "util" ]; then
  npm test ./test/coordinator/util.test.js
else
  echo "Invalid argument: $1"
fi

