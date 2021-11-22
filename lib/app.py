import datetime
import glob
import json
import os
import shutil
import sys
import time

from .bottle import (
        Bottle, HTTPError,
        abort, redirect, request, response, static_file)
from .cite_grabber import grab_citations


app = Bottle()
BASEDIR = None        # Will be filled in by start()


################################
# Utils

def init_directories():
    data_dir = os.path.join(BASEDIR, 'data')
    if not os.path.isdir(data_dir):
        os.makedirs(data_dir)
        print(f'Created {data_dir}')
    export_dir = os.path.join(BASEDIR, 'a9online')
    if not os.path.isdir(export_dir):
        os.makedirs(export_dir)
        print(f'Created {export_dir}')
        # Copy the static files
        os.mkdir(os.path.join(export_dir, 'static'))
        for filename in [
                'favicon-pad.png',
                'reset.css',
                'viewer-style.css',
                'content-style.css',
                'print-style.css',
                'render-math.js',
                'spoiler.js',
        ]:
            shutil.copy(
                    os.path.join('static', filename),
                    os.path.join(export_dir, 'static', filename))


HTML_ESCAPES = {
        '&': '&amp;',
        '"': '&quot;',
        "'": "&apos;",
        '>': '&gt;',
        '<': '&lt;',
        }

def escape(text):
        return ''.join(HTML_ESCAPES.get(c,c) for c in text)


################################
# Static files

@app.get('/')
def static_slash():
    return redirect('/index.html')


@app.get('/index.html')
def static_index():
    return static_file('index.html', root=os.path.join(BASEDIR, 'static'))


@app.get('/editor.html')
def static_editor():
    return static_file('editor.html', root=os.path.join(BASEDIR, 'static'))


@app.get('/static/<p:path>')
def static_path(p):
    return static_file(p, root=os.path.join(BASEDIR, 'static'))


@app.get('/data/<p:path>')
def static_path(p):
    if p.endswith('.md'):
        return redirect('/editor.html?path=' + p)
    return static_file(p, root=os.path.join(BASEDIR, 'data'))


@app.get('/a9online/<p:path>')
def exported_path(p):
    return static_file(p, root=os.path.join(BASEDIR, 'a9online'))


################################
# Error handling

def error_handler(error):
    """Convert the error into a normal JSON response."""
    response.status = error.status_code
    return {'success': False, 'error': error.body}


################################
# Note

def validate_note_path(p, validate_extension=True):
    root = os.path.abspath(os.path.join(BASEDIR, 'data')) + os.sep
    filename = os.path.abspath(os.path.join(root, p.strip('/\\')))
    if validate_extension and not filename.endswith('.md'):
        abort(403, f'File {p} is not a markdown file.')
    if not filename.startswith(root):
        abort(403, f'File {p} is outside root directory.')
    if not os.path.exists(filename) or not os.path.isfile(filename):
        abort(404, f'File {p} does not exist.')
    return filename


def validate_export_path(p, validate_extension=True):
    root = os.path.abspath(os.path.join(BASEDIR, 'a9online')) + os.sep
    filename = os.path.abspath(os.path.join(root, p.strip('/\\')))
    if validate_extension and not filename.endswith('.html'):
        abort(403, f'File {p} is not an HTML file.')
    if not filename.startswith(root):
        abort(403, f'File {p} is outside root directory.')
    try:
        os.makedirs(os.path.dirname(filename), exist_ok=True)
    except IOError:
        abort(403, f'Unable to create directory for {p}.')
    return filename


def parse_meta(line):
    line = line.strip()
    if not line.startswith('<!--') or not line.endswith('-->'):
        raise ValueError('Malformed note metadata.')
    try:
        meta = json.loads(line[4:-3])
    except json.JSONDecodeError:
        raise ValueError('Malformed note metadata.')
    return {
            'index': meta.get('index', ''),
            'title': meta.get('title', ''),
            'timestamp': int(meta.get('timestamp', 0)),
    }


@app.get('/api/list')
def list_notes():
    notes = []
    data_dir = os.path.join(BASEDIR, 'data')
    for root, dirs, files in os.walk(data_dir):
        dirname = os.path.relpath(root, data_dir)
        for filename in files:
            if not filename.endswith('.md'):
                continue
            try:
                with open(os.path.join(root, filename)) as fin:
                    meta = parse_meta(fin.readline())
            except ValueError:
                print(f'Warning: failed to parse metadata of {root}/{filename}')
                meta = {'index': '', 'title': '', 'timestamp': 0}
            notes.append({
                'dirname': dirname,
                'filename': filename,
                'meta': meta,
            })
    notes.sort(
            key=lambda x: (
                x['dirname'],
                (x['meta']['index'] if x['meta'] else ''),
                (x['meta']['title'] if x['meta'] else ''),
                x['filename']))
    return {'notes': notes}


@app.get('/api/load')
def load_note():
    try:
        filename = validate_note_path(request.query.path)
        with open(filename) as fin:
            content = ''
            meta_line = fin.readline()
            try:
                meta = parse_meta(meta_line)
            except ValueError:
                print(f'Warning: failed to parse metadata of {filename}')
                meta = {'index': '', 'title': '', 'timestamp': 0}
                content += meta_line
            content += fin.read()
        return {'meta': meta, 'content': content}
    except HTTPError as e:
        return error_handler(e)


@app.post('/api/save')
def save_note():
    try:
        filename = validate_note_path(request.forms.path)
        meta = {
                'index': request.forms.index,
                'title': request.forms.title,
                'timestamp': int(time.time()),
        }
        content = request.forms.content
        try:
            with open(filename, 'w') as fout:
                print('<!-- {} -->'.format(json.dumps(meta)), file=fout)
                fout.write(content)
        except IOError:
            abort(500, 'Failed to write note.')
        return {'meta': meta, 'content': content}
    except HTTPError as e:
        return error_handler(e)


@app.post('/api/export')
def export_note():
    try:
        filename = validate_export_path(request.forms.path)
        template_path = os.path.join(BASEDIR, 'static', 'export-template.html')
        with open(template_path) as fin:
            formatted = fin.read().format(
                    name=escape(request.forms.title),
                    content=request.forms.content,
                    time=datetime.datetime.now().isoformat())
        try:
            with open(filename, 'w') as fout:
                fout.write(formatted)
        except IOError:
            abort(500, 'Failed to export note.')
        local_resources = json.loads(request.forms.localResources)
        for res_filename in local_resources:
            if not res_filename.startswith('@/'):
                abort(404, f'Resource file {res_filename} does not exist.')
            res_src = validate_note_path(res_filename[2:], validate_extension=False)
            res_tgt = validate_export_path(res_filename[2:], validate_extension=False)
            shutil.copy(res_src, res_tgt)
        return {'url': '/a9online/' + request.forms.path}
    except HTTPError as e:
        return error_handler(e)


################################
# Special: citation search

@app.get('/api/cite')
def search_citation():
    query = request.query.q
    citations = grab_citations(query)
    return {'candidates': citations}


################################
# Entry Point

def start(port, basedir):
    global BASEDIR
    BASEDIR = basedir
    init_directories()
    app.run(port=port)
    print('\nGood bye!')
