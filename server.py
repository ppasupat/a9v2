#!/usr/bin/env python3
import argparse
import os
import sys
import traceback


BASEDIR = os.path.dirname(os.path.abspath(__file__))


def main():
  parser = argparse.ArgumentParser()
  parser.add_argument('-p', '--port', type=int, default=8089)
  args = parser.parse_args()

  from lib.app import start
  try:
    start(args.port, BASEDIR)
  except:
    traceback.print_exc()


if __name__ == '__main__':
  main()
