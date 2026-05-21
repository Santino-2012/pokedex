#!/usr/bin/env python3
import os
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, urlretrieve, Request

TOTAL = 1025
CONCURRENCY = 8
OUTDIR = os.path.join(os.path.dirname(__file__), 'images')
if not os.path.exists(OUTDIR):
    os.makedirs(OUTDIR)

def fetch_json(url):
    req = Request(url, headers={'User-Agent':'python-urllib/3'})
    with urlopen(req, timeout=30) as resp:
        return json.load(resp)

def download_image(url, dest):
    try:
        req = Request(url, headers={'User-Agent':'python-urllib/3'})
        urlretrieve(url, dest)
        return True
    except Exception as e:
        return False

def process(id):
    fname = os.path.join(OUTDIR, f"{id:03}.png")
    if os.path.exists(fname):
        return (id, 'skipped')
    try:
        data = fetch_json(f'https://pokeapi.co/api/v2/pokemon/{id}')
        url = None
        url = data.get('sprites', {}).get('other', {}).get('official-artwork', {}).get('front_default')
        if not url:
            url = data.get('sprites', {}).get('front_default')
        if not url:
            return (id, 'no-image')
        ok = download_image(url, fname)
        return (id, 'ok' if ok else 'failed')
    except Exception as e:
        return (id, 'error')

def main():
    print(f'Starting download of {TOTAL} images with concurrency={CONCURRENCY}')
    successes = 0
    fails = 0
    skipped = 0
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futures = {ex.submit(process, i): i for i in range(1, TOTAL+1)}
        for fut in as_completed(futures):
            id = futures[fut]
            try:
                id, status = fut.result()
            except Exception as e:
                print(f'id={id} -> exception')
                fails += 1
                continue
            if status == 'ok':
                successes += 1
            elif status == 'skipped':
                skipped += 1
            else:
                fails += 1
            print(f'id={id:03} -> {status} (done={successes} fail={fails} skip={skipped})')
    print('Finished. success=', successes, 'fail=', fails, 'skipped=', skipped)

if __name__ == '__main__':
    main()
