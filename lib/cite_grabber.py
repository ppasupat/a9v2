import argparse
import difflib
import json
import re
import sys
import traceback
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


TIMEOUT = 10  # timeout in seconds


def clean(x):
  x = re.sub(r'\s+', ' ', x).strip()
  x = re.sub(r'\.$', '', x)
  return x


################################
# DBLP

def dblp_search(title):
  """Returns a list of DBLP search results (as dicts)."""
  api_url = ('http://dblp.dagstuhl.de/search/publ/api?format=json&q='
      + urllib.parse.quote_plus(title))
  print('Grabbing DBLP information from', api_url, file=sys.stderr)
  data = json.load(urllib.request.urlopen(api_url, timeout=TIMEOUT))
  hits = data['result']['hits']
  candidates = []
  for entry in hits.get('hit', []):
    candidate = {}
    info = entry['info']
    if 'authors' in info:
      authors = info['authors']['author']
      if not isinstance(authors, list):
        authors = [authors]
      authors = [(x['text'] if isinstance(x, dict) else x) for x in authors]
      candidate['authors'] = authors
    else:
      candidate['authors'] = []
    candidate['venue'] = clean(info.get('venue', ''))
    if candidate['venue'] == 'CoRR':
      candidate['venue'] = 'arXiv'
    candidate['year'] = clean(info.get('year', ''))
    candidate['title'] = clean(info.get('title', ''))
    candidate['url'] = clean(info.get('ee', ''))
    candidate['similarity'] = difflib.SequenceMatcher(
        None, title.lower(), candidate['title'].lower()).ratio()
    candidate['is_arxiv'] = (candidate['venue'] == 'arXiv')
    candidates.append(candidate)
  candidates.sort(key=lambda x: (-x['similarity'], x['is_arxiv']))
  return candidates


################################
# Arxiv

NS = {'atom': 'http://www.w3.org/2005/Atom'}

def arxiv_fetch(url):
  """Returns the extracted information (as dict) of an arXiv paper."""
  paper_id = url.split('/')[-1].replace('.pdf', '')
  api_url = 'http://export.arxiv.org/api/query?id_list=' + paper_id
  print('Grabbing arxiv information from', api_url, file=sys.stderr)
  data = urllib.request.urlopen(api_url, timeout=TIMEOUT)
  entry = ET.parse(data).getroot().find('atom:entry', NS)
  candidate = {
      'authors': [],
      'venue': 'arXiv',
      'year': '',
      'title': '',
      'url': url,
      'similarity': 1.0,
      'is_arxiv': True,
  }
  year = entry.find('atom:published', NS)
  if year is not None:
    candidate['year'] = year.text.split('-')[0]
  title = entry.find('atom:title', NS)
  if title is not None:
    candidate['title'] = clean(title.text)
  authors = entry.findall('atom:author', NS)
  if authors is not None:
    authors = [x.find('atom:name', NS) for x in authors]
    authors = [x.text for x in authors if x is not None]
    candidate['authors'] = authors
  return candidate


################################
# Main Function

def grab_citations(query):
  """Returns a list of candidate matches for the given query."""
  if not query.startswith('http'):
    # Probably a title
    try:
      return dblp_search(query)
    except Exception as e:
      print('Error:', e, file=sys.stderr)
      traceback.print_exc()
    # Give up
    return []
  # Arxiv
  if (query.startswith('http://arxiv.org') or 
      query.startswith('https://arxiv.org')):
    try:
      arxiv_candidate = arxiv_fetch(query)
      # Try cross-search with DBLP
      try:
        candidates = dblp_search(arxiv_candidate['title'])
        return [arxiv_candidate] + candidates
      except Exception as e:
        print('Error:', e, file=sys.stderr)
        traceback.print_exc()
      return [arxiv_candidate]
    except Exception as e:
      print('Error:', e, file=sys.stderr)
      traceback.print_exc()
  # Give up
  return []


def main():
  # Command line test
  parser = argparse.ArgumentParser()
  parser.add_argument('query')
  args = parser.parse_args()
  print(grab_citations(args.query))


if __name__ == '__main__':
  main()
