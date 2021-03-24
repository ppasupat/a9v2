import argparse
import difflib
import json
import re
import sys
import traceback
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


def clean(x):
  x = re.sub(r'\s+', ' ', x).strip()
  x = re.sub(r'\.$', '', x)
  return x


def clean_authors(authors):
  # Extract last names
  authors = [' '.join(x.strip().split()[1:]) for x in authors]
  if len(authors) == 1:
    return authors[0]
  elif len(authors) == 2:
    return authors[0] + ' and ' + authors[1]
  else:
    return authors[0] + ' et al.'


def format_citation(author='?', venue='?', year='?', title='?', url='?'):
  return '({}, {} {}) [{}]({})'.format(
      author, venue, year, title, url)


################################
# DBLP


def dblp_best_match(results, title):
  scored = []
  for entry in results:
    info = entry['info']
    similarity = difflib.SequenceMatcher(
        None, title.lower(), clean(info.get('title', '')).lower()).ratio()
    is_arxiv = (info.get('venue') == 'CoRR')
    scored.append((info, similarity, is_arxiv))
  return max(scored, key=lambda x: (x[1], -x[2]))[0]


def dblp_search(title):
  api_url = ('http://dblp.dagstuhl.de/search/publ/api?format=json&q='
      + urllib.parse.quote_plus(title))
  print('Grabbing dblp information from', api_url, file=sys.stderr)
  data = json.load(urllib.request.urlopen(api_url))
  best_match = dblp_best_match(data['result']['hits']['hit'], title)
  kwargs = {}
  if 'authors' in best_match:
    authors = best_match['authors']['author']
    if not isinstance(authors, list):
      authors = [authors]
    authors = [(x['text'] if isinstance(x, dict) else x) for x in authors]
    kwargs['author'] = clean_authors(authors)
  if 'venue' in best_match:
    kwargs['venue'] = clean(best_match['venue'])
  if 'year' in best_match:
    kwargs['year'] = clean(best_match['year'])
  if 'title' in best_match:
    kwargs['title'] = clean(best_match['title'])
  if 'url' in best_match:
    kwargs['url'] = clean(best_match['url'])
  return kwargs


def dblp_fetch(dblp_url):
  if '/xml/' not in dblp_url:
    xml_url = dblp_url.replace('/rec/', '/rec/xml/')
  else:
    xml_url = dblp_url
  print('Grabbing DBLP information from', xml_url, file=sys.stderr)
  data = urllib.request.urlopen(xml_url)
  entry = ET.parse(data).getroot()[0]
  ee = entry.find('ee')
  if ee is not None:
    return ee.text
  return dblp_url
  

################################
# Arxiv

NS = {'atom': 'http://www.w3.org/2005/Atom'}

def arxiv_fetch(url):
  paper_id = url.split('/')[-1].replace('.pdf', '')
  api_url = 'http://export.arxiv.org/api/query?id_list=' + paper_id
  print('Grabbing arxiv information from', api_url, file=sys.stderr)
  data = urllib.request.urlopen(api_url)
  entry = ET.parse(data).getroot().find('atom:entry', NS)
  kwargs = {'url': url}
  year = entry.find('atom:published', NS)
  if year is not None:
    kwargs['year'] = year.text.split('-')[0]
  title = entry.find('atom:title', NS)
  if title is not None:
    kwargs['title'] = clean(title.text)
  authors = entry.findall('atom:author', NS)
  if authors is not None:
    authors = [x.find('atom:name', NS) for x in authors]
    authors = [x.text for x in authors if x is not None]
    kwargs['author'] = clean_authors(authors)
  return kwargs


################################
# Main Function

def grab_citation(url):
  if not url.startswith('http'):
    # Probably a title
    title = url
    try:
      kwargs = dblp_search(title)
      kwargs['url'] = dblp_fetch(kwargs['url'])
      return format_citation(**kwargs)
    except Exception as e:
      print('Error:', e, file=sys.stderr)
      traceback.print_exc()
    # Give up
    return format_citation(title=title)
  # Arxiv
  if (url.startswith('http://arxiv.org') or 
      url.startswith('https://arxiv.org')):
    try:
      kwargs = arxiv_fetch(url)
      # Try cross-search with DBLP
      try:
        dblp_kwargs = dblp_search(kwargs['title'])
        dblp_kwargs['url'] = url
        return format_citation(**dblp_kwargs)
      except Exception as e:
        print('Error:', e, file=sys.stderr)
        traceback.print_exc()
      return format_citation(**kwargs)
    except Exception as e:
      print('Error:', e, file=sys.stderr)
      traceback.print_exc()
  # Give up
  return format_citation(url=url)


def main():
  # Command line test
  parser = argparse.ArgumentParser()
  parser.add_argument('url')
  args = parser.parse_args()
  print(grab_citation(args.url))


if __name__ == '__main__':
  main()
